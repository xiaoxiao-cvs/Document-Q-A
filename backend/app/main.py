"""
FastAPI 应用程序入口点。
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router, root_router
from app.core.config import get_settings
from app.core.database import init_db

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用程序生命周期处理器。
    在启动时初始化资源，在关闭时清理资源。
    """
    # 启动
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    
    # 初始化数据库
    init_db()
    logger.info("数据库已初始化")
    
    # 确保目录存在
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # 关闭
    logger.info("应用程序正在关闭")


# 创建 FastAPI 应用程序
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于 RAG 的文档问答 API，支持 PDF 和精确高亮定位",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请适当配置
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(root_router)
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
