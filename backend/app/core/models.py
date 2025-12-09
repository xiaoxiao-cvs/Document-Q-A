"""
文档问答应用的 SQLAlchemy ORM 模型。
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid() -> str:
    """为主键生成 UUID 字符串。"""
    return str(uuid.uuid4())


class Document(Base):
    """
    表示已上传的 PDF 文档的模型。
    存储文件元数据和处理状态。
    """
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)  # 字节大小
    page_count = Column(Integer, nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联关系
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, filename={self.filename}, status={self.status})>"


class DocumentChunk(Base):
    """
    表示从文档中提取的文本块的模型。
    存储文本内容及用于高亮的位置元数据。
    """
    __tablename__ = "document_chunks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)  # 块在文档中的顺序
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False)
    
    # 边界框坐标（PDF 点）
    # 格式: {"x0": float, "y0": float, "x1": float, "y1": float}
    bbox = Column(JSON, nullable=True)
    
    # 原始页面文本中的起始和结束字符位置
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    document = relationship("Document", back_populates="chunks")
    
    def __repr__(self) -> str:
        return f"<DocumentChunk(id={self.id}, page={self.page_number}, index={self.chunk_index})>"


class Conversation(Base):
    """
    表示与文档的问答对话的模型。
    """
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联关系
    document = relationship("Document", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, document_id={self.document_id})>"


class Message(Base):
    """
    表示对话中单条消息的模型。
    可以是用户问题或 AI 响应。
    """
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" 或 "assistant"
    content = Column(Text, nullable=False)
    
    # AI 响应的来源引用（带元数据的块 ID 列表）
    # 格式: [{"chunk_id": str, "page": int, "bbox": {...}, "relevance_score": float}]
    sources = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    conversation = relationship("Conversation", back_populates="messages")
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, role={self.role})>"
