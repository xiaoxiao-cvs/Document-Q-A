"""
文档服务模块

处理文档上传、存储、文本提取和切片等业务逻辑。
"""
import os
import shutil
from datetime import datetime
from typing import List, Optional, Tuple

from pypdf import PdfReader
from docx import Document as DocxDocument
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import document as document_crud
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    """
    文档服务类
    
    提供文档上传、解析和管理功能。
    """
    
    def __init__(self):
        """初始化文档服务，确保上传目录存在"""
        self._ensure_upload_dir()
    
    def _ensure_upload_dir(self) -> None:
        """确保上传目录存在"""
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # 文件魔数字典，用于验证文件类型
    FILE_SIGNATURES = {
        "pdf": [b"%PDF"],  # PDF 文件魔数
        "docx": [b"PK\x03\x04"],  # DOCX (ZIP 压缩格式)
        "txt": None,  # 文本文件无特定魔数
    }
    
    def validate_file(self, filename: str, file_size: int, content: Optional[bytes] = None) -> Tuple[bool, str]:
        """
        验证上传的文件
        
        Args:
            filename: 文件名
            file_size: 文件大小(字节)
            content: 文件内容(可选，用于验证文件魔数)
            
        Returns:
            Tuple[bool, str]: (是否有效, 错误消息)
        """
        # 检查文件名是否为空
        if not filename or not filename.strip():
            return False, "文件名不能为空"
        
        # 检查文件扩展名
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if extension not in settings.ALLOWED_EXTENSIONS:
            return False, f"不支持的文件类型: .{extension}，仅支持: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        
        # 检查文件大小
        if file_size <= 0:
            return False, "文件不能为空"
        
        if file_size > settings.MAX_UPLOAD_SIZE:
            max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            return False, f"文件过大，最大允许 {max_size_mb}MB"
        
        # 如果提供了文件内容，验证文件魔数
        if content and extension in self.FILE_SIGNATURES:
            signatures = self.FILE_SIGNATURES[extension]
            if signatures:  # 如果有定义魔数
                is_valid_magic = any(
                    content.startswith(sig) for sig in signatures
                )
                if not is_valid_magic:
                    return False, f"文件内容与扩展名不匹配，请上传有效的 .{extension} 文件"
        
        return True, ""
    
    def save_file(self, filename: str, content: bytes) -> str:
        """
        保存上传的文件到磁盘
        
        Args:
            filename: 原始文件名
            content: 文件内容
            
        Returns:
            str: 文件存储路径
        """
        # 生成唯一文件名，避免冲突
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(settings.UPLOAD_DIR, safe_filename)
        
        with open(filepath, "wb") as f:
            f.write(content)
        
        return filepath
    
    def extract_text_from_pdf(self, filepath: str) -> Tuple[str, int]:
        """
        从PDF文件中提取文本
        
        Args:
            filepath: PDF文件路径
            
        Returns:
            Tuple[str, int]: (提取的文本内容, 总页数)
        """
        reader = PdfReader(filepath)
        text_parts = []
        
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                # 在每页文本前添加页码标记，便于后续引用
                text_parts.append(f"[第{page_num}页]\n{page_text}")
        
        full_text = "\n\n".join(text_parts)
        return full_text, len(reader.pages)
    
    def extract_text_from_txt(self, filepath: str) -> Tuple[str, int]:
        """
        从TXT文件中提取文本
        
        Args:
            filepath: TXT文件路径
            
        Returns:
            Tuple[str, int]: (提取的文本内容, 总页数估算)
        """
        # 尝试多种编码读取
        encodings = ['utf-8', 'gbk', 'gb2312', 'utf-16', 'latin-1']
        text = None
        
        for encoding in encodings:
            try:
                with open(filepath, 'r', encoding=encoding) as f:
                    text = f.read()
                break
            except (UnicodeDecodeError, UnicodeError):
                continue
        
        if text is None:
            # 最后尝试以二进制读取并忽略错误
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        
        # 估算页数（假设每页约 3000 字符）
        estimated_pages = max(1, len(text) // 3000 + 1)
        
        # 添加页码标记（每 3000 字符一页）
        text_parts = []
        chars_per_page = 3000
        for i in range(0, len(text), chars_per_page):
            page_num = i // chars_per_page + 1
            page_text = text[i:i + chars_per_page]
            text_parts.append(f"[第{page_num}页]\n{page_text}")
        
        full_text = "\n\n".join(text_parts) if text_parts else text
        return full_text, estimated_pages
    
    def extract_text_from_docx(self, filepath: str) -> Tuple[str, int]:
        """
        从DOCX文件中提取文本
        
        Args:
            filepath: DOCX文件路径
            
        Returns:
            Tuple[str, int]: (提取的文本内容, 总页数估算)
        """
        doc = DocxDocument(filepath)
        text_parts = []
        current_text = []
        chars_per_page = 3000
        current_page = 1
        char_count = 0
        
        for para in doc.paragraphs:
            para_text = para.text.strip()
            if para_text:
                current_text.append(para_text)
                char_count += len(para_text)
                
                # 每 3000 字符作为一页
                if char_count >= chars_per_page:
                    text_parts.append(f"[第{current_page}页]\n" + "\n".join(current_text))
                    current_text = []
                    char_count = 0
                    current_page += 1
        
        # 添加剩余文本
        if current_text:
            text_parts.append(f"[第{current_page}页]\n" + "\n".join(current_text))
        
        full_text = "\n\n".join(text_parts)
        estimated_pages = current_page
        
        return full_text, estimated_pages
    
    def extract_text(self, filepath: str) -> Tuple[str, int]:
        """
        根据文件类型提取文本
        
        Args:
            filepath: 文件路径
            
        Returns:
            Tuple[str, int]: (提取的文本内容, 总页数)
        """
        extension = filepath.rsplit(".", 1)[-1].lower() if "." in filepath else ""
        
        if extension == "pdf":
            return self.extract_text_from_pdf(filepath)
        elif extension == "txt":
            return self.extract_text_from_txt(filepath)
        elif extension == "docx":
            return self.extract_text_from_docx(filepath)
        else:
            raise ValueError(f"不支持的文件类型: .{extension}")
    
    def chunk_text(
        self, 
        text: str, 
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[dict]:
        """
        将文本切分成小块
        
        Args:
            text: 待切分的文本
            chunk_size: 每块的大小（字符数）
            chunk_overlap: 块之间的重叠大小
            
        Returns:
            List[dict]: 切片列表，每个切片包含 content 和 metadata
        """
        chunk_size = chunk_size or settings.CHUNK_SIZE
        chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        chunks = []
        start = 0
        current_page = 1
        
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]
            
            # 尝试在句号或换行处断开，使切片更完整
            if end < len(text):
                # 查找最后一个句号或换行
                last_period = chunk_text.rfind("。")
                last_newline = chunk_text.rfind("\n")
                break_point = max(last_period, last_newline)
                if break_point > chunk_size // 2:  # 确保切片不会太短
                    end = start + break_point + 1
                    chunk_text = text[start:end]
            
            # 检测页码标记来确定当前页
            page_marker = chunk_text.rfind("[第")
            if page_marker != -1:
                page_end = chunk_text.find("页]", page_marker)
                if page_end != -1:
                    try:
                        current_page = int(chunk_text[page_marker + 2:page_end])
                    except ValueError:
                        pass
            
            chunks.append({
                "content": chunk_text.strip(),
                "metadata": {
                    "page": current_page,
                    "start_char": start,
                    "end_char": end
                }
            })
            
            start = end - chunk_overlap
        
        return chunks
    
    async def process_document(
        self, 
        db: Session, 
        doc_id: int, 
        filepath: str
    ) -> Tuple[bool, str, int]:
        """
        处理文档：提取文本、切片、向量化
        
        Args:
            db: 数据库会话
            doc_id: 文档ID
            filepath: 文件路径
            
        Returns:
            Tuple[bool, str, int]: (是否成功, 消息, 切片数量)
        """
        try:
            # 更新状态为处理中
            document_crud.update_document(
                db, doc_id, 
                DocumentUpdate(status="processing")
            )
            
            # 提取文本（根据文件类型自动选择方法）
            text, page_count = self.extract_text(filepath)
            
            if not text.strip():
                raise ValueError("无法从文档中提取文本内容")
            
            # 切分文本
            chunks = self.chunk_text(text)
            
            if not chunks:
                raise ValueError("文本切片失败，未生成任何切片")
            
            # TODO: 调用向量服务进行向量化和存储
            # 这里先跳过向量化步骤，待向量服务实现后补充
            
            # 更新文档状态
            document_crud.update_document(
                db, doc_id,
                DocumentUpdate(status="processed", chunk_count=len(chunks))
            )
            
            return True, f"文档处理成功，共 {page_count} 页，生成 {len(chunks)} 个切片", len(chunks)
            
        except Exception as e:
            # 处理失败，更新状态
            document_crud.update_document(
                db, doc_id,
                DocumentUpdate(status="failed", error_message=str(e))
            )
            return False, f"文档处理失败: {str(e)}", 0
    
    def delete_file(self, filepath: str) -> bool:
        """
        删除磁盘上的文件
        
        Args:
            filepath: 文件路径
            
        Returns:
            bool: 是否删除成功
        """
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
            return True
        except Exception:
            return False


# 创建全局服务实例
document_service = DocumentService()
