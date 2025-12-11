"""
聊天记录 CRUD 操作模块

封装聊天消息相关的数据库增删改查操作。
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageCreate


def create_chat_message(db: Session, message_data: ChatMessageCreate) -> ChatMessage:
    """
    创建新的聊天消息记录
    
    Args:
        db: 数据库会话
        message_data: 消息创建数据
        
    Returns:
        ChatMessage: 创建的消息对象
    """
    db_message = ChatMessage(
        session_id=message_data.session_id,
        role=message_data.role,
        content=message_data.content,
        doc_id=message_data.doc_id,
        sources=message_data.sources
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_chat_message(db: Session, message_id: int) -> Optional[ChatMessage]:
    """
    根据ID获取聊天消息
    
    Args:
        db: 数据库会话
        message_id: 消息ID
        
    Returns:
        Optional[ChatMessage]: 消息对象，不存在则返回 None
    """
    return db.query(ChatMessage).filter(ChatMessage.id == message_id).first()


def get_messages_by_session(
    db: Session, 
    session_id: str,
    limit: int = 100
) -> List[ChatMessage]:
    """
    获取指定会话的所有消息
    
    Args:
        db: 数据库会话
        session_id: 会话标识符
        limit: 返回的最大记录数
        
    Returns:
        List[ChatMessage]: 消息列表，按创建时间排序
    """
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )


def delete_messages_by_session(db: Session, session_id: str) -> int:
    """
    删除指定会话的所有消息
    
    Args:
        db: 数据库会话
        session_id: 会话标识符
        
    Returns:
        int: 删除的消息数量
    """
    deleted_count = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .delete()
    )
    db.commit()
    return deleted_count


def get_recent_messages(
    db: Session, 
    session_id: str, 
    limit: int = 10
) -> List[ChatMessage]:
    """
    获取指定会话的最近N条消息
    
    用于构建对话上下文。
    
    Args:
        db: 数据库会话
        session_id: 会话标识符
        limit: 返回的最大记录数
        
    Returns:
        List[ChatMessage]: 最近的消息列表
    """
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )[::-1]  # 反转使其按时间正序排列
