"""
聊天相关的 Pydantic 模式模块

定义聊天 API 请求和响应的数据结构。
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SourceInfo(BaseModel):
    """
    引用来源信息模式
    
    表示回答中引用的文档片段来源。
    """
    document_id: Optional[int] = Field(None, description="文档ID")
    document_name: Optional[str] = Field(None, description="文档名称")
    page: Optional[int] = Field(None, description="文档页码")
    content: str = Field(..., alias="chunk_text", description="引用的原文片段")
    similarity_score: Optional[float] = Field(None, description="相似度分数")
    
    class Config:
        populate_by_name = True


class ChatRequest(BaseModel):
    """
    聊天请求模式
    
    用于用户发送提问。支持 question 和 query 两种字段名称以兼容前端。
    """
    question: Optional[str] = Field(None, min_length=1, max_length=2000, description="用户问题")
    query: Optional[str] = Field(None, min_length=1, max_length=2000, description="用户问题(别名)")
    doc_id: Optional[int] = Field(None, description="指定的单个文档ID")
    doc_ids: Optional[List[int]] = Field(None, alias="document_ids", description="指定的文档ID列表")
    session_id: Optional[str] = Field(None, description="会话ID，用于关联上下文")
    top_k: Optional[int] = Field(None, description="返回的最大结果数")
    
    @property
    def get_question(self) -> str:
        """获取问题内容，优先使用question，其次使用query"""
        return self.question or self.query or ""
    
    @property
    def get_doc_ids(self) -> Optional[List[int]]:
        """获取文档ID列表"""
        if self.doc_ids:
            return self.doc_ids
        if self.doc_id:
            return [self.doc_id]
        return None
    
    class Config:
        populate_by_name = True


class TokenUsage(BaseModel):
    """
    Token 用量信息
    
    用于追踪 LLM 调用的 token 消耗。
    """
    prompt_tokens: int = Field(0, description="输入 token 数")
    completion_tokens: int = Field(0, description="输出 token 数")
    total_tokens: int = Field(0, description="总 token 数")


class ChatResponse(BaseModel):
    """
    聊天响应模式
    
    包含AI回答和引用来源。
    """
    answer: str = Field(..., description="AI的回答内容")
    sources: List[SourceInfo] = Field(default_factory=list, description="引用来源列表")
    session_id: Optional[str] = Field(None, description="会话ID")
    query: Optional[str] = Field(None, description="原始问题")
    usage: Optional[TokenUsage] = Field(None, description="Token 用量信息")


class ChatMessageBase(BaseModel):
    """聊天消息基础模式"""
    role: str = Field(..., description="消息角色: user/assistant")
    content: str = Field(..., description="消息内容")


class ChatMessageCreate(ChatMessageBase):
    """创建聊天消息的请求模式"""
    session_id: str = Field(..., description="会话标识符")
    doc_id: Optional[int] = Field(None, description="关联的文档ID")
    sources: Optional[str] = Field(None, description="引用来源JSON")


class ChatMessageResponse(ChatMessageBase):
    """
    聊天消息响应模式
    
    用于返回单条聊天记录。
    """
    id: int = Field(..., description="消息ID")
    session_id: str = Field(..., description="会话标识符")
    created_at: datetime = Field(..., description="消息创建时间")
    
    class Config:
        """Pydantic 配置"""
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """
    聊天历史响应模式
    
    用于返回某个会话的所有消息。
    """
    session_id: str = Field(..., description="会话标识符")
    messages: List[ChatMessageResponse] = Field(default_factory=list, description="消息列表")
