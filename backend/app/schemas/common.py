"""
通用响应模式模块

定义统一的 API 响应格式。
"""
from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

# 泛型类型变量，用于通用响应数据
T = TypeVar("T")


class ResponseBase(BaseModel, Generic[T]):
    """
    统一响应基础模式
    
    所有 API 响应的基础结构。
    
    Attributes:
        code: 响应状态码
        message: 响应消息
        data: 响应数据
    """
    code: int = Field(default=200, description="响应状态码")
    message: str = Field(default="success", description="响应消息")
    data: Optional[T] = Field(default=None, description="响应数据")


class ErrorResponse(BaseModel):
    """
    错误响应模式
    
    用于返回错误信息。
    """
    code: int = Field(..., description="错误状态码")
    message: str = Field(..., description="错误消息")
    detail: Optional[Any] = Field(None, description="详细错误信息")
