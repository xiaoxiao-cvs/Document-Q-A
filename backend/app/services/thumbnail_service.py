"""
缩略图服务模块

处理 PDF 缩略图的生成和缓存。
"""
import asyncio
import hashlib
import io
import os
from pathlib import Path
from typing import Optional, Tuple

from app.core.config import settings


class ThumbnailService:
    """
    缩略图服务类
    
    提供 PDF 首页缩略图的生成和缓存功能。
    """
    
    # 缩略图配置
    THUMBNAIL_WIDTH = 280
    THUMBNAIL_HEIGHT = 400
    THUMBNAIL_FORMAT = "PNG"
    THUMBNAIL_QUALITY = 85
    
    def __init__(self):
        """初始化缩略图服务"""
        self._cache_dir = Path(settings.UPLOAD_DIR).parent / "thumbnails"
        self._cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_path(self, doc_id: int) -> Path:
        """
        获取缩略图缓存路径
        
        Args:
            doc_id: 文档 ID
            
        Returns:
            Path: 缓存文件路径
        """
        return self._cache_dir / f"{doc_id}.png"
    
    def get_cached_thumbnail(self, doc_id: int) -> Optional[bytes]:
        """
        获取缓存的缩略图
        
        Args:
            doc_id: 文档 ID
            
        Returns:
            Optional[bytes]: 缩略图数据，如果没有缓存则返回 None
        """
        cache_path = self._get_cache_path(doc_id)
        if cache_path.exists():
            return cache_path.read_bytes()
        return None
    
    def save_thumbnail_cache(self, doc_id: int, data: bytes) -> None:
        """
        保存缩略图到缓存
        
        Args:
            doc_id: 文档 ID
            data: 缩略图数据
        """
        cache_path = self._get_cache_path(doc_id)
        cache_path.write_bytes(data)
    
    def delete_thumbnail_cache(self, doc_id: int) -> None:
        """
        删除缩略图缓存
        
        Args:
            doc_id: 文档 ID
        """
        cache_path = self._get_cache_path(doc_id)
        if cache_path.exists():
            cache_path.unlink()
    
    def generate_thumbnail(self, file_path: str) -> Optional[bytes]:
        """
        从文件生成缩略图
        
        Args:
            file_path: 文件路径
            
        Returns:
            Optional[bytes]: PNG 格式的缩略图数据
        """
        extension = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
        
        if extension == "pdf":
            return self._generate_pdf_thumbnail(file_path)
        elif extension in ["txt", "docx"]:
            return self._generate_text_placeholder(extension)
        else:
            return None
    
    def _generate_pdf_thumbnail(self, pdf_path: str) -> Optional[bytes]:
        """
        从 PDF 生成缩略图
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            Optional[bytes]: PNG 格式的缩略图数据
        """
        try:
            import fitz  # PyMuPDF
            from PIL import Image
            
            # 打开 PDF
            doc = fitz.open(pdf_path)
            if doc.page_count == 0:
                doc.close()
                return None
            
            # 获取第一页
            page = doc[0]
            
            # 计算缩放比例以适应目标尺寸
            rect = page.rect
            scale_x = self.THUMBNAIL_WIDTH / rect.width
            scale_y = self.THUMBNAIL_HEIGHT / rect.height
            scale = min(scale_x, scale_y)
            
            # 渲染页面为图像
            mat = fitz.Matrix(scale * 2, scale * 2)  # 2x 超采样以提高质量
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            doc.close()
            
            # 转换为 PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # 调整到目标尺寸
            img.thumbnail((self.THUMBNAIL_WIDTH, self.THUMBNAIL_HEIGHT), Image.Resampling.LANCZOS)
            
            # 创建白色背景并居中放置缩略图
            background = Image.new("RGB", (self.THUMBNAIL_WIDTH, self.THUMBNAIL_HEIGHT), (255, 255, 255))
            offset = ((self.THUMBNAIL_WIDTH - img.width) // 2, (self.THUMBNAIL_HEIGHT - img.height) // 2)
            background.paste(img, offset)
            
            # 保存为 PNG
            buffer = io.BytesIO()
            background.save(buffer, format=self.THUMBNAIL_FORMAT, optimize=True)
            
            return buffer.getvalue()
            
        except Exception as e:
            print(f"生成PDF缩略图失败: {e}")
            return None
    
    def _generate_text_placeholder(self, extension: str) -> Optional[bytes]:
        """
        为文本类文件生成占位符缩略图
        
        Args:
            extension: 文件扩展名 (txt 或 docx)
            
        Returns:
            Optional[bytes]: PNG 格式的缩略图数据
        """
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # 创建白色背景
            img = Image.new("RGB", (self.THUMBNAIL_WIDTH, self.THUMBNAIL_HEIGHT), (250, 250, 250))
            draw = ImageDraw.Draw(img)
            
            # 绘制文件图标区域
            icon_color = (100, 100, 100)
            
            # 文件图标 - 简单的矩形代表纸张
            paper_left = 90
            paper_top = 80
            paper_right = 190
            paper_bottom = 260
            
            # 绘制纸张阴影
            draw.rectangle([paper_left + 4, paper_top + 4, paper_right + 4, paper_bottom + 4], fill=(200, 200, 200))
            # 绘制纸张主体
            draw.rectangle([paper_left, paper_top, paper_right, paper_bottom], fill=(255, 255, 255), outline=(180, 180, 180), width=2)
            
            # 绘制折角
            corner_size = 25
            draw.polygon([
                (paper_right - corner_size, paper_top),
                (paper_right, paper_top + corner_size),
                (paper_right - corner_size, paper_top + corner_size)
            ], fill=(230, 230, 230), outline=(180, 180, 180))
            draw.line([(paper_right - corner_size, paper_top), (paper_right - corner_size, paper_top + corner_size)], fill=(180, 180, 180), width=1)
            draw.line([(paper_right - corner_size, paper_top + corner_size), (paper_right, paper_top + corner_size)], fill=(180, 180, 180), width=1)
            
            # 绘制文本行（代表文档内容）
            line_y = paper_top + 45
            line_spacing = 18
            for i in range(8):
                line_width = 70 if i % 3 == 2 else 80  # 变化的行宽
                draw.rectangle([paper_left + 15, line_y, paper_left + 15 + line_width, line_y + 8], fill=(220, 220, 220))
                line_y += line_spacing
            
            # 绘制扩展名标签
            ext_text = extension.upper()
            ext_color = (66, 133, 244) if extension == "docx" else (76, 175, 80)  # 蓝色 for docx, 绿色 for txt
            
            # 扩展名标签背景
            label_width = 50
            label_height = 24
            label_left = (self.THUMBNAIL_WIDTH - label_width) // 2
            label_top = paper_bottom + 20
            
            draw.rounded_rectangle(
                [label_left, label_top, label_left + label_width, label_top + label_height],
                radius=4,
                fill=ext_color
            )
            
            # 绘制扩展名文字（使用默认字体）
            try:
                # 尝试使用系统字体
                font = ImageFont.truetype("arial.ttf", 14)
            except:
                font = ImageFont.load_default()
            
            # 计算文字位置使其居中
            bbox = draw.textbbox((0, 0), ext_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            text_x = label_left + (label_width - text_width) // 2
            text_y = label_top + (label_height - text_height) // 2 - 2
            
            draw.text((text_x, text_y), ext_text, fill=(255, 255, 255), font=font)
            
            # 保存为 PNG
            buffer = io.BytesIO()
            img.save(buffer, format=self.THUMBNAIL_FORMAT, optimize=True)
            
            return buffer.getvalue()
            
        except Exception as e:
            print(f"生成占位符缩略图失败: {e}")
            return None
    
    async def generate_thumbnail_async(self, doc_id: int, file_path: str) -> bool:
        """
        异步生成并缓存缩略图
        
        Args:
            doc_id: 文档 ID
            file_path: 文件路径
            
        Returns:
            bool: 是否成功
        """
        # 在线程池中执行同步的图像处理
        loop = asyncio.get_event_loop()
        thumbnail_data = await loop.run_in_executor(
            None, 
            self.generate_thumbnail, 
            file_path
        )
        
        if thumbnail_data:
            self.save_thumbnail_cache(doc_id, thumbnail_data)
            return True
        return False
    
    def get_or_generate_thumbnail(self, doc_id: int, file_path: str) -> Optional[bytes]:
        """
        获取或生成缩略图（同步版本）
        
        优先从缓存获取，如果没有则生成新的。
        
        Args:
            doc_id: 文档 ID
            file_path: 文件路径
            
        Returns:
            Optional[bytes]: 缩略图数据
        """
        # 先检查缓存
        cached = self.get_cached_thumbnail(doc_id)
        if cached:
            return cached
        
        # 生成新的缩略图
        thumbnail_data = self.generate_thumbnail(file_path)
        if thumbnail_data:
            self.save_thumbnail_cache(doc_id, thumbnail_data)
        
        return thumbnail_data


# 创建全局服务实例
thumbnail_service = ThumbnailService()
