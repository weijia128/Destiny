"""
跨类型检索器
处理涉及多个命理类型的查询
"""
from typing import List, Optional
from loguru import logger

from ..config import get_settings
from ..models.enums import RetrievalStrategy
from ..models.schemas import SearchResult
from ..services.chroma_service import get_chroma_service
from ..services.hybrid_retriever import get_hybrid_retriever


class CrossTypeRetriever:
    """跨类型检索器"""

    def __init__(self):
        self.settings = get_settings()
        self.chroma = get_chroma_service()
        self.hybrid = get_hybrid_retriever()
        self.shared_weight = 0.8  # 共通知识权重降低

    async def search(
        self,
        query: str,
        current_type: str,
        target_types: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[SearchResult]:
        """
        跨类型检索

        Args:
            query: 查询文本
            current_type: 当前命理类型
            target_types: 目标类型列表 (None 表示所有类型)
            top_k: 返回数量

        Returns:
            检索结果列表
        """
        if target_types is None:
            target_types = self._get_all_types()

        # 1. 检索当前类型
        current_results = await self.hybrid.search(
            query=query,
            destiny_types=[current_type],
            top_k=top_k
        )

        # 2. 检索共通知识
        shared_results = await self.hybrid.search(
            query=query,
            destiny_types=["shared"],
            top_k=3
        )

        # 3. 检索其他相关类型
        other_types = [t for t in target_types if t not in [current_type, "shared"]]
        other_results = []
        for ot in other_types[:2]:  # 最多检索2个其他类型
            ot_results = await self.hybrid.search(
                query=query,
                destiny_types=[ot],
                top_k=3
            )
            other_results.extend(ot_results)

        # 4. 合并结果，调整权重
        combined = self._merge_with_adjusted_weights(
            current=current_results,
            shared=shared_results,
            others=other_results
        )

        return combined[:top_k]

    def _merge_with_adjusted_weights(
        self,
        current: List[SearchResult],
        shared: List[SearchResult],
        others: List[SearchResult]
    ) -> List[SearchResult]:
        """合并结果并调整权重"""
        result_map = {}

        # 当前类型结果
        for r in current:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            result_map[key] = r

        # 共通知识结果 (降低权重)
        for r in shared:
            key = f"shared:{r.category}:{r.id}"
            adjusted = SearchResult(
                id=r.id,
                content=r.content,
                score=r.score * self.shared_weight,
                title=r.title,
                destiny_type="shared",
                category=r.category,
                level=r.level,
                source="shared_vector",
                distance=r.distance
            )
            if key not in result_map:
                result_map[key] = adjusted

        # 其他类型结果 (中等权重)
        other_weight = 0.6
        for r in others:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            if key not in result_map:
                adjusted = SearchResult(
                    id=r.id,
                    content=r.content,
                    score=r.score * other_weight,
                    title=r.title,
                    destiny_type=r.destiny_type,
                    category=r.category,
                    level=r.level,
                    source="cross_vector",
                    distance=r.distance
                )
                result_map[key] = adjusted

        # 排序
        results = list(result_map.values())
        results.sort(key=lambda x: x.score, reverse=True)

        return results

    def _get_all_types(self) -> List[str]:
        """获取所有命理类型"""
        return [
            "shared", "ziwei", "bazi", "qimen", "liuyao", "shouxiang"
        ]

    def _is_shared_concept(self, query: str) -> bool:
        """判断是否涉及共通概念"""
        shared_concepts = self.settings.shared_concepts_list

        for concept in shared_concepts:
            if concept in query:
                return True

        return False


# 单例实例
_cross_type_retriever: CrossTypeRetriever | None = None


def get_cross_type_retriever() -> CrossTypeRetriever:
    """获取跨类型检索器单例"""
    global _cross_type_retriever
    if _cross_type_retriever is None:
        _cross_type_retriever = CrossTypeRetriever()
    return _cross_type_retriever
