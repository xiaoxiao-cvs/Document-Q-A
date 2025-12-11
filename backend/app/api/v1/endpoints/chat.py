"""
问答对话 API 端点模块

提供聊天问答接口。
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import chat as chat_crud
from app.db.session import get_db
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chat_service import chat_service

# 创建路由器
router = APIRouter(prefix="/chat", tags=["问答对话"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="发送提问",
    description="向系统发送问题，获取基于文档的回答"
)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
) -> ChatResponse:
    """
    发送提问并获取回答
    
    - **question**: 用户的问题（必填）
    - **doc_id**: 指定在哪个文档中搜索（可选，不传则搜索所有文档）
    - **session_id**: 会话 ID（可选，用于关联对话上下文）
    
    系统会自动：
    1. 在向量数据库中检索相关文档片段
    2. 将检索结果作为上下文，调用 LLM 生成回答
    3. 返回回答及引用来源
    """
    try:
        response = await chat_service.chat(db, request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理问题时发生错误: {str(e)}"
        )


@router.get(
    "/history/{session_id}",
    response_model=ChatHistoryResponse,
    summary="获取聊天历史",
    description="获取指定会话的聊天记录"
)
async def get_chat_history(
    session_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> ChatHistoryResponse:
    """
    获取聊天历史
    
    - **session_id**: 会话 ID
    - **limit**: 返回的最大消息数
    
    返回该会话的所有对话记录，按时间正序排列。
    """
    messages = chat_crud.get_messages_by_session(db, session_id, limit=limit)
    
    return ChatHistoryResponse(
        session_id=session_id,
        messages=[
            ChatMessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                session_id=msg.session_id,
                created_at=msg.created_at
            )
            for msg in messages
        ]
    )


@router.delete(
    "/history/{session_id}",
    summary="清除聊天历史",
    description="删除指定会话的所有聊天记录"
)
async def delete_chat_history(
    session_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """
    清除聊天历史
    
    - **session_id**: 会话 ID
    
    删除该会话的所有对话记录。
    """
    deleted_count = chat_crud.delete_messages_by_session(db, session_id)
    
    return {
        "message": f"成功删除 {deleted_count} 条消息",
        "session_id": session_id,
        "deleted_count": deleted_count
    }


@router.get(
    "/new-session",
    summary="创建新会话",
    description="生成一个新的会话 ID"
)
async def create_new_session() -> dict:
    """
    创建新会话
    
    生成一个唯一的会话 ID，用于开始新的对话。
    """
    session_id = chat_service.generate_session_id()
    return {
        "session_id": session_id,
        "message": "新会话已创建"
    }
