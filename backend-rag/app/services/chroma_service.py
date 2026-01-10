"""
Chroma 向量存储服务
"""
import os
from pathlib import Path
from typing import List, Dict, Optional, Any
from loguru import logger

import chromadb
from chromadb.config import Settings

from ..config import get_settings
from ..models.schemas import SearchResult


class ChromaService:
    """Chroma 向量存储服务"""

    def __init__(self, persist_dir: str = None, collection_prefix: str = None):
        self.settings = get_settings()
        self.persist_dir = persist_dir or self.settings.chroma_persist_dir
        self.collection_prefix = collection_prefix or self.settings.chroma_collection_prefix

        # 确保目录存在
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)

        # 初始化客户端
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # 缓存集合
        self._collections: Dict[str, Any] = {}

    def _get_collection_name(self, destiny_type: str, category: str) -> str:
        """获取集合名称"""
        return f"{self.collection_prefix}{destiny_type}_{category}"

    def get_collection(self, destiny_type: str, category: str):
        """获取或创建集合"""
        collection_name = self._get_collection_name(destiny_type, category)

        if collection_name not in self._collections:
            try:
                self._collections[collection_name] = self.client.get_collection(
                    name=collection_name
                )
                logger.debug(f"Loaded existing collection: {collection_name}")
            except ValueError:
                # 集合不存在，创建新集合
                self._collections[collection_name] = self.client.create_collection(
                    name=collection_name,
                    metadata={
                        "destiny_type": destiny_type,
                        "category": category,
                        "description": f"Knowledge base for {destiny_type}/{category}"
                    }
                )
                logger.debug(f"Created new collection: {collection_name}")

        return self._collections[collection_name]

    def add_documents(
        self,
        destiny_type: str,
        category: str,
        documents: List[str],
        embeddings: List[List[float]],
        ids: List[str],
        metadatas: Optional[List[Dict]] = None
    ):
        """
        添加文档到集合

        Args:
            destiny_type: 命理类型
            category: 子分类
            documents: 文档内容列表
            embeddings: 向量列表
            ids: ID 列表
            metadatas: 元数据列表
        """
        collection = self.get_collection(destiny_type, category)

        if metadatas is None:
            metadatas = [{} for _ in range(len(documents))]

        # 添加到 Chroma
        collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )

        logger.info(
            f"Added {len(documents)} documents to "
            f"{destiny_type}/{category}"
        )

    def search(
        self,
        destiny_type: str,
        category: str,
        query: str,
        query_embedding: List[float] = None,
        n_results: int = 10,
        where: Optional[Dict] = None
    ) -> List[SearchResult]:
        """
        向量检索

        Args:
            destiny_type: 命理类型
            category: 子分类
            query: 查询文本
            query_embedding: 查询向量 (可选，如果未提供则使用文本)
            n_results: 返回数量
            where: 过滤条件

        Returns:
            检索结果列表
        """
        collection = self.get_collection(destiny_type, category)

        # 执行查询
        if query_embedding:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where
            )
        else:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where
            )

        # 格式化结果
        search_results = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results.get("distances", [[]])[0][i] if results.get("distances") else None

                # 计算相似度分数 (转换为 0-1)
                score = 1.0 - distance if distance is not None else 0.0

                search_results.append(SearchResult(
                    id=results["ids"][0][i],
                    content=results["documents"][0][i],
                    score=score,
                    title=metadata.get("title", ""),
                    destiny_type=metadata.get("destiny_type", destiny_type),
                    category=metadata.get("category", category),
                    level=metadata.get("level", "method"),
                    source="vector",
                    distance=distance
                ))

        return search_results

    def delete(
        self,
        destiny_type: str,
        category: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict] = None
    ):
        """
        删除文档

        Args:
            destiny_type: 命理类型
            category: 子分类
            ids: 要删除的ID列表
            where: 删除条件
        """
        collection = self.get_collection(destiny_type, category)

        if ids:
            collection.delete(ids=ids)
        elif where:
            collection.delete(where=where)

        logger.info(f"Deleted documents from {destiny_type}/{category}")

    def delete_collection(self, destiny_type: str, category: str):
        """删除整个集合"""
        collection_name = self._get_collection_name(destiny_type, category)

        try:
            self.client.delete_collection(name=collection_name)
            if collection_name in self._collections:
                del self._collections[collection_name]
            logger.info(f"Deleted collection: {collection_name}")
        except ValueError as e:
            logger.warning(f"Collection not found: {collection_name}")

    def count(self, destiny_type: str, category: str) -> int:
        """获取集合中的文档数"""
        collection = self.get_collection(destiny_type, category)
        return collection.count()

    def list_collections(self) -> List[Dict]:
        """列出所有集合"""
        collections = []
        for coll in self.client.list_collections():
            collections.append({
                "name": coll.name,
                "count": coll.count(),
                "metadata": coll.metadata
            })
        return collections

    def reset(self):
        """重置所有集合"""
        self.client.reset()
        self._collections.clear()
        logger.warning("Chroma database reset")

    def get_stats(self) -> Dict[str, Dict[str, int]]:
        """获取统计信息"""
        stats = {}
        try:
            for coll in self.client.list_collections():
                stats[coll.name] = {"count": coll.count()}
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
        return stats


# 单例实例
_chroma_service: ChromaService | None = None


def get_chroma_service() -> ChromaService:
    """获取 Chroma 服务单例"""
    global _chroma_service
    if _chroma_service is None:
        _chroma_service = ChromaService()
    return _chroma_service
