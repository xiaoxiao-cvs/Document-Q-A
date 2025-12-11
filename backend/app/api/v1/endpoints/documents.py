"""
文档管理 API 端点模块

提供文档上传、列表、删除等接口。
"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.crud import document as document_crud
from app.db.session import get_db
from app.schemas.document import (
    DocumentDeleteResponse,
    DocumentListItem,
    UploadResponse,
    DocumentUpdate,
)
from app.services.doc_service import document_service
from app.services.vector_service import vector_service

# 创建路由器
router = APIRouter(prefix="/documents", tags=["文档管理"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文档",
    description="上传 PDF 文档，系统将自动解析并建立索引"
)
async def upload_document(
    file: UploadFile = File(..., description="要上传的 PDF 文件"),
    db: Session = Depends(get_db)
) -> UploadResponse:
    """
    上传 PDF 文档
    
    - **file**: PDF 文件（仅支持 .pdf 格式）
    
    上传后系统会自动：
    1. 验证文件格式和大小
    2. 保存文件到服务器
    3. 提取文本内容
    4. 切分文本并向量化
    5. 存入向量数据库供检索
    """
    # 读取文件内容
    content = await file.read()
    file_size = len(content)
    
    # 验证文件
    is_valid, error_msg = document_service.validate_file(file.filename, file_size)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # 保存文件
    try:
        filepath = document_service.save_file(file.filename, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件保存失败: {str(e)}"
        )
    
    # 创建数据库记录
    from app.schemas.document import DocumentCreate
    doc_data = DocumentCreate(
        filename=file.filename,
        filepath=filepath,
        file_size=file_size
    )
    db_document = document_crud.create_document(db, doc_data)
    
    # 异步处理文档（提取文本、切片、向量化）
    success, message, chunk_count = await document_service.process_document(
        db, db_document.id, filepath
    )
    
    if success:
        # 获取切片并添加到向量数据库
        try:
            text, _ = document_service.extract_text_from_pdf(filepath)
            chunks = document_service.chunk_text(text)
            vector_service.add_documents(db_document.id, chunks)
        except Exception as e:
            # 向量化失败，更新状态但不影响整体流程
            document_crud.update_document(
                db, db_document.id,
                DocumentUpdate(error_message=f"向量化失败: {str(e)}")
            )
    
    # 刷新文档状态
    db.refresh(db_document)
    
    return UploadResponse(
        id=db_document.id,
        filename=db_document.filename,
        upload_time=db_document.upload_time,
        status=db_document.status,
        message=message if success else f"处理失败: {message}"
    )


@router.get(
    "",
    response_model=List[DocumentListItem],
    summary="获取文档列表",
    description="获取所有已上传的文档列表"
)
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> List[DocumentListItem]:
    """
    获取文档列表
    
    - **skip**: 跳过的记录数（分页用）
    - **limit**: 返回的最大记录数
    
    返回按上传时间倒序排列的文档列表。
    """
    documents = document_crud.get_documents(db, skip=skip, limit=limit)
    return [
        DocumentListItem(
            id=doc.id,
            filename=doc.filename,
            upload_time=doc.upload_time,
            status=doc.status
        )
        for doc in documents
    ]


@router.delete(
    "/{doc_id}",
    response_model=DocumentDeleteResponse,
    summary="删除文档",
    description="删除指定的文档及其向量索引"
)
async def delete_document(
    doc_id: int,
    db: Session = Depends(get_db)
) -> DocumentDeleteResponse:
    """
    删除文档
    
    - **doc_id**: 文档 ID
    
    删除操作将：
    1. 从数据库中删除文档记录
    2. 从向量数据库中删除相关向量
    3. 删除服务器上的文件
    """
    # 检查文档是否存在
    db_document = document_crud.get_document(db, doc_id)
    if db_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"文档 ID {doc_id} 不存在"
        )
    
    # 删除向量
    vector_service.delete_document_vectors(doc_id)
    
    # 删除文件
    document_service.delete_file(db_document.filepath)
    
    # 删除数据库记录
    document_crud.delete_document(db, doc_id)
    
    return DocumentDeleteResponse(message="文档删除成功")


@router.get(
    "/{doc_id}",
    response_model=DocumentListItem,
    summary="获取文档详情",
    description="获取指定文档的详细信息"
)
async def get_document(
    doc_id: int,
    db: Session = Depends(get_db)
) -> DocumentListItem:
    """
    获取文档详情
    
    - **doc_id**: 文档 ID
    """
    db_document = document_crud.get_document(db, doc_id)
    if db_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"文档 ID {doc_id} 不存在"
        )
    
    return DocumentListItem(
        id=db_document.id,
        filename=db_document.filename,
        upload_time=db_document.upload_time,
        status=db_document.status
    )
