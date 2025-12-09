"""
聊天和问答功能的 API 路由。
处理带文档上下文的问题回答。
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.models import Conversation, Message, Document
from app.core.schemas import (
    ChatRequest,
    ChatResponse,
    SourceReference,
    ConversationResponse,
    MessageResponse,
    ErrorResponse,
    BoundingBox,
)
from app.services.llm_service import get_rag_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "",
    response_model=ChatResponse,
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
        500: {"model": ErrorResponse, "description": "LLM 错误"},
    },
)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    向文档提问。
    
    返回 AI 答案以及用于高亮的来源引用。
    
    - **question**: 要提的问题
    - **file_id**: 要查询的文档 UUID
    - **conversation_id**: 可选的会话 ID，用于继续对话
    """
    # 验证文档是否存在
    document = db.query(Document).filter(Document.id == request.file_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {request.file_id}",
        )
    
    if document.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文档未就绪。状态: {document.status}",
        )
    
    # 获取或创建会话
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id
        ).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"未找到会话: {request.conversation_id}",
            )
    else:
        conversation = Conversation(document_id=request.file_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # 保存用户消息
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.question,
    )
    db.add(user_message)
    db.commit()
    
    try:
        # 从 RAG 服务获取答案
        rag_service = get_rag_service()
        answer, sources = await rag_service.answer(
            question=request.question,
            document_id=request.file_id,
        )
        
        # 格式化来源引用
        source_refs = [
            SourceReference(
                chunk_id=src["chunk_id"],
                page=src["page"],
                bbox=BoundingBox(**src["bbox"]) if src.get("bbox") else None,
                relevance_score=src["relevance_score"],
                content_preview=src["content_preview"],
            )
            for src in sources
        ]
        
        # 保存助手消息
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            sources=[src.model_dump() for src in source_refs],
        )
        db.add(assistant_message)
        db.commit()
        
        return ChatResponse(
            answer=answer,
            sources=source_refs,
            conversation_id=conversation.id,
        )
        
    except Exception as e:
        logger.error(f"聊天失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成答案失败: {str(e)}",
        )


@router.post(
    "/stream",
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
        500: {"model": ErrorResponse, "description": "LLM 错误"},
    },
)
async def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    向文档提问，使用流式响应。
    
    返回包含答案块的 Server-Sent Events 流。
    最后一个事件包含 JSON 格式的来源引用。
    
    - **question**: 要提的问题
    - **file_id**: 要查询的文档 UUID
    - **conversation_id**: 可选的会话 ID，用于继续对话
    """
    # 验证文档是否存在
    document = db.query(Document).filter(Document.id == request.file_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {request.file_id}",
        )
    
    if document.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文档未就绪。状态: {document.status}",
        )
    
    # 获取或创建会话
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id
        ).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"未找到会话: {request.conversation_id}",
            )
    else:
        conversation = Conversation(document_id=request.file_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # 保存用户消息
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.question,
    )
    db.add(user_message)
    db.commit()
    
    async def generate():
        """生成 SSE 流。"""
        rag_service = get_rag_service()
        full_answer = ""
        final_sources = []
        
        try:
            async for chunk, sources in rag_service.answer_stream(
                question=request.question,
                document_id=request.file_id,
            ):
                if chunk:
                    full_answer += chunk
                    # 发送文本块
                    yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                
                if sources:
                    final_sources = sources
            
            # 格式化并发送来源
            source_refs = [
                {
                    "chunk_id": src["chunk_id"],
                    "page": src["page"],
                    "bbox": src.get("bbox"),
                    "relevance_score": src["relevance_score"],
                    "content_preview": src["content_preview"],
                }
                for src in final_sources
            ]
            
            yield f"data: {json.dumps({'type': 'sources', 'sources': source_refs, 'conversation_id': conversation.id})}\n\n"
            
            # 保存助手消息
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_answer,
                sources=source_refs,
            )
            db.add(assistant_message)
            db.commit()
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"流式聊天失败: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    responses={
        404: {"model": ErrorResponse, "description": "未找到会话"},
    },
)
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """
    获取包含所有消息的会话。
    
    - **conversation_id**: 会话的 UUID
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到会话: {conversation_id}",
        )
    
    return conversation


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
async def list_conversations(
    document_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    列出会话。
    
    - **document_id**: 可选的文档过滤
    - **skip**: 要跳过的数量
    - **limit**: 要返回的最大数量
    """
    query = db.query(Conversation)
    
    if document_id:
        query = query.filter(Conversation.document_id == document_id)
    
    conversations = query.order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()
    return conversations


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse, "description": "未找到会话"},
    },
)
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """
    删除会话及其所有消息。
    
    - **conversation_id**: 要删除的会话 UUID
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到会话: {conversation_id}",
        )
    
    db.delete(conversation)
    db.commit()
