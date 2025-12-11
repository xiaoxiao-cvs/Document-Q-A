"""
API v1 路由汇总模块

将所有 v1 版本的路由注册到统一的路由器中。
"""
from fastapi import APIRouter

from app.api.v1.endpoints import documents, chat

# 创建 v1 版本的主路由器
api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(documents.router)
api_router.include_router(chat.router)
