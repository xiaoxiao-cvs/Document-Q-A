"""
CRUD 操作模块

导出所有 CRUD 操作函数。
"""
from app.crud.document import (
    create_document,
    get_document,
    get_documents,
    update_document,
    delete_document,
    get_latest_document,
    get_processed_documents,
)
from app.crud.chat import (
    create_chat_message,
    get_chat_message,
    get_messages_by_session,
    delete_messages_by_session,
    get_recent_messages,
)

__all__ = [
    # 文档相关
    "create_document",
    "get_document",
    "get_documents",
    "update_document",
    "delete_document",
    "get_latest_document",
    "get_processed_documents",
    # 聊天相关
    "create_chat_message",
    "get_chat_message",
    "get_messages_by_session",
    "delete_messages_by_session",
    "get_recent_messages",
]
