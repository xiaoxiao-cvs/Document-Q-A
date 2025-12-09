"""
API 路由模块。
聚合所有 API 路由。
"""
from fastapi import APIRouter

from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router

# 创建主 API 路由器
api_router = APIRouter(prefix="/api")

# 包含子路由器
api_router.include_router(documents_router)
api_router.include_router(chat_router)

# 健康检查路由在根级别（无 /api 前缀）
root_router = health_router
