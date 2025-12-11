"""
Pydantic 模式模块

导出所有 Pydantic 模式类。
"""
from app.schemas.document import (
    DocumentBase,
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListItem,
    DocumentDeleteResponse,
    UploadResponse,
)
from app.schemas.chat import (
    SourceInfo,
    ChatRequest,
    ChatResponse,
    ChatMessageBase,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.schemas.common import ResponseBase, ErrorResponse

__all__ = [
    # 文档相关
    "DocumentBase",
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListItem",
    "DocumentDeleteResponse",
    "UploadResponse",
    # 聊天相关
    "SourceInfo",
    "ChatRequest",
    "ChatResponse",
    "ChatMessageBase",
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ChatHistoryResponse",
    # 通用
    "ResponseBase",
    "ErrorResponse",
]
