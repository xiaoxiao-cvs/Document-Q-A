"""
文档相关的 Pydantic 模式模块

定义文档 API 请求和响应的数据结构。
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    """文档基础模式"""
    filename: str = Field(..., description="文件名")


class DocumentCreate(DocumentBase):
    """创建文档的请求模式（内部使用）"""
    filepath: str = Field(..., description="文件存储路径")
    file_size: int = Field(..., description="文件大小(字节)")


class DocumentUpdate(BaseModel):
    """更新文档的请求模式"""
    status: Optional[str] = Field(None, description="处理状态")
    chunk_count: Optional[int] = Field(None, description="文档切片数量")
    error_message: Optional[str] = Field(None, description="错误信息")


class DocumentResponse(BaseModel):
    """
    文档响应模式
    
    用于返回单个文档信息。
    """
    id: int = Field(..., description="文档ID")
    filename: str = Field(..., description="原始文件名")
    upload_time: datetime = Field(..., description="上传时间")
    status: str = Field(..., description="处理状态: pending/processing/processed/failed")
    message: Optional[str] = Field(None, description="操作消息")
    
    class Config:
        """Pydantic 配置"""
        from_attributes = True  # 支持从 ORM 对象转换


class DocumentListItem(BaseModel):
    """
    文档列表项模式
    
    用于返回文档列表中的单个项目。
    """
    id: int = Field(..., description="文档ID")
    filename: str = Field(..., description="原始文件名")
    upload_time: datetime = Field(..., description="上传时间")
    status: str = Field(..., description="处理状态")
    
    class Config:
        """Pydantic 配置"""
        from_attributes = True


class DocumentDeleteResponse(BaseModel):
    """删除文档的响应模式"""
    message: str = Field(..., description="操作结果消息")


class UploadResponse(BaseModel):
    """
    文件上传响应模式
    
    符合后端开发文档中定义的响应格式。
    """
    id: int = Field(..., description="文档ID")
    filename: str = Field(..., description="原始文件名")
    upload_time: datetime = Field(..., description="上传时间")
    status: str = Field(..., description="处理状态")
    message: str = Field(..., description="操作结果消息")
    
    class Config:
        """Pydantic 配置"""
        from_attributes = True
