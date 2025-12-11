"""
聊天记录模型模块

定义聊天相关的数据库表结构。
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatMessage(Base):
    """
    聊天消息模型
    
    存储用户提问和AI回答的对话记录。
    
    Attributes:
        id: 消息唯一标识符
        session_id: 会话标识符，用于关联同一对话的消息
        role: 消息角色 (user/assistant)
        content: 消息内容
        doc_id: 关联的文档ID（可选）
        sources: 引用来源的JSON字符串
        created_at: 消息创建时间
    """
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, comment="消息ID")
    session_id: Mapped[str] = mapped_column(
        String(50), 
        nullable=False, 
        index=True, 
        comment="会话标识符"
    )
    role: Mapped[str] = mapped_column(
        String(20), 
        nullable=False, 
        comment="消息角色: user/assistant"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")
    doc_id: Mapped[Optional[int]] = mapped_column(
        Integer, 
        ForeignKey("documents.id", ondelete="SET NULL"), 
        nullable=True, 
        comment="关联的文档ID"
    )
    sources: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True, 
        comment="引用来源JSON"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=func.now(), 
        nullable=False, 
        comment="消息创建时间"
    )
    
    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, role='{self.role}', session='{self.session_id}')>"
