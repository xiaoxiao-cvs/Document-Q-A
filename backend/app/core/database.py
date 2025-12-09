"""
SQLite 数据库配置和会话管理。
使用 SQLAlchemy 进行 ORM 操作。
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker, declarative_base

from app.core.config import get_settings

settings = get_settings()

# 创建 SQLite 引擎，设置 check_same_thread=False 以支持异步
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ORM 模型的基类
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    提供数据库会话的依赖函数。
    生成会话并确保使用后关闭。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    数据库会话的上下文管理器。
    在 FastAPI 依赖之外需要会话时使用。
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """通过创建所有表来初始化数据库。"""
    Base.metadata.create_all(bind=engine)
