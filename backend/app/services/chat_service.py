"""
聊天服务模块

处理问答对话、Prompt 组装和 LLM 调用。
"""
import json
import uuid
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import chat as chat_crud
from app.schemas.chat import ChatMessageCreate, ChatRequest, ChatResponse, SourceInfo
from app.services.vector_service import vector_service


class ChatService:
    """
    聊天服务类
    
    提供问答对话功能，整合向量检索和 LLM 调用。
    """
    
    # 系统提示词模板
    SYSTEM_PROMPT = """你是一个专业的文档问答助手。你的任务是根据提供的文档内容来回答用户的问题。

请遵循以下规则：
1. 只根据提供的文档内容回答问题，不要编造信息
2. 如果文档内容不足以回答问题，请明确告知用户
3. 回答时尽量引用文档中的原文
4. 保持回答简洁、准确、有条理
5. 如果有多个相关信息来源，请综合整理后回答

文档内容：
{context}
"""
    
    def __init__(self):
        """初始化聊天服务"""
        self._llm_client = None
    
    def generate_session_id(self) -> str:
        """
        生成新的会话ID
        
        Returns:
            str: 唯一的会话标识符
        """
        return str(uuid.uuid4())[:8]
    
    def _build_context(self, search_results: List[dict]) -> Tuple[str, List[SourceInfo]]:
        """
        根据检索结果构建上下文
        
        Args:
            search_results: 向量搜索结果
            
        Returns:
            Tuple[str, List[SourceInfo]]: (上下文文本, 来源信息列表)
        """
        if not search_results:
            return "", []
        
        context_parts = []
        sources = []
        
        for i, result in enumerate(search_results, start=1):
            content = result["content"]
            page = result.get("page", 1)
            doc_id = result.get("doc_id")
            score = result.get("score", 0)
            
            context_parts.append(f"[片段{i}，第{page}页]\n{content}")
            sources.append(SourceInfo(
                document_id=doc_id,
                document_name=None,  # 可以后续从数据库查询
                page=page,
                chunk_text=content[:200] + "..." if len(content) > 200 else content,
                similarity_score=score
            ))
        
        context = "\n\n---\n\n".join(context_parts)
        return context, sources
    
    def _build_prompt(self, context: str, question: str) -> List[dict]:
        """
        构建 LLM 对话消息
        
        Args:
            context: 检索到的文档上下文
            question: 用户问题
            
        Returns:
            List[dict]: OpenAI 格式的消息列表
        """
        system_message = self.SYSTEM_PROMPT.format(context=context) if context else (
            "你是一个文档问答助手。当前没有找到相关的文档内容，请告知用户可能需要先上传文档或调整问题。"
        )
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": question}
        ]
        
        return messages
    
    async def _call_llm(self, messages: List[dict]) -> str:
        """
        调用 LLM API 获取回答
        
        Args:
            messages: 对话消息列表
            
        Returns:
            str: LLM 生成的回答
        """
        # 这里使用 OpenAI SDK 调用 LLM
        # 如果没有配置 API Key，返回模拟回答
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_api_key_here":
            # 返回模拟回答，用于测试
            return self._generate_mock_response(messages)
        
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_API_BASE if settings.OPENAI_API_BASE else None
            )
            
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"调用 LLM 时发生错误: {str(e)}"
    
    def _generate_mock_response(self, messages: List[dict]) -> str:
        """
        生成模拟回答（用于测试或无 API Key 时）
        
        Args:
            messages: 对话消息列表
            
        Returns:
            str: 模拟的回答
        """
        # 提取用户问题
        user_question = ""
        for msg in messages:
            if msg["role"] == "user":
                user_question = msg["content"]
                break
        
        # 检查是否有上下文
        system_content = messages[0]["content"] if messages else ""
        has_context = "文档内容：" in system_content and "当前没有找到相关的文档内容" not in system_content
        
        if has_context:
            return f"[测试模式] 根据提供的文档内容，关于「{user_question}」的回答：这是一个基于文档内容的模拟回答。实际使用时请配置有效的 OPENAI_API_KEY。"
        else:
            return f"[测试模式] 抱歉，没有找到与「{user_question}」相关的文档内容。请先上传相关文档后再提问。"
    
    async def chat(
        self, 
        db: Session, 
        request: ChatRequest
    ) -> ChatResponse:
        """
        处理用户提问并返回回答
        
        Args:
            db: 数据库会话
            request: 聊天请求
            
        Returns:
            ChatResponse: 聊天响应，包含回答和来源
        """
        # 获取问题内容（兼容question和query字段）
        question = request.get_question
        if not question:
            return ChatResponse(
                answer="请提供一个问题",
                sources=[],
                session_id=request.session_id,
                query=""
            )
        
        # 确定会话ID
        session_id = request.session_id or self.generate_session_id()
        
        # 获取文档ID列表
        doc_ids = request.get_doc_ids
        
        # 1. 在向量数据库中检索相关内容
        # 如果有多个文档ID，取第一个进行检索（待优化为多文档检索）
        doc_id = doc_ids[0] if doc_ids else None
        top_k = request.top_k or settings.TOP_K_RESULTS
        
        search_results = vector_service.search(
            query=question,
            doc_id=doc_id,
            top_k=top_k
        )
        
        # 2. 构建上下文和来源信息
        context, sources = self._build_context(search_results)
        
        # 3. 构建 Prompt
        messages = self._build_prompt(context, question)
        
        # 4. 调用 LLM 获取回答
        answer = await self._call_llm(messages)
        
        # 5. 保存用户消息到数据库
        chat_crud.create_chat_message(
            db,
            ChatMessageCreate(
                session_id=session_id,
                role="user",
                content=question,
                doc_id=doc_id
            )
        )
        
        # 6. 保存 AI 回答到数据库
        chat_crud.create_chat_message(
            db,
            ChatMessageCreate(
                session_id=session_id,
                role="assistant",
                content=answer,
                doc_id=doc_id,
                sources=json.dumps([s.model_dump(by_alias=True) for s in sources], ensure_ascii=False) if sources else None
            )
        )
        
        return ChatResponse(
            answer=answer,
            sources=sources,
            session_id=session_id,
            query=question
        )


# 创建全局服务实例
chat_service = ChatService()
