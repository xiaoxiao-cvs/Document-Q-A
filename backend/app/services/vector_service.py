"""
向量服务模块

负责文本向量化、向量存储和语义检索。
支持使用 OpenAI Embedding 或 ChromaDB 默认嵌入。
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
    支持配置 OpenAI Embedding 或使用默认嵌入。
    """
    
    def __init__(self):
        """初始化向量服务"""
        self._client: Optional[chromadb.ClientAPI] = None
        self._collection = None
        self._embedding_function = None
        self._ensure_persist_dir()
    
    def _ensure_persist_dir(self) -> None:
        """确保持久化目录存在"""
        os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
    
    def _get_embedding_function(self):
        """
        获取嵌入函数
        
        如果配置了 OpenAI API Key，使用 OpenAI Embedding；
        否则使用 ChromaDB 默认的嵌入模型。
        """
        if self._embedding_function is None:
            if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_api_key_here":
                try:
                    from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
                    self._embedding_function = OpenAIEmbeddingFunction(
                        api_key=settings.OPENAI_API_KEY,
                        api_base=settings.OPENAI_API_BASE,
                        model_name=settings.EMBEDDING_MODEL
                    )
                    print(f"✓ 使用 OpenAI Embedding 模型: {settings.EMBEDDING_MODEL}")
                except Exception as e:
                    print(f"⚠ OpenAI Embedding 初始化失败，使用默认嵌入: {e}")
                    self._embedding_function = None
            else:
                print("⚠ 未配置 OpenAI API Key，使用 ChromaDB 默认嵌入模型")
        return self._embedding_function
    
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
            embedding_fn = self._get_embedding_function()
            try:
                self._collection = self.client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"},  # 使用余弦相似度
                    embedding_function=embedding_fn
                )
            except Exception as e:
                # 如果出现维度不匹配等错误，删除旧集合并重建
                print(f"⚠ 集合初始化失败，尝试重建: {e}")
                try:
                    self.client.delete_collection(settings.CHROMA_COLLECTION_NAME)
                    print(f"✓ 已删除旧集合 {settings.CHROMA_COLLECTION_NAME}")
                except Exception:
                    pass
                self._collection = self.client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION_NAME,
                    metadata={"hnsw:space": "cosine"},
                    embedding_function=embedding_fn
                )
                print(f"✓ 已重建集合 {settings.CHROMA_COLLECTION_NAME}")
        return self._collection
    
    def reset_collection(self):
        """
        重置集合（删除并重建）
        
        用于处理嵌入模型变更导致的维度不匹配问题。
        """
        try:
            self.client.delete_collection(settings.CHROMA_COLLECTION_NAME)
            print(f"✓ 已删除集合 {settings.CHROMA_COLLECTION_NAME}")
        except Exception as e:
            print(f"⚠ 删除集合失败: {e}")
        
        self._collection = None
        self._embedding_function = None
        # 触发重建
        _ = self.collection
        print(f"✓ 集合已重置")
    
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
    
    def get_first_page_chunks(self, doc_id: int, max_chars: int = 2000) -> Optional[str]:
        """
        获取文档第一页的内容
        
        Args:
            doc_id: 文档ID
            max_chars: 最大字符数限制
            
        Returns:
            Optional[str]: 第一页内容，如果没找到返回 None
        """
        try:
            # 查询该文档第一页的chunks
            results = self.collection.get(
                where={"$and": [
                    {"doc_id": doc_id},
                    {"page": 1}
                ]},
                include=["documents", "metadatas"]
            )
            
            if not results or not results["documents"]:
                # 如果没有第一页标记，尝试获取 chunk_index 最小的
                results = self.collection.get(
                    where={"doc_id": doc_id},
                    include=["documents", "metadatas"]
                )
                
                if not results or not results["documents"]:
                    return None
                
                # 按 chunk_index 排序，取最前面的
                items = list(zip(results["documents"], results["metadatas"]))
                items.sort(key=lambda x: x[1].get("chunk_index", 0))
                
                # 取前几个 chunks 直到达到字符限制
                content_parts = []
                total_chars = 0
                for doc, _ in items:
                    if total_chars + len(doc) > max_chars:
                        break
                    content_parts.append(doc)
                    total_chars += len(doc)
                
                return "\n".join(content_parts) if content_parts else None
            
            # 合并第一页的所有 chunks
            content_parts = []
            total_chars = 0
            
            # 按 chunk_index 排序
            items = list(zip(results["documents"], results["metadatas"]))
            items.sort(key=lambda x: x[1].get("chunk_index", 0))
            
            for doc, _ in items:
                if total_chars + len(doc) > max_chars:
                    break
                content_parts.append(doc)
                total_chars += len(doc)
            
            return "\n".join(content_parts) if content_parts else None
            
        except Exception as e:
            print(f"获取第一页内容失败: {e}")
            return None


# 创建全局服务实例
vector_service = VectorService()
