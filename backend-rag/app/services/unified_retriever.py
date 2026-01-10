"""
统一检索接口
整合所有检索策略
"""
from typing import List, Optional
from loguru import logger

from ..config import get_settings
from ..models.enums import RetrievalStrategy
from ..models.schemas import SearchResult
from ..services.hybrid_retriever import get_hybrid_retriever
from ..services.graphrag_retriever import get_graphrag_retriever
from ..services.cross_type_retriever import get_cross_type_retriever


class UnifiedRetriever:
    """统一检索接口"""

    def __init__(self):
        self.settings = get_settings()
        self.hybrid = get_hybrid_retriever()
        self.graphrag = get_graphrag_retriever()
        self.cross_type = get_cross_type_retriever()

    async def search(
        self,
        query: str,
        strategy: RetrievalStrategy,
        destiny_types: List[str],
        categories: Optional[List[str]] = None,
        top_k: int = 10,
        entities: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        统一检索接口

        Args:
            query: 查询文本
            strategy: 检索策略
            destiny_types: 命理类型列表
            categories: 子分类列表
            top_k: 返回数量
            entities: 涉及实体

        Returns:
            检索结果列表
        """
        logger.debug(f"Unified search with strategy: {strategy}")

        if strategy == RetrievalStrategy.HYBRID_VECTOR:
            return await self.hybrid.search(
                query=query,
                destiny_types=destiny_types,
                categories=categories,
                top_k=top_k
            )

        elif strategy == RetrievalStrategy.GRAPH_LOCAL:
            return await self.graphrag.search(
                query=query,
                strategy=strategy,
                destiny_types=destiny_types,
                categories=categories,
                top_k=top_k,
                entities=entities
            )

        elif strategy == RetrievalStrategy.GRAPH_GLOBAL:
            return await self.graphrag.search(
                query=query,
                strategy=strategy,
                destiny_types=destiny_types,
                categories=categories,
                top_k=top_k,
                entities=entities
            )

        elif strategy == RetrievalStrategy.CROSS_TYPE:
            # 使用当前类型作为主类型
            main_type = destiny_types[0] if destiny_types else "ziwei"
            return await self.cross_type.search(
                query=query,
                current_type=main_type,
                target_types=destiny_types,
                top_k=top_k
            )

        else:
            # 默认使用混合检索
            logger.warning(f"Unknown strategy: {strategy}, falling back to hybrid")
            return await self.hybrid.search(
                query=query,
                destiny_types=destiny_types,
                categories=categories,
                top_k=top_k
            )

    async def index(
        self,
        destiny_type: str,
        category: str,
        documents: List[dict]
    ):
        """索引文档"""
        await self.hybrid.index_documents(
            destiny_type=destiny_type,
            category=category,
            documents=documents
        )

    def get_stats(self) -> dict:
        """获取检索统计"""
        return {
            "hybrid": self.hybrid.chroma.get_stats(),
        }


# 单例实例
_unified_retriever: UnifiedRetriever | None = None


def get_unified_retriever() -> UnifiedRetriever:
    """获取统一检索器单例"""
    global _unified_retriever
    if _unified_retriever is None:
        _unified_retriever = UnifiedRetriever()
    return _unified_retriever
