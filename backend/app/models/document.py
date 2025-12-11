"""
文档模型模块

定义文档相关的数据库表结构。
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Document(Base):
    """
    文档模型
    
    存储上传的PDF文档元数据信息。
    
    Attributes:
        id: 文档唯一标识符
        filename: 原始文件名
        filepath: 文件存储路径
        file_size: 文件大小(字节)
        upload_time: 上传时间
        status: 处理状态 (pending/processing/processed/failed)
        chunk_count: 文档切片数量
        error_message: 处理失败时的错误信息
    """
    __tablename__ = "documents"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, comment="文档ID")
    filename: Mapped[str] = mapped_column(String(255), nullable=False, comment="原始文件名")
    filepath: Mapped[str] = mapped_column(String(500), nullable=False, comment="文件存储路径")
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, comment="文件大小(字节)")
    upload_time: Mapped[datetime] = mapped_column(
        DateTime, 
        default=func.now(), 
        nullable=False, 
        comment="上传时间"
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default="pending", 
        nullable=False, 
        comment="处理状态: pending/processing/processed/failed"
    )
    chunk_count: Mapped[Optional[int]] = mapped_column(
        Integer, 
        nullable=True, 
        comment="文档切片数量"
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True, 
        comment="处理失败时的错误信息"
    )
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, filename='{self.filename}', status='{self.status}')>"
