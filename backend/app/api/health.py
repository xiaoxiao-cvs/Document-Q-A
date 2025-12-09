"""
健康检查和应用信息的 API 路由。
"""
from fastapi import APIRouter

from app.core.config import get_settings
from app.core.schemas import HealthResponse

settings = get_settings()
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    检查应用健康状态。
    
    返回 API 的基本健康信息。
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        database="sqlite",
    )


@router.get("/")
async def root():
    """
    根端点，提供 API 信息。
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }
