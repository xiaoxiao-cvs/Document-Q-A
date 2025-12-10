"""
文档管理的 API 路由。
处理 PDF 文档的上传、检索和删除。
"""
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.schemas import (
    DocumentResponse,
    DocumentUploadResponse,
    ChunkResponse,
    ErrorResponse,
)
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "无效文件"},
        413: {"model": ErrorResponse, "description": "文件太大"},
    },
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    上传 PDF 文档进行处理。
    
    文档将被解析、分块并索引以便问答。
    
    - **file**: 要上传的 PDF 文件
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未提供文件名",
        )
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 PDF 文件",
        )
    
    try:
        # 读取文件内容
        content = await file.read()
        
        # 处理文档
        service = DocumentService(db)
        document = service.upload_file(content, file.filename)
        
        # 后台处理（目前同步执行）
        document = service.process_document(document.id)
        
        return DocumentUploadResponse(
            file_id=document.id,
            filename=document.original_filename,
            message=f"文档上传并处理成功。已索引 {document.page_count} 页。",
            status=document.status,
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"上传失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理文档失败: {str(e)}",
        )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
    },
)
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    根据 ID 获取文档详情。
    
    - **document_id**: 文档的 UUID
    """
    service = DocumentService(db)
    document = service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {document_id}",
        )
    
    return document


@router.get(
    "",
    response_model=list[DocumentResponse],
)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    列出所有文档。
    
    - **skip**: 要跳过的文档数量
    - **limit**: 要返回的最大文档数量
    """
    service = DocumentService(db)
    return service.list_documents(skip=skip, limit=limit)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
    },
)
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    删除文档及其所有关联数据。
    
    - **document_id**: 要删除的文档 UUID
    """
    service = DocumentService(db)
    deleted = service.delete_document(document_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {document_id}",
        )


@router.get(
    "/{document_id}/chunks",
    response_model=list[ChunkResponse],
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
    },
)
async def get_document_chunks(
    document_id: str,
    page: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    获取文档的文本块。
    
    - **document_id**: 文档的 UUID
    - **page**: 可选的页码过滤
    """
    service = DocumentService(db)
    document = service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {document_id}",
        )
    
    chunks = service.get_document_chunks(document_id, page=page)
    return chunks


@router.get(
    "/{document_id}/file",
    responses={
        404: {"model": ErrorResponse, "description": "未找到文档"},
    },
)
async def get_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    获取 PDF 文件用于预览。
    
    - **document_id**: 文档的 UUID
    """
    service = DocumentService(db)
    document = service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到文档: {document_id}",
        )
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在",
        )
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=document.original_filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )
