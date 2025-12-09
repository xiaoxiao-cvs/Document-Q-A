"""
API 请求/响应验证的 Pydantic 数据模式定义。
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ============== 文档数据模式 ==============

class DocumentBase(BaseModel):
    """文档数据基础模式。"""
    filename: str
    original_filename: str


class DocumentCreate(BaseModel):
    """文档上传响应模式。"""
    pass


class DocumentResponse(BaseModel):
    """文档响应模式。"""
    id: str
    filename: str
    original_filename: str
    file_size: int
    page_count: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """文件上传响应模式。"""
    file_id: str
    filename: str
    message: str
    status: str


# ============== 文本块数据模式 ==============

class BoundingBox(BaseModel):
    """用于文本高亮的边界框坐标。"""
    x0: float
    y0: float
    x1: float
    y1: float


class ChunkMetadata(BaseModel):
    """文本块元数据。"""
    chunk_id: str
    page_number: int
    bbox: Optional[BoundingBox] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None


class ChunkResponse(BaseModel):
    """文本块响应模式。"""
    id: str
    chunk_index: int
    content: str
    page_number: int
    bbox: Optional[dict] = None
    
    class Config:
        from_attributes = True


# ============== 对话数据模式 ==============

class ChatRequest(BaseModel):
    """对话请求模式。"""
    question: str = Field(..., min_length=1, max_length=2000)
    file_id: str
    conversation_id: Optional[str] = None


class SourceReference(BaseModel):
    """AI 响应中的来源引用模式。"""
    chunk_id: str
    page: int
    bbox: Optional[BoundingBox] = None
    relevance_score: float
    content_preview: str = Field(..., max_length=200)


class ChatResponse(BaseModel):
    """对话响应模式。"""
    answer: str
    sources: list[SourceReference]
    conversation_id: str


class MessageResponse(BaseModel):
    """消息响应模式。"""
    id: str
    role: str
    content: str
    sources: Optional[list[SourceReference]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== 会话数据模式 ==============

class ConversationResponse(BaseModel):
    """会话响应模式。"""
    id: str
    document_id: str
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============== 错误数据模式 ==============

class ErrorResponse(BaseModel):
    """错误响应模式。"""
    detail: str
    error_code: Optional[str] = None


# ============== 健康检查 ==============

class HealthResponse(BaseModel):
    """健康检查响应模式。"""
    status: str
    version: str
    database: str
