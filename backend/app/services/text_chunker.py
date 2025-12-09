"""
用于将文档分割为较小段落的文本分块模块。
保留元数据，包括页码和边界框。
"""
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.services.pdf_parser import PDFDocument, TextBlock
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class TextChunk:
    """
    表示带有检索元数据的文本块。
    """
    content: str
    chunk_index: int
    page_number: int
    start_page: int
    end_page: int
    
    # 主要内容区域的边界框
    bbox: Optional[dict] = None
    
    # 源文档中的字符位置
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    
    # 用于回溯的源文本块索引
    source_blocks: list[int] = field(default_factory=list)
    
    # 附加元数据
    metadata: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        """转换为字典以便存储。"""
        return {
            "content": self.content,
            "chunk_index": self.chunk_index,
            "page_number": self.page_number,
            "start_page": self.start_page,
            "end_page": self.end_page,
            "bbox": self.bbox,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "source_blocks": self.source_blocks,
            "metadata": self.metadata,
        }


class TextChunker:
    """
    将文本分割为块，同时保留位置元数据。
    实现重叠窗口以更好地保留上下文。
    """
    
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separator: str = "\n",
        length_function: callable = len,
    ):
        """
        初始化文本分块器。
        
        Args:
            chunk_size: 每个块的目标大小（字符或 token 数）。
            chunk_overlap: 块之间重叠的字符数。
            separator: 分割字符。
            length_function: 测量文本长度的函数。
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator
        self.length_function = length_function
    
    def chunk_document(self, pdf_doc: PDFDocument) -> list[TextChunk]:
        """
        将 PDF 文档分割为带元数据的块。
        
        Args:
            pdf_doc: 已解析的 PDF 文档。
            
        Returns:
            TextChunk 对象列表。
        """
        logger.info(f"正在分块文档: {pdf_doc.filename}")
        
        # 收集所有文本块及其元数据
        all_blocks: list[tuple[TextBlock, int]] = []  # (文本块, 全局字符起始位置)
        current_char = 0
        
        for page in pdf_doc.pages:
            for block in page.text_blocks:
                all_blocks.append((block, current_char))
                current_char += len(block.text) + 1  # +1 为分隔符
        
        if not all_blocks:
            logger.warning("文档中未找到文本块")
            return []
        
        chunks = []
        chunk_index = 0
        current_chunk_text = ""
        current_chunk_blocks: list[tuple[TextBlock, int]] = []
        
        for block, char_start in all_blocks:
            # 检查添加此块是否超过块大小
            potential_text = (
                current_chunk_text + self.separator + block.text
                if current_chunk_text
                else block.text
            )
            
            if self.length_function(potential_text) > self.chunk_size and current_chunk_text:
                # 保存当前块
                chunk = self._create_chunk(
                    current_chunk_text,
                    chunk_index,
                    current_chunk_blocks,
                )
                chunks.append(chunk)
                chunk_index += 1
                
                # 以重叠开始新块
                overlap_text, overlap_blocks = self._get_overlap(
                    current_chunk_text,
                    current_chunk_blocks,
                )
                current_chunk_text = overlap_text + self.separator + block.text if overlap_text else block.text
                current_chunk_blocks = overlap_blocks + [(block, char_start)]
            else:
                current_chunk_text = potential_text
                current_chunk_blocks.append((block, char_start))
        
        # 不要忘记最后一个块
        if current_chunk_text:
            chunk = self._create_chunk(
                current_chunk_text,
                chunk_index,
                current_chunk_blocks,
            )
            chunks.append(chunk)
        
        logger.info(f"从文档创建了 {len(chunks)} 个块")
        return chunks
    
    def _create_chunk(
        self,
        text: str,
        index: int,
        blocks: list[tuple[TextBlock, int]],
    ) -> TextChunk:
        """
        从收集的文本和块创建 TextChunk。
        
        Args:
            text: 块文本内容。
            index: 块索引。
            blocks: (TextBlock, 字符起始位置) 元组列表。
            
        Returns:
            TextChunk 对象。
        """
        if not blocks:
            return TextChunk(
                content=text,
                chunk_index=index,
                page_number=1,
                start_page=1,
                end_page=1,
            )
        
        # 计算页面范围
        pages = [b[0].page_number for b in blocks]
        start_page = min(pages)
        end_page = max(pages)
        
        # 使用第一个块的页面作为主页面
        primary_page = blocks[0][0].page_number
        
        # 计算组合边界框（主页面上所有块的并集）
        primary_blocks = [b[0] for b in blocks if b[0].page_number == primary_page]
        if primary_blocks:
            bbox = self._merge_bboxes([b.bbox for b in primary_blocks])
        else:
            bbox = None
        
        # 获取字符位置
        start_char = blocks[0][1] if blocks else None
        last_block = blocks[-1]
        end_char = last_block[1] + len(last_block[0].text) if blocks else None
        
        return TextChunk(
            content=text,
            chunk_index=index,
            page_number=primary_page,
            start_page=start_page,
            end_page=end_page,
            bbox=bbox,
            start_char=start_char,
            end_char=end_char,
            source_blocks=[b[0].block_index for b in blocks],
        )
    
    def _get_overlap(
        self,
        text: str,
        blocks: list[tuple[TextBlock, int]],
    ) -> tuple[str, list[tuple[TextBlock, int]]]:
        """
        从当前块的末尾获取重叠内容。
        
        Args:
            text: 当前块文本。
            blocks: 当前块的文本块列表。
            
        Returns:
            (重叠文本, 重叠块列表) 元组。
        """
        if self.chunk_overlap <= 0 or not text:
            return "", []
        
        # 简单的基于字符的重叠
        overlap_text = text[-self.chunk_overlap:] if len(text) > self.chunk_overlap else text
        
        # 找到贡献于重叠的块
        overlap_start = len(text) - len(overlap_text)
        overlap_blocks = []
        
        current_pos = 0
        for block, char_start in blocks:
            block_end = current_pos + len(block.text)
            if block_end > overlap_start:
                overlap_blocks.append((block, char_start))
            current_pos = block_end + 1  # +1 为分隔符
        
        return overlap_text, overlap_blocks
    
    def _merge_bboxes(self, bboxes: list[tuple[float, float, float, float]]) -> dict:
        """
        将多个边界框合并为一个包含所有块的框。
        
        Args:
            bboxes: (x0, y0, x1, y1) 元组列表。
            
        Returns:
            包含合并后边界框坐标的字典。
        """
        if not bboxes:
            return None
        
        x0 = min(b[0] for b in bboxes)
        y0 = min(b[1] for b in bboxes)
        x1 = max(b[2] for b in bboxes)
        y1 = max(b[3] for b in bboxes)
        
        return {"x0": x0, "y0": y0, "x1": x1, "y1": y1}


def chunk_pdf_document(pdf_doc: PDFDocument) -> list[TextChunk]:
    """
    分块 PDF 文档的便捷函数。
    
    Args:
        pdf_doc: 已解析的 PDF 文档。
        
    Returns:
        TextChunk 对象列表。
    """
    chunker = TextChunker(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    return chunker.chunk_document(pdf_doc)
