"""
数据库基础模块

定义 SQLAlchemy ORM 基类。
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy ORM 基类
    
    所有数据库模型都应继承此类。
    """
    pass
