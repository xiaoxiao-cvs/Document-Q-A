"""
文档 CRUD 操作模块

封装文档相关的数据库增删改查操作。
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


def create_document(db: Session, document_data: DocumentCreate) -> Document:
    """
    创建新文档记录
    
    Args:
        db: 数据库会话
        document_data: 文档创建数据
        
    Returns:
        Document: 创建的文档对象
    """
    db_document = Document(
        filename=document_data.filename,
        filepath=document_data.filepath,
        file_size=document_data.file_size,
        status="pending"
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


def get_document(db: Session, doc_id: int) -> Optional[Document]:
    """
    根据ID获取文档
    
    Args:
        db: 数据库会话
        doc_id: 文档ID
        
    Returns:
        Optional[Document]: 文档对象，不存在则返回 None
    """
    return db.query(Document).filter(Document.id == doc_id).first()


def get_documents(
    db: Session, 
    skip: int = 0, 
    limit: int = 100
) -> List[Document]:
    """
    获取文档列表
    
    Args:
        db: 数据库会话
        skip: 跳过的记录数
        limit: 返回的最大记录数
        
    Returns:
        List[Document]: 文档列表
    """
    return db.query(Document).order_by(Document.upload_time.desc()).offset(skip).limit(limit).all()


def update_document(
    db: Session, 
    doc_id: int, 
    update_data: DocumentUpdate
) -> Optional[Document]:
    """
    更新文档信息
    
    Args:
        db: 数据库会话
        doc_id: 文档ID
        update_data: 更新数据
        
    Returns:
        Optional[Document]: 更新后的文档对象，不存在则返回 None
    """
    db_document = get_document(db, doc_id)
    if db_document is None:
        return None
    
    # 只更新非 None 的字段
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(db_document, field, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document


def delete_document(db: Session, doc_id: int) -> bool:
    """
    删除文档
    
    Args:
        db: 数据库会话
        doc_id: 文档ID
        
    Returns:
        bool: 是否删除成功
    """
    db_document = get_document(db, doc_id)
    if db_document is None:
        return False
    
    db.delete(db_document)
    db.commit()
    return True


def get_latest_document(db: Session) -> Optional[Document]:
    """
    获取最新上传的文档
    
    Args:
        db: 数据库会话
        
    Returns:
        Optional[Document]: 最新的文档对象，不存在则返回 None
    """
    return db.query(Document).order_by(Document.upload_time.desc()).first()


def get_processed_documents(db: Session) -> List[Document]:
    """
    获取所有已处理完成的文档
    
    Args:
        db: 数据库会话
        
    Returns:
        List[Document]: 已处理的文档列表
    """
    return db.query(Document).filter(Document.status == "processed").all()
