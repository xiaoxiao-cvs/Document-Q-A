"""
数据库模型模块

导出所有数据库模型类。
"""
from app.models.document import Document
from app.models.chat import ChatMessage

__all__ = ["Document", "ChatMessage"]
