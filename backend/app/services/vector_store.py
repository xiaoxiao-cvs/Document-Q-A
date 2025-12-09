"""
使用 ChromaDB 的向量数据库服务，用于文档检索。
管理嵌入向量存储和相似度搜索。
"""
import logging
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings
from app.services.text_chunker import TextChunk

logger = logging.getLogger(__name__)
settings = get_settings()


class VectorStore:
    """
    使用 ChromaDB 的向量存储实现。
    处理文档嵌入和相似度搜索。
    """
    
    def __init__(
        self,
        persist_directory: Optional[str | Path] = None,
        collection_name: str = "documents",
    ):
        """
        初始化向量存储。
        
        Args:
            persist_directory: 数据库持久化目录。
            collection_name: ChromaDB 集合名称。
        """
        self.persist_directory = Path(persist_directory or settings.chroma_persist_dir)
        self.collection_name = collection_name
        
        # 确保持久化目录存在
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # 初始化带持久化的 ChromaDB 客户端
        self._client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )
        
        # 获取或创建集合
        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},  # 使用余弦相似度
        )
        
        logger.info(f"向量存储已初始化，位置: {self.persist_directory}")
    
    def add_chunks(
        self,
        chunks: list[TextChunk],
        document_id: str,
    ) -> list[str]:
        """
        将文本块添加到向量存储。
        
        Args:
            chunks: 要添加的 TextChunk 对象列表。
            document_id: 父文档的 ID。
            
        Returns:
            添加到存储的块 ID 列表。
        """
        if not chunks:
            logger.warning("没有块要添加到向量存储")
            return []
        
        # 为 ChromaDB 准备数据
        ids = []
        documents = []
        metadatas = []
        
        for chunk in chunks:
            chunk_id = f"{document_id}_{chunk.chunk_index}"
            ids.append(chunk_id)
            documents.append(chunk.content)
            
            # Store metadata for retrieval
            metadata = {
                "document_id": document_id,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "start_page": chunk.start_page,
                "end_page": chunk.end_page,
            }
            
            # Add bbox if available (as string since ChromaDB has limited metadata types)
            if chunk.bbox:
                metadata["bbox_x0"] = chunk.bbox.get("x0", 0)
                metadata["bbox_y0"] = chunk.bbox.get("y0", 0)
                metadata["bbox_x1"] = chunk.bbox.get("x1", 0)
                metadata["bbox_y1"] = chunk.bbox.get("y1", 0)
            
            if chunk.start_char is not None:
                metadata["start_char"] = chunk.start_char
            if chunk.end_char is not None:
                metadata["end_char"] = chunk.end_char
            
            metadatas.append(metadata)
        
        # 添加到集合（ChromaDB 自动处理嵌入）
        self._collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        
        logger.info(f"为文档 {document_id} 添加了 {len(chunks)} 个块")
        return ids
    
    def search(
        self,
        query: str,
        document_id: Optional[str] = None,
        n_results: int = 5,
    ) -> list[dict]:
        """
        在向量存储中搜索相似的块。
        
        Args:
            query: 搜索查询文本。
            document_id: 可选的文档 ID 过滤。
            n_results: 要返回的结果数量。
            
        Returns:
            包含内容和元数据的搜索结果列表。
        """
        # 构建 where 过滤器
        where_filter = None
        if document_id:
            where_filter = {"document_id": document_id}
        
        # 执行搜索
        results = self._collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
        
        # 格式化结果
        formatted_results = []
        
        if results and results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                result = {
                    "chunk_id": chunk_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    "relevance_score": 1 - (results["distances"][0][i] if results["distances"] else 0),
                }
                
                # Reconstruct bbox from metadata
                metadata = result["metadata"]
                if all(k in metadata for k in ["bbox_x0", "bbox_y0", "bbox_x1", "bbox_y1"]):
                    result["bbox"] = {
                        "x0": metadata["bbox_x0"],
                        "y0": metadata["bbox_y0"],
                        "x1": metadata["bbox_x1"],
                        "y1": metadata["bbox_y1"],
                    }
                
                formatted_results.append(result)
        
        logger.info(f"搜索查询: '{query[:50]}...' 返回 {len(formatted_results)} 个结果")
        return formatted_results
    
    def delete_document(self, document_id: str) -> int:
        """
        从向量存储中删除文档的所有块。
        
        Args:
            document_id: 要删除的文档 ID。
            
        Returns:
            删除的块数量。
        """
        # 获取该文档的所有块 ID
        results = self._collection.get(
            where={"document_id": document_id},
            include=[],
        )
        
        if not results or not results["ids"]:
            logger.info(f"未找到文档 {document_id} 的块")
            return 0
        
        chunk_ids = results["ids"]
        
        # 删除块
        self._collection.delete(ids=chunk_ids)
        
        logger.info(f"已删除文档 {document_id} 的 {len(chunk_ids)} 个块")
        return len(chunk_ids)
    
    def get_document_chunks(
        self,
        document_id: str,
        include_content: bool = True,
    ) -> list[dict]:
        """
        获取文档的所有块。
        
        Args:
            document_id: 文档 ID。
            include_content: 是否包含块内容。
            
        Returns:
            块数据列表。
        """
        include = ["metadatas"]
        if include_content:
            include.append("documents")
        
        results = self._collection.get(
            where={"document_id": document_id},
            include=include,
        )
        
        if not results or not results["ids"]:
            return []
        
        chunks = []
        for i, chunk_id in enumerate(results["ids"]):
            chunk = {
                "chunk_id": chunk_id,
                "metadata": results["metadatas"][i] if results["metadatas"] else {},
            }
            if include_content and results.get("documents"):
                chunk["content"] = results["documents"][i]
            chunks.append(chunk)
        
        return chunks
    
    def get_collection_stats(self) -> dict:
        """
        获取向量存储集合的统计信息。
        
        Returns:
            包含集合统计信息的字典。
        """
        return {
            "name": self.collection_name,
            "count": self._collection.count(),
        }
    
    def reset(self) -> None:
        """通过删除所有数据重置向量存储。"""
        self._client.delete_collection(self.collection_name)
        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("向量存储已重置")


# 全局向量存储实例
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    """
    获取全局向量存储实例。
    
    Returns:
        VectorStore 实例。
    """
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
