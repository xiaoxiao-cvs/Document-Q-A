"""
LLM 服务，用于基于 RAG 的问答。
支持 Google Gemini 和 OpenAI API。
"""
import logging
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional

from app.core.config import get_settings
from app.services.vector_store import VectorStore, get_vector_store

logger = logging.getLogger(__name__)
settings = get_settings()


# Prompt 模板
SYSTEM_PROMPT = """你是一个根据提供的文档上下文回答问题的有帮助的助手。
你的回答应该：
1. 准确且仅基于提供的上下文
2. 清晰且结构良好
3. 在相关时引用来源章节

如果上下文不包含足够的信息来回答问题，请如实说明。
不要编造上下文中没有的信息。"""

QA_PROMPT_TEMPLATE = """根据以下来自文档的上下文，请回答问题。

上下文:
{context}

问题: {question}

请根据上述上下文提供全面的回答。如果你引用了上下文的特定部分，请指明它来自哪个章节。"""


class BaseLLM(ABC):
    """LLM 实现的抽象基类。"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """
        从 LLM 生成响应。
        
        Args:
            prompt: 用户提示词。
            system_prompt: 可选的系统提示词。
            temperature: 采样温度。
            max_tokens: 生成的最大 token 数。
            
        Returns:
            生成的响应文本。
        """
        pass
    
    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        从 LLM 生成流式响应。
        
        Args:
            prompt: 用户提示词。
            system_prompt: 可选的系统提示词。
            temperature: 采样温度。
            max_tokens: 生成的最大 token 数。
            
        Yields:
            生成的文本块。
        """
        pass


class GeminiLLM(BaseLLM):
    """Google Gemini LLM 实现。"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-pro"):
        """
        初始化 Gemini LLM。
        
        Args:
            api_key: Google API 密钥。如未提供则使用设置中的值。
            model: 要使用的模型名称。
        """
        import google.generativeai as genai
        
        self.api_key = api_key or settings.google_api_key
        if not self.api_key:
            raise ValueError("需要 Google API 密钥")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
        
        logger.info(f"Gemini LLM 已初始化，模型: {model}")
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """从 Gemini 生成响应。"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        response = await self.model.generate_content_async(
            full_prompt,
            generation_config=generation_config,
        )
        
        return response.text
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """从 Gemini 生成流式响应。"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        response = await self.model.generate_content_async(
            full_prompt,
            generation_config=generation_config,
            stream=True,
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text


class OpenAILLM(BaseLLM):
    """OpenAI LLM 实现。"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo"):
        """
        初始化 OpenAI LLM。
        
        Args:
            api_key: OpenAI API 密钥。如未提供则使用设置中的值。
            model: 要使用的模型名称。
        """
        from openai import AsyncOpenAI
        
        self.api_key = api_key or settings.openai_api_key
        if not self.api_key:
            raise ValueError("需要 OpenAI API 密钥")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model_name = model
        
        logger.info(f"OpenAI LLM 已初始化，模型: {model}")
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """从 OpenAI 生成响应。"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """从 OpenAI 生成流式响应。"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        stream = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class RAGService:
    """
    检索增强生成服务。
    结合向量搜索和 LLM 进行文档问答。
    """
    
    def __init__(
        self,
        llm: Optional[BaseLLM] = None,
        vector_store: Optional[VectorStore] = None,
        n_results: int = 5,
    ):
        """
        初始化 RAG 服务。
        
        Args:
            llm: LLM 实例。如未提供则根据设置创建。
            vector_store: 向量存储实例。
            n_results: 用作上下文的搜索结果数量。
        """
        self.vector_store = vector_store or get_vector_store()
        self.n_results = n_results
        
        # 根据提供商设置初始化 LLM
        if llm:
            self.llm = llm
        elif settings.llm_provider == "google":
            self.llm = GeminiLLM()
        elif settings.llm_provider == "openai":
            self.llm = OpenAILLM()
        else:
            raise ValueError(f"不支持的 LLM 提供商: {settings.llm_provider}")
        
        logger.info("RAG 服务已初始化")
    
    def retrieve_context(
        self,
        query: str,
        document_id: str,
    ) -> tuple[str, list[dict]]:
        """
        检索查询的相关上下文。
        
        Args:
            query: 用户问题。
            document_id: 要搜索的文档。
            
        Returns:
            (格式化的上下文, 来源引用) 元组。
        """
        # 搜索相关块
        results = self.vector_store.search(
            query=query,
            document_id=document_id,
            n_results=self.n_results,
        )
        
        if not results:
            return "", []
        
        # 使用章节标记格式化上下文
        context_parts = []
        sources = []
        
        for i, result in enumerate(results, 1):
            context_parts.append(f"[章节 {i} - 第 {result['metadata'].get('page_number', 'N/A')} 页]\n{result['content']}")
            
            sources.append({
                "chunk_id": result["chunk_id"],
                "page": result["metadata"].get("page_number", 1),
                "bbox": result.get("bbox"),
                "relevance_score": result["relevance_score"],
                "content_preview": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"],
            })
        
        context = "\n\n".join(context_parts)
        return context, sources
    
    async def answer(
        self,
        question: str,
        document_id: str,
    ) -> tuple[str, list[dict]]:
        """
        回答关于文档的问题。
        
        Args:
            question: 用户问题。
            document_id: 要查询的文档。
            
        Returns:
            (答案, 来源引用) 元组。
        """
        # 检索上下文
        context, sources = self.retrieve_context(question, document_id)
        
        if not context:
            return "我在文档中找不到相关信息来回答你的问题。", []
        
        # 构建提示词
        prompt = QA_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )
        
        # 生成答案
        answer = await self.llm.generate(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=settings.llm_temperature,
            max_tokens=settings.max_tokens,
        )
        
        return answer, sources
    
    async def answer_stream(
        self,
        question: str,
        document_id: str,
    ) -> AsyncGenerator[tuple[str, Optional[list[dict]]], None]:
        """
        流式回答关于文档的问题。
        
        Args:
            question: 用户问题。
            document_id: 要查询的文档。
            
        Yields:
            (文本块, 来源) 元组。来源仅在最后一个块中提供。
        """
        # 检索上下文
        context, sources = self.retrieve_context(question, document_id)
        
        if not context:
            yield "我在文档中找不到相关信息来回答你的问题。", sources
            return
        
        # 构建提示词
        prompt = QA_PROMPT_TEMPLATE.format(
            context=context,
            question=question,
        )
        
        # 流式输出答案
        async for chunk in self.llm.generate_stream(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=settings.llm_temperature,
            max_tokens=settings.max_tokens,
        ):
            yield chunk, None
        
        # 最后输出来源
        yield "", sources


# 全局 RAG 服务实例
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """
    获取全局 RAG 服务实例。
    
    Returns:
        RAGService 实例。
    """
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
