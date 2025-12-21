"""
聊天服务模块

处理问答对话、Prompt 组装和 LLM 调用。
"""
import json
import uuid
from typing import AsyncGenerator, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import chat as chat_crud
from app.schemas.chat import ChatMessageCreate, ChatRequest, ChatResponse, SourceInfo, TokenUsage
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
    
    async def _call_llm(self, messages: List[dict]) -> Tuple[str, Optional[TokenUsage]]:
        """
        调用 LLM API 获取回答
        
        Args:
            messages: 对话消息列表
            
        Returns:
            Tuple[str, Optional[TokenUsage]]: (回答内容, Token用量)
        """
        # 这里使用 OpenAI SDK 调用 LLM
        # 如果没有配置 API Key，返回模拟回答
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_api_key_here":
            # 返回模拟回答，用于测试
            mock_response = self._generate_mock_response(messages)
            # 模拟 token 用量（粗略估算）
            mock_usage = TokenUsage(
                prompt_tokens=len(str(messages)) // 4,
                completion_tokens=len(mock_response) // 4,
                total_tokens=(len(str(messages)) + len(mock_response)) // 4
            )
            return mock_response, mock_usage
        
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
            
            # 提取 token 用量
            usage = None
            if response.usage:
                usage = TokenUsage(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    total_tokens=response.usage.total_tokens
                )
            
            return response.choices[0].message.content, usage
            
        except Exception as e:
            return f"调用 LLM 时发生错误: {str(e)}", None
    
    async def _call_llm_stream(self, messages: List[dict]) -> AsyncGenerator[Tuple[str, Optional[Dict]], None]:
        """
        流式调用 LLM API 获取回答
        
        Args:
            messages: 对话消息列表
            
        Yields:
            Tuple[str, Optional[Dict]]: (回答片段, Token用量) - usage 只在最后一次 yield 中有值
        """
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_api_key_here":
            # 返回模拟回答，用于测试
            mock_response = self._generate_mock_response(messages)
            for char in mock_response:
                yield char, None
            # 最后 yield 模拟的 token 用量
            mock_usage = {
                "prompt_tokens": len(str(messages)) // 4,
                "completion_tokens": len(mock_response) // 4,
                "total_tokens": (len(str(messages)) + len(mock_response)) // 4
            }
            yield "", mock_usage
            return
        
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_API_BASE if settings.OPENAI_API_BASE else None
            )
            
            stream = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True,
                stream_options={"include_usage": True}
            )
            
            async for chunk in stream:
                # 内容片段
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content, None
                
                # 最后一个 chunk 包含 usage
                if hasattr(chunk, 'usage') and chunk.usage:
                    usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens
                    }
                    yield "", usage
                    
        except Exception as e:
            yield f"调用 LLM 时发生错误: {str(e)}", None
    
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
        处理用户提问并返回回答 (RAG 核心流程)
        
        流程说明:
        1. 接收用户问题
        2. 在向量数据库中检索相关文档片段 (Retrieve)
        3. 将检索到的片段组装成 Prompt 上下文 (Augment)
        4. 调用 LLM 生成回答 (Generate)
        5. 保存对话记录
        
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
        
        # --- 步骤 1: 检索 (Retrieve) ---
        # 在向量数据库中检索相关内容
        # 如果有多个文档ID，取第一个进行检索（待优化为多文档检索）
        doc_id = doc_ids[0] if doc_ids else None
        top_k = request.top_k or settings.TOP_K_RESULTS
        
        search_results = vector_service.search(
            query=question,
            doc_id=doc_id,
            top_k=top_k
        )
        
        # --- 步骤 2: 增强 (Augment) ---
        # 构建上下文和来源信息
        # 将检索到的零散片段整理成 LLM 能读懂的上下文文本
        context, sources = self._build_context(search_results)
        
        # 构建 Prompt
        # 组合系统提示词、上下文和用户问题
        messages = self._build_prompt(context, question)
        
        # --- 步骤 3: 生成 (Generate) ---
        # 调用 LLM 获取回答
        answer, usage = await self._call_llm(messages)
        
        # --- 步骤 4: 记录 ---
        # 保存用户消息到数据库
        chat_crud.create_chat_message(
            db,
            ChatMessageCreate(
                session_id=session_id,
                role="user",
                content=question,
                doc_id=doc_id
            )
        )
        
        # 保存 AI 回答到数据库
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
            query=question,
            usage=usage
        )
    
    async def chat_stream(
        self, 
        db: Session, 
        request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        """
        流式处理用户提问并返回回答 (RAG 核心流程)
        
        Args:
            db: 数据库会话
            request: 聊天请求
            
        Yields:
            str: SSE 格式的响应数据
        """
        # 获取问题内容
        question = request.get_question
        if not question:
            yield f"data: {json.dumps({'type': 'error', 'message': '请提供一个问题'}, ensure_ascii=False)}\n\n"
            return
        
        # 确定会话ID
        session_id = request.session_id or self.generate_session_id()
        
        # 获取文档ID列表
        doc_ids = request.get_doc_ids
        doc_id = doc_ids[0] if doc_ids else None
        top_k = request.top_k or settings.TOP_K_RESULTS
        
        # --- 步骤 1: 检索 (Retrieve) ---
        search_results = vector_service.search(
            query=question,
            doc_id=doc_id,
            top_k=top_k
        )
        
        # --- 步骤 2: 增强 (Augment) ---
        context, sources = self._build_context(search_results)
        messages = self._build_prompt(context, question)
        
        # 发送来源信息
        sources_data = [s.model_dump(by_alias=True) for s in sources]
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources_data, 'session_id': session_id}, ensure_ascii=False)}\n\n"
        
        # --- 步骤 3: 流式生成 (Generate) ---
        full_answer = ""
        final_usage = None
        async for chunk, usage in self._call_llm_stream(messages):
            if chunk:
                full_answer += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
            if usage:
                final_usage = usage
        
        # --- 步骤 4: 记录 ---
        # 保存用户消息到数据库
        chat_crud.create_chat_message(
            db,
            ChatMessageCreate(
                session_id=session_id,
                role="user",
                content=question,
                doc_id=doc_id
            )
        )
        
        # 保存 AI 回答到数据库
        chat_crud.create_chat_message(
            db,
            ChatMessageCreate(
                session_id=session_id,
                role="assistant",
                content=full_answer,
                doc_id=doc_id,
                sources=json.dumps(sources_data, ensure_ascii=False) if sources else None
            )
        )
        
        # 发送完成标记（包含 token 用量）
        done_data = {'type': 'done'}
        if final_usage:
            done_data['usage'] = final_usage
        yield f"data: {json.dumps(done_data, ensure_ascii=False)}\n\n"


# 创建全局服务实例
chat_service = ChatService()
