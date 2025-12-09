"""
文档服务，用于管理 PDF 文档。
处理上传、处理和存储。
"""
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.models import Document, DocumentChunk
from app.services.pdf_parser import PDFParser, PDFDocument
from app.services.text_chunker import TextChunker, TextChunk
from app.services.vector_store import VectorStore, get_vector_store

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentService:
    """
    文档管理服务。
    处理完整生命周期：上传、解析、分块、嵌入和存储。
    """
    
    def __init__(
        self,
        db: Session,
        vector_store: Optional[VectorStore] = None,
    ):
        """
        初始化文档服务。
        
        Args:
            db: 数据库会话。
            vector_store: 向量存储实例。
        """
        self.db = db
        self.vector_store = vector_store or get_vector_store()
        self.pdf_parser = PDFParser()
        self.text_chunker = TextChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        
        # 确保上传目录存在
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def upload_file(
        self,
        file_content: bytes,
        filename: str,
    ) -> Document:
        """
        上传并处理 PDF 文件。
        
        Args:
            file_content: 文件内容字节。
            filename: 原始文件名。
            
        Returns:
            创建的 Document 模型实例。
            
        Raises:
            ValueError: 文件无效或太大时抛出。
        """
        # 验证文件
        if not filename.lower().endswith(".pdf"):
            raise ValueError("仅支持 PDF 文件")
        
        if len(file_content) > settings.max_file_size:
            raise ValueError(f"文件太大。最大大小为 {settings.max_file_size // (1024*1024)} MB")
        
        # 生成唯一文件名
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}.pdf"
        file_path = self.upload_dir / safe_filename
        
        # 保存文件
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # 创建文档记录
        document = Document(
            id=file_id,
            filename=safe_filename,
            original_filename=filename,
            file_path=str(file_path),
            file_size=len(file_content),
            status="pending",
        )
        
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        
        logger.info(f"已上传文档: {document.id}")
        
        return document
    
    def process_document(self, document_id: str) -> Document:
        """
        处理已上传的文档：解析、分块和嵌入。
        
        Args:
            document_id: 要处理的文档 ID。
            
        Returns:
            更新后的 Document 模型实例。
            
        Raises:
            ValueError: 未找到文档时抛出。
        """
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError(f"未找到文档: {document_id}")
        
        try:
            # 更新状态
            document.status = "processing"
            self.db.commit()
            
            # 解析 PDF
            logger.info(f"正在解析文档: {document_id}")
            pdf_doc = self.pdf_parser.parse(document.file_path)
            document.page_count = pdf_doc.page_count
            
            # 分块文本
            logger.info(f"正在分块文档: {document_id}")
            chunks = self.text_chunker.chunk_document(pdf_doc)
            
            # 将块存储到数据库
            self._store_chunks(document, chunks)
            
            # 添加到向量存储
            logger.info(f"正在嵌入文档: {document_id}")
            self.vector_store.add_chunks(chunks, document_id)
            
            # 更新状态
            document.status = "completed"
            self.db.commit()
            self.db.refresh(document)
            
            logger.info(f"成功处理文档: {document_id}")
            
        except Exception as e:
            logger.error(f"处理文档 {document_id} 失败: {e}")
            document.status = "failed"
            document.error_message = str(e)
            self.db.commit()
            raise
        
        return document
    
    def _store_chunks(self, document: Document, chunks: list[TextChunk]) -> None:
        """
        将文本块存储到数据库。
        
        Args:
            document: 父文档。
            chunks: 文本块列表。
        """
        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                page_number=chunk.page_number,
                bbox=chunk.bbox,
                start_char=chunk.start_char,
                end_char=chunk.end_char,
            )
            self.db.add(db_chunk)
        
        self.db.commit()
    
    def get_document(self, document_id: str) -> Optional[Document]:
        """
        根据 ID 获取文档。
        
        Args:
            document_id: 文档 ID。
            
        Returns:
            Document 实例或 None。
        """
        return self.db.query(Document).filter(Document.id == document_id).first()
    
    def list_documents(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Document]:
        """
        列出所有文档。
        
        Args:
            skip: 要跳过的文档数量。
            limit: 要返回的最大文档数量。
            
        Returns:
            Document 实例列表。
        """
        return self.db.query(Document).offset(skip).limit(limit).all()
    
    def delete_document(self, document_id: str) -> bool:
        """
        删除文档及其所有关联数据。
        
        Args:
            document_id: 文档 ID。
            
        Returns:
            删除成功返回 True，未找到返回 False。
        """
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return False
        
        # 从磁盘删除文件
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # 从向量存储删除
        self.vector_store.delete_document(document_id)
        
        # 从数据库删除（级联删除块）
        self.db.delete(document)
        self.db.commit()
        
        logger.info(f"已删除文档: {document_id}")
        return True
    
    def get_document_chunks(
        self,
        document_id: str,
        page: Optional[int] = None,
    ) -> list[DocumentChunk]:
        """
        获取文档的块。
        
        Args:
            document_id: 文档 ID。
            page: 可选的页码过滤。
            
        Returns:
            DocumentChunk 实例列表。
        """
        query = self.db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id)
        
        if page is not None:
            query = query.filter(DocumentChunk.page_number == page)
        
        return query.order_by(DocumentChunk.chunk_index).all()


def upload_and_process_document(
    db: Session,
    file_content: bytes,
    filename: str,
) -> Document:
    """
    上传并处理文档的便捷函数。
    
    Args:
        db: 数据库会话。
        file_content: 文件内容字节。
        filename: 原始文件名。
        
    Returns:
        处理后的 Document 实例。
    """
    service = DocumentService(db)
    document = service.upload_file(file_content, filename)
    return service.process_document(document.id)
