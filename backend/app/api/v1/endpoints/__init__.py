"""
API v1 端点模块

导出所有端点路由。
"""
from app.api.v1.endpoints import documents, chat

__all__ = ["documents", "chat"]
