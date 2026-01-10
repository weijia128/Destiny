"""
BM25 关键词检索服务
"""
import os
import json
from typing import List, Dict, Optional, Tuple
from loguru import logger

import jieba
from rank_bm25 import BM25Okapi

from ..config import get_settings
from ..models.schemas import SearchResult


class BM25Service:
    """BM25 关键词检索服务"""

    def __init__(self, data_dir: str = None):
        self.settings = get_settings()
        self.data_dir = data_dir or "./data"
        self.bm25_dir = os.path.join(self.data_dir, "bm25")

        # 确保目录存在
        os.makedirs(self.bm25_dir, exist_ok=True)

        # 索引缓存 {collection_key: (corpus, bm25)}
        self._indices: Dict[str, Tuple[List[str], BM25Okapi]] = {}

    def _get_index_path(self, destiny_type: str, category: str) -> str:
        """获取索引文件路径"""
        return os.path.join(
            self.bm25_dir,
            f"{destiny_type}_{category}.json"
        )

    def _get_collection_key(self, destiny_type: str, category: str) -> str:
        """获取集合键"""
        return f"{destiny_type}_{category}"

    def build_index(
        self,
        destiny_type: str,
        category: str,
        documents: List[Dict]
    ):
        """
        构建 BM25 索引

        Args:
            destiny_type: 命理类型
            category: 子分类
            documents: 文档列表 (每项包含 id, content, title 等)
        """
        collection_key = self._get_collection_key(destiny_type, category)

        # 提取内容
        contents = [doc.get("content", "") for doc in documents]
        ids = [doc.get("id", str(i)) for i in range(len(documents))]

        # 中文分词
        tokenized_corpus = [self._tokenize(content) for content in contents]

        # 构建 BM25 索引
        bm25 = BM25Okapi(
            tokenized_corpus,
            k1=self.settings.bm25_k1,
            b=self.settings.bm25_b
        )

        # 保存索引
        index_data = {
            "ids": ids,
            "contents": contents,
            "documents": documents,
        }

        index_path = self._get_index_path(destiny_type, category)
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False)

        # 缓存
        self._indices[collection_key] = (contents, bm25)

        logger.info(
            f"Built BM25 index for {destiny_type}/{category} "
            f"({len(documents)} documents)"
        )

    def search(
        self,
        destiny_type: str,
        category: str,
        query: str,
        n_results: int = 10
    ) -> List[SearchResult]:
        """
        BM25 检索

        Args:
            destiny_type: 命理类型
            category: 子分类
            query: 查询文本
            n_results: 返回数量

        Returns:
            检索结果列表
        """
        collection_key = self._get_collection_key(destiny_type, category)

        # 尝试从缓存加载
        if collection_key not in self._indices:
            self._load_index(destiny_type, category)

        # 再次检查
        if collection_key not in self._indices:
            logger.warning(f"Index not found for {destiny_type}/{category}")
            return []

        contents, bm25 = self._indices[collection_key]

        # 分词查询
        tokenized_query = self._tokenize(query)

        # 执行搜索
        scores = bm25.get_scores(tokenized_query)

        # 获取 top k
        top_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:n_results]

        # 格式化结果
        results = []
        documents = self._get_documents(destiny_type, category)

        for idx in top_indices:
            if scores[idx] > 0:  # 只返回有分数的结果
                doc = documents[idx] if documents else {}
                results.append(SearchResult(
                    id=doc.get("id", str(idx)),
                    content=doc.get("content", ""),
                    score=float(scores[idx]),
                    title=doc.get("title", ""),
                    destiny_type=destiny_type,
                    category=category,
                    level=doc.get("level", "method"),
                    source="bm25"
                ))

        return results

    def _tokenize(self, text: str) -> List[str]:
        """中文分词"""
        return list(jieba.cut(text))

    def _load_index(self, destiny_type: str, category: str):
        """加载索引"""
        collection_key = self._get_collection_key(destiny_type, category)
        index_path = self._get_index_path(destiny_type, category)

        if not os.path.exists(index_path):
            return

        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                index_data = json.load(f)

            contents = index_data.get("contents", [])
            tokenized_corpus = [self._tokenize(c) for c in contents]

            bm25 = BM25Okapi(
                tokenized_corpus,
                k1=self.settings.bm25_k1,
                b=self.settings.bm25_b
            )

            self._indices[collection_key] = (contents, bm25)
            logger.debug(f"Loaded BM25 index: {collection_key}")

        except Exception as e:
            logger.error(f"Error loading index: {e}")

    def _get_documents(self, destiny_type: str, category: str) -> List[Dict]:
        """获取文档数据"""
        collection_key = self._get_collection_key(destiny_type, category)
        index_path = self._get_index_path(destiny_type, category)

        if not os.path.exists(index_path):
            return []

        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                index_data = json.load(f)
            return index_data.get("documents", [])
        except Exception as e:
            logger.error(f"Error getting documents: {e}")
            return []

    def delete_index(self, destiny_type: str, category: str):
        """删除索引"""
        collection_key = self._get_collection_key(destiny_type, category)
        index_path = self._get_index_path(destiny_type, category)

        if collection_key in self._indices:
            del self._indices[collection_key]

        if os.path.exists(index_path):
            os.remove(index_path)
            logger.info(f"Deleted BM25 index: {collection_key}")

    def get_doc_count(self, destiny_type: str, category: str) -> int:
        """获取索引文档数"""
        collection_key = self._get_collection_key(destiny_type, category)
        index_path = self._get_index_path(destiny_type, category)

        if not os.path.exists(index_path):
            return 0

        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                index_data = json.load(f)
            return len(index_data.get("documents", []))
        except Exception:
            return 0


# 单例实例
_bm25_service: BM25Service | None = None


def get_bm25_service() -> BM25Service:
    """获取 BM25 服务单例"""
    global _bm25_service
    if _bm25_service is None:
        _bm25_service = BM25Service()
    return _bm25_service
