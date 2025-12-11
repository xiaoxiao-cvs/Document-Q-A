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
    page: Optional[int] = Field(None, description="文档页码")
    content: str = Field(..., description="引用的原文片段")


class ChatRequest(BaseModel):
    """
    聊天请求模式
    
    用于用户发送提问。
    """
    question: str = Field(..., min_length=1, max_length=2000, description="用户问题")
    doc_id: Optional[int] = Field(None, description="指定的文档ID，不传则在所有文档中搜索")
    session_id: Optional[str] = Field(None, description="会话ID，用于关联上下文")


class ChatResponse(BaseModel):
    """
    聊天响应模式
    
    包含AI回答和引用来源。
    """
    answer: str = Field(..., description="AI的回答内容")
    sources: List[SourceInfo] = Field(default_factory=list, description="引用来源列表")
    session_id: Optional[str] = Field(None, description="会话ID")


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
