"""
文档问答机器人后端主程序入口

基于 FastAPI 构建的文档问答机器人原型系统。
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    
    在应用启动时初始化数据库，关闭时进行清理。
    """
    # 启动时执行
    print(f" 正在启动 {settings.PROJECT_NAME}...")
    
    # 确保数据目录存在
    os.makedirs("./data", exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    
    # 初始化数据库
    init_db()
    print(" 数据库初始化完成")
    
    yield  # 应用运行期间
    
    # 关闭时执行
    print(" 正在关闭应用...")


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="基于云 API 的文档问答机器人原型系统后端接口",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS 跨域配置
origins = [
    "http://localhost",
    "http://localhost:3000",   # React 默认端口
    "http://localhost:5173",   # Vite 默认端口
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    全局异常处理器
    
    捕获未处理的异常并返回统一的错误响应格式。
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 500,
            "message": "服务器内部错误",
            "detail": str(exc) if settings.DEBUG else "请联系管理员"
        }
    )


# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["根路径"])
async def root():
    """
    根路径接口
    
    返回欢迎信息和 API 文档链接。
    """
    return {
        "message": f"欢迎使用 {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "redoc": "/redoc",
        "api_version": "v1",
        "api_base": settings.API_V1_STR
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """
    健康检查接口
    
    用于监控系统运行状态。
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "debug_mode": settings.DEBUG
    }


# 直接运行时启动服务器
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
