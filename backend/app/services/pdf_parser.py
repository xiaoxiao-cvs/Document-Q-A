"""
使用 PyMuPDF (fitz) 的 PDF 解析模块。
提取带边界框坐标的文本内容，用于精确高亮显示。
"""
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class TextBlock:
    """
    表示从 PDF 页面提取的文本块。
    包含文本内容及其空间位置信息。
    """
    text: str
    page_number: int  # 从 1 开始的页码
    bbox: tuple[float, float, float, float]  # (x0, y0, x1, y1) PDF 点单位
    block_index: int
    
    @property
    def x0(self) -> float:
        """左侧 x 坐标。"""
        return self.bbox[0]
    
    @property
    def y0(self) -> float:
        """顶部 y 坐标。"""
        return self.bbox[1]
    
    @property
    def x1(self) -> float:
        """右侧 x 坐标。"""
        return self.bbox[2]
    
    @property
    def y1(self) -> float:
        """底部 y 坐标。"""
        return self.bbox[3]
    
    def to_dict(self) -> dict:
        """转换为字典以便 JSON 序列化。"""
        return {
            "text": self.text,
            "page_number": self.page_number,
            "bbox": {
                "x0": self.x0,
                "y0": self.y0,
                "x1": self.x1,
                "y1": self.y1,
            },
            "block_index": self.block_index,
        }


@dataclass
class PageContent:
    """
    表示单个 PDF 页面的内容。
    """
    page_number: int  # 从 1 开始
    width: float  # 页面宽度（PDF 点单位）
    height: float  # 页面高度（PDF 点单位）
    text_blocks: list[TextBlock] = field(default_factory=list)
    full_text: str = ""
    
    def to_dict(self) -> dict:
        """转换为字典以便 JSON 序列化。"""
        return {
            "page_number": self.page_number,
            "width": self.width,
            "height": self.height,
            "text_blocks": [block.to_dict() for block in self.text_blocks],
            "full_text": self.full_text,
        }


@dataclass
class PDFDocument:
    """
    表示已解析的 PDF 文档及其所有内容。
    """
    file_path: str
    filename: str
    page_count: int
    pages: list[PageContent] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    
    def get_all_text(self) -> str:
        """获取所有页面的拼接文本。"""
        return "\n\n".join(page.full_text for page in self.pages)
    
    def get_all_blocks(self) -> list[TextBlock]:
        """获取所有页面的所有文本块。"""
        blocks = []
        for page in self.pages:
            blocks.extend(page.text_blocks)
        return blocks
    
    def to_dict(self) -> dict:
        """转换为字典以便 JSON 序列化。"""
        return {
            "file_path": self.file_path,
            "filename": self.filename,
            "page_count": self.page_count,
            "pages": [page.to_dict() for page in self.pages],
            "metadata": self.metadata,
        }


class PDFParser:
    """
    使用 PyMuPDF 的 PDF 解析类。
    提取带边界框坐标的文本用于高亮显示。
    """
    
    # 常见的页眉/页脚模式过滤
    NOISE_PATTERNS = [
        # 页码
        r"^\d+$",
        r"^Page \d+",
        r"^\d+ of \d+$",
    ]
    
    def __init__(
        self,
        filter_headers_footers: bool = True,
        header_margin: float = 50,  # 距顶部的点数
        footer_margin: float = 50,  # 距底部的点数
    ):
        """
        初始化 PDF 解析器。
        
        Args:
            filter_headers_footers: 是否过滤页眉/页脚文本。
            header_margin: 从顶部计算的页眉区域距离。
            footer_margin: 从底部计算的页脚区域距离。
        """
        self.filter_headers_footers = filter_headers_footers
        self.header_margin = header_margin
        self.footer_margin = footer_margin
    
    def parse(self, file_path: str | Path) -> PDFDocument:
        """
        解析 PDF 文件并提取带坐标的文本。
        
        Args:
            file_path: PDF 文件路径。
            
        Returns:
            包含所有提取内容的 PDFDocument 对象。
            
        Raises:
            FileNotFoundError: 文件不存在时抛出。
            ValueError: 文件不是有效的 PDF 时抛出。
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"PDF 文件未找到: {file_path}")
        
        if file_path.suffix.lower() != ".pdf":
            raise ValueError(f"文件不是 PDF: {file_path}")
        
        logger.info(f"正在解析 PDF: {file_path}")
        
        try:
            doc = fitz.open(str(file_path))
        except Exception as e:
            raise ValueError(f"无法打开 PDF: {e}")
        
        try:
            pdf_doc = PDFDocument(
                file_path=str(file_path),
                filename=file_path.name,
                page_count=len(doc),
                metadata=dict(doc.metadata) if doc.metadata else {},
            )
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_content = self._extract_page_content(page, page_num + 1)
                pdf_doc.pages.append(page_content)
            
            logger.info(
                f"成功解析 PDF: {pdf_doc.page_count} 页, "
                f"{sum(len(p.text_blocks) for p in pdf_doc.pages)} 个文本块"
            )
            
            return pdf_doc
            
        finally:
            doc.close()
    
    def _extract_page_content(self, page: fitz.Page, page_number: int) -> PageContent:
        """
        从单个 PDF 页面提取内容。
        
        Args:
            page: PyMuPDF 页面对象。
            page_number: 从 1 开始的页码。
            
        Returns:
            包含提取的文本和坐标的 PageContent 对象。
        """
        page_rect = page.rect
        page_content = PageContent(
            page_number=page_number,
            width=page_rect.width,
            height=page_rect.height,
        )
        
        # 提取带坐标的文本块
        # flags=fitz.TEXT_PRESERVE_WHITESPACE 保留格式
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        
        block_index = 0
        full_text_parts = []
        
        for block in blocks:
            # Only process text blocks (type 0), skip images (type 1)
            if block.get("type") != 0:
                continue
            
            bbox = (block["bbox"][0], block["bbox"][1], block["bbox"][2], block["bbox"][3])
            
            # Filter header/footer regions if enabled
            if self.filter_headers_footers:
                if bbox[1] < self.header_margin:  # Near top
                    continue
                if bbox[3] > page_rect.height - self.footer_margin:  # Near bottom
                    continue
            
            # Extract text from all lines in the block
            block_text = ""
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    block_text += span.get("text", "")
                block_text += "\n"
            
            block_text = block_text.strip()
            
            # Skip empty blocks or noise
            if not block_text or self._is_noise(block_text):
                continue
            
            text_block = TextBlock(
                text=block_text,
                page_number=page_number,
                bbox=bbox,
                block_index=block_index,
            )
            page_content.text_blocks.append(text_block)
            full_text_parts.append(block_text)
            block_index += 1
        
        page_content.full_text = "\n".join(full_text_parts)
        
        return page_content
    
    def _is_noise(self, text: str) -> bool:
        """
        检查文本是否可能是噪音（页码等）。
        
        Args:
            text: 要检查的文本。
            
        Returns:
            如果文本可能是噪音则返回 True。
        """
        import re
        
        text = text.strip()
        
        for pattern in self.NOISE_PATTERNS:
            if re.match(pattern, text, re.IGNORECASE):
                return True
        
        # 非常短的纯数字文本
        if len(text) < 5 and text.replace(" ", "").isdigit():
            return True
        
        return False
    
    def extract_text_with_positions(
        self,
        file_path: str | Path,
        granularity: str = "block"
    ) -> list[dict]:
        """
        按指定粒度提取带位置信息的文本。
        
        Args:
            file_path: PDF 文件路径。
            granularity: "block"、"line" 或 "word" 级别的提取。
            
        Returns:
            包含文本和位置数据的字典列表。
        """
        pdf_doc = self.parse(file_path)
        
        if granularity == "block":
            return [block.to_dict() for block in pdf_doc.get_all_blocks()]
        
        # For line/word level, we need different extraction
        results = []
        file_path = Path(file_path)
        
        doc = fitz.open(str(file_path))
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                if granularity == "word":
                    words = page.get_text("words")
                    for idx, word in enumerate(words):
                        results.append({
                            "text": word[4],
                            "page_number": page_num + 1,
                            "bbox": {
                                "x0": word[0],
                                "y0": word[1],
                                "x1": word[2],
                                "y1": word[3],
                            },
                            "block_index": idx,
                        })
                
                elif granularity == "line":
                    blocks = page.get_text("dict")["blocks"]
                    line_idx = 0
                    for block in blocks:
                        if block.get("type") != 0:
                            continue
                        for line in block.get("lines", []):
                            line_text = "".join(
                                span.get("text", "") for span in line.get("spans", [])
                            )
                            if line_text.strip():
                                results.append({
                                    "text": line_text,
                                    "page_number": page_num + 1,
                                    "bbox": {
                                        "x0": line["bbox"][0],
                                        "y0": line["bbox"][1],
                                        "x1": line["bbox"][2],
                                        "y1": line["bbox"][3],
                                    },
                                    "block_index": line_idx,
                                })
                                line_idx += 1
        finally:
            doc.close()
        
        return results


def parse_pdf(file_path: str | Path) -> PDFDocument:
    """
    解析 PDF 文件的便捷函数。
    
    Args:
        file_path: PDF 文件路径。
        
    Returns:
        PDFDocument 对象。
    """
    parser = PDFParser()
    return parser.parse(file_path)
