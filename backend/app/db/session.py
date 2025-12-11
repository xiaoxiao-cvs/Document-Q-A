"""
数据库会话模块

管理数据库连接和会话。
"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base

# 创建数据库引擎
# SQLite 需要特殊配置 check_same_thread=False 以支持多线程访问
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG  # 调试模式下打印 SQL 语句
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """
    初始化数据库
    
    创建所有表结构。在应用启动时调用。
    """
    # 导入所有模型以确保它们被注册到 Base.metadata
    from app.models import document, chat  # noqa: F401
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话的依赖注入函数
    
    用于 FastAPI 的 Depends 依赖注入。
    
    Yields:
        Session: 数据库会话对象
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
