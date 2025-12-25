"""
文档管理 API 端点模块

提供文档上传、列表、删除等接口。
"""
import os
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
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
from app.services.thumbnail_service import thumbnail_service

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
    background_tasks: BackgroundTasks,
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
    
    # 验证文件（包括文件魔数验证）
    is_valid, error_msg = document_service.validate_file(file.filename, file_size, content)
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
    
    # 立即返回上传成功响应，文档处理在后台进行
    response = UploadResponse(
        id=db_document.id,
        filename=db_document.filename,
        file_size=db_document.file_size,
        upload_time=db_document.upload_time,
        status=db_document.status,
        chunk_count=0,  # 初始为0，处理完成后更新
        message="文件上传成功，正在后台处理..."
    )
    
    # 使用 BackgroundTasks 在后台处理文档（不阻塞响应）
    background_tasks.add_task(
        process_document_background, db_document.id, filepath
    )
    
    return response


def process_document_background(doc_id: int, filepath: str):
    """
    后台处理文档（在线程池中执行，避免阻塞事件循环）
    
    包括：文本提取、切片、向量化、生成缩略图
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        # 更新状态为处理中
        document_crud.update_document(
            db, doc_id, 
            DocumentUpdate(status="processing")
        )
        
        # 提取文本（同步操作，但在线程池中执行不会阻塞主线程）
        text, page_count = document_service.extract_text(filepath)
        
        if not text.strip():
            raise ValueError("无法从文档中提取文本内容")
        
        # 切分文本
        chunks = document_service.chunk_text(text)
        
        if not chunks:
            raise ValueError("文本切片失败，未生成任何切片")
        
        # 添加到向量数据库
        try:
            vector_service.add_documents(doc_id, chunks)
            print(f"✓ 文档 {doc_id} 处理完成，共 {len(chunks)} 个切片")
        except Exception as e:
            # 向量化失败但继续
            print(f"⚠ 文档 {doc_id} 向量化失败: {e}")
        
        # 更新文档状态为已处理
        document_crud.update_document(
            db, doc_id,
            DocumentUpdate(status="processed", chunk_count=len(chunks))
        )
        
        # 生成缩略图（同步操作）
        try:
            thumbnail_service.get_or_generate_thumbnail(doc_id, filepath)
            print(f"✓ 文档 {doc_id} 缩略图生成成功")
        except Exception as e:
            print(f"⚠ 文档 {doc_id} 缩略图生成失败: {e}")
        
    except Exception as e:
        print(f"✗ 文档 {doc_id} 后台处理异常: {e}")
        try:
            document_crud.update_document(
                db, doc_id,
                DocumentUpdate(
                    status="failed",
                    error_message=f"处理失败: {str(e)}"
                )
            )
        except Exception:
            pass
    finally:
        db.close()


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
            file_size=doc.file_size,
            upload_time=doc.upload_time,
            status=doc.status,
            chunk_count=doc.chunk_count
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
    
    # 删除缩略图缓存
    thumbnail_service.delete_thumbnail_cache(doc_id)
    
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
        file_size=db_document.file_size,
        upload_time=db_document.upload_time,
        status=db_document.status,
        chunk_count=db_document.chunk_count
    )


@router.get(
    "/{doc_id}/file",
    summary="获取文档文件",
    description="下载或预览指定文档的 PDF 文件"
)
async def get_document_file(
    doc_id: int,
    db: Session = Depends(get_db)
) -> FileResponse:
    """
    获取文档 PDF 文件
    
    - **doc_id**: 文档 ID
    
    返回 PDF 文件，可用于预览或下载。
    """
    db_document = document_crud.get_document(db, doc_id)
    if db_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"文档 ID {doc_id} 不存在"
        )
    
    # 检查文件是否存在
    if not os.path.exists(db_document.filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在或已被删除"
        )
    
    return FileResponse(
        path=db_document.filepath,
        filename=db_document.filename,
        media_type="application/pdf"
    )


@router.get(
    "/{doc_id}/thumbnail",
    summary="获取文档缩略图",
    description="获取指定文档的 PDF 首页缩略图"
)
async def get_document_thumbnail(
    doc_id: int,
    db: Session = Depends(get_db)
) -> Response:
    """
    获取文档缩略图
    
    - **doc_id**: 文档 ID
    
    返回 PNG 格式的缩略图。如果缩略图未生成，会实时生成。
    """
    db_document = document_crud.get_document(db, doc_id)
    if db_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"文档 ID {doc_id} 不存在"
        )
    
    # 检查文件是否存在
    if not os.path.exists(db_document.filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在或已被删除"
        )
    
    # 获取或生成缩略图
    thumbnail_data = thumbnail_service.get_or_generate_thumbnail(
        doc_id, 
        db_document.filepath
    )
    
    if thumbnail_data is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成缩略图失败"
        )
    
    return Response(
        content=thumbnail_data,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",  # 缓存 24 小时
            "Content-Disposition": f"inline; filename={doc_id}_thumbnail.png"
        }
    )
