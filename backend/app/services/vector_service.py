"""
向量服务模块

负责文本向量化、向量存储和语义检索。
"""
import os
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings


class VectorService:
    """
    向量服务类
    
    使用 ChromaDB 进行向量存储和检索。
    """
    
    def __init__(self):
        """初始化向量服务"""
        self._client: Optional[chromadb.ClientAPI] = None
        self._collection = None
        self._ensure_persist_dir()
    
    def _ensure_persist_dir(self) -> None:
        """确保持久化目录存在"""
        os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    
    @property
    def client(self) -> chromadb.ClientAPI:
        """
        获取 ChromaDB 客户端（懒加载）
        
        Returns:
            chromadb.ClientAPI: ChromaDB 客户端实例
        """
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIRECTORY
            )
        return self._client
    
    @property
    def collection(self):
        """
        获取文档集合（懒加载）
        
        Returns:
            Collection: ChromaDB 集合实例
        """
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}  # 使用余弦相似度
            )
        return self._collection
    
    def add_documents(
        self, 
        doc_id: int, 
        chunks: List[dict]
    ) -> int:
        """
        添加文档切片到向量数据库
        
        Args:
            doc_id: 文档ID
            chunks: 切片列表，每个切片包含 content 和 metadata
            
        Returns:
            int: 成功添加的切片数量
        """
        if not chunks:
            return 0
        
        # 准备数据
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        documents = [chunk["content"] for chunk in chunks]
        metadatas = [
            {
                "doc_id": doc_id,
                "page": chunk["metadata"].get("page", 1),
                "chunk_index": i
            }
            for i, chunk in enumerate(chunks)
        ]
        
        # 添加到集合
        # ChromaDB 会自动使用默认的嵌入模型进行向量化
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        
        return len(chunks)
    
    def search(
        self, 
        query: str, 
        doc_id: Optional[int] = None,
        top_k: Optional[int] = None
    ) -> List[dict]:
        """
        语义搜索相关文档片段
        
        Args:
            query: 查询文本
            doc_id: 限定搜索的文档ID（可选）
            top_k: 返回的结果数量
            
        Returns:
            List[dict]: 搜索结果列表，包含 content, page, score 等信息
        """
        top_k = top_k or settings.TOP_K_RESULTS
        
        # 构建过滤条件
        where_filter = None
        if doc_id is not None:
            where_filter = {"doc_id": doc_id}
        
        # 执行查询
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter
        )
        
        # 格式化结果
        search_results = []
        if results and results["documents"] and results["documents"][0]:
            documents = results["documents"][0]
            metadatas = results["metadatas"][0] if results["metadatas"] else [{}] * len(documents)
            distances = results["distances"][0] if results["distances"] else [0] * len(documents)
            
            for doc, meta, dist in zip(documents, metadatas, distances):
                search_results.append({
                    "content": doc,
                    "page": meta.get("page", 1),
                    "doc_id": meta.get("doc_id"),
                    "score": 1 - dist  # 将距离转换为相似度分数
                })
        
        return search_results
    
    def delete_document_vectors(self, doc_id: int) -> bool:
        """
        删除指定文档的所有向量
        
        Args:
            doc_id: 文档ID
            
        Returns:
            bool: 是否删除成功
        """
        try:
            # 获取该文档的所有切片ID
            results = self.collection.get(
                where={"doc_id": doc_id}
            )
            
            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])
            
            return True
        except Exception:
            return False
    
    def get_collection_stats(self) -> dict:
        """
        获取集合统计信息
        
        Returns:
            dict: 包含集合大小等统计信息
        """
        return {
            "collection_name": settings.CHROMA_COLLECTION_NAME,
            "count": self.collection.count()
        }


# 创建全局服务实例
vector_service = VectorService()
