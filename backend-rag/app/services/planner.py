"""
检索策略规划器
根据查询特征选择最优检索策略
"""
from typing import List
from loguru import logger

from ..config import get_settings, RETRIEVAL_STRATEGIES
from ..models.enums import RetrievalStrategy, QueryType
from ..services.router import get_query_router


class RetrievalPlanner:
    """检索策略规划器"""

    def __init__(self):
        self.settings = get_settings()
        self.router = get_query_router()

    def plan(
        self,
        query: str,
        query_type: QueryType,
        is_complex: bool,
        entities: List[str],
        current_type: str = "ziwei",
        enable_cross_type: bool = None
    ) -> RetrievalStrategy:
        """
        根据查询特征规划检索策略

        Args:
            query: 用户查询
            query_type: 查询类型
            is_complex: 是否复杂问题
            entities: 涉及实体
            current_type: 当前命理类型
            enable_cross_type: 是否启用跨类型检索

        Returns:
            检索策略
        """
        if enable_cross_type is None:
            enable_cross_type = self.settings.enable_cross_type

        # 策略1: 需要跨类型检索
        if enable_cross_type and self.router.should_use_cross_type(query, entities):
            logger.info("Strategy: CROSS_TYPE (shared concepts detected)")
            return RetrievalStrategy.CROSS_TYPE

        # 策略2: 复杂问题 + 多实体 → GraphRAG 全局检索
        if is_complex and len(entities) > 2:
            logger.info("Strategy: GRAPH_GLOBAL (complex query with multiple entities)")
            return RetrievalStrategy.GRAPH_GLOBAL

        # 策略3: 关系推断需求 → GraphRAG 局部检索
        if self._involves_relation_inference(query, entities):
            logger.info("Strategy: GRAPH_LOCAL (relation inference needed)")
            return RetrievalStrategy.GRAPH_LOCAL

        # 策略4: 对比/比较类问题 → GraphRAG 局部检索
        if query_type == QueryType.COMPARISON:
            logger.info("Strategy: GRAPH_LOCAL (comparison query)")
            return RetrievalStrategy.GRAPH_LOCAL

        # 策略5: 格局分析 → GraphRAG 局部检索
        if query_type == QueryType.PATTERN_QUERY:
            logger.info("Strategy: GRAPH_LOCAL (pattern analysis)")
            return RetrievalStrategy.GRAPH_LOCAL

        # 策略6: 基础概念查询 → 混合向量检索 (简单直接)
        if query_type == QueryType.BASIC_CONCEPT:
            logger.info("Strategy: HYBRID_VECTOR (basic concept query)")
            return RetrievalStrategy.HYBRID_VECTOR

        # 默认: 向量混合检索
        logger.info("Strategy: HYBRID_VECTOR (default)")
        return RetrievalStrategy.HYBRID_VECTOR

    def _involves_relation_inference(
        self,
        query: str,
        entities: List[str]
    ) -> bool:
        """是否涉及关系推断"""
        relation_patterns = [
            r".*在.*宫",
            r".*与.*关系",
            r".*影响.*",
            r".*配合.*",
            r".*组合.*",
            r".*同时.*",
            r".*一起.*",
            r".*配.*",
        ]

        # 多实体通常需要关系推断
        if len(entities) > 1:
            for pattern in relation_patterns:
                if pattern in query:
                    return True

        # 检查特定实体组合
        if self._is_entity_combination(entities):
            return True

        return False

    def _is_entity_combination(self, entities: List[str]) -> bool:
        """是否涉及特定实体组合"""
        # 紫微斗数特定组合
        ziwei_combinations = [
            ["紫微", "天府"],
            ["紫微", "天机"],
            ["太阳", "太阴"],
            ["武曲", "贪狼"],
            ["廉贞", "七杀"],
            ["命宫", "官禄宫"],
            ["命宫", "财帛宫"],
        ]

        for combo in ziwei_combinations:
            if all(e in entities for e in combo):
                return True

        return False

    def get_strategy_config(self, strategy: RetrievalStrategy) -> dict:
        """获取策略配置"""
        return RETRIEVAL_STRATEGIES.get(strategy.value, {})

    def estimate_cost(self, strategy: RetrievalStrategy) -> dict:
        """
        估算检索成本

        Returns:
            成本估算 (API调用次数、耗时等级)
        """
        config = self.get_strategy_config(strategy)

        costs = {
            RetrievalStrategy.HYBRID_VECTOR: {
                "embedding_calls": 1,
                "reranker_calls": 1,
                "time_level": "fast",
                "description": "向量检索 + BM25 + 重排序"
            },
            RetrievalStrategy.GRAPH_LOCAL: {
                "embedding_calls": 1,
                "graph_calls": 1,
                "reranker_calls": 1,
                "time_level": "medium",
                "description": "图谱局部检索 + 重排序"
            },
            RetrievalStrategy.GRAPH_GLOBAL: {
                "embedding_calls": 1,
                "graph_calls": 2,
                "reranker_calls": 1,
                "time_level": "slow",
                "description": "图谱全局检索 + 局部细化"
            },
            RetrievalStrategy.CROSS_TYPE: {
                "embedding_calls": 2,
                "reranker_calls": 1,
                "time_level": "medium",
                "description": "跨类型检索 + 结果融合"
            },
        }

        return costs.get(strategy, {"error": "Unknown strategy"})


# 单例实例
_planner: RetrievalPlanner | None = None


def get_retrieval_planner() -> RetrievalPlanner:
    """获取检索规划器单例"""
    global _planner
    if _planner is None:
        _planner = RetrievalPlanner()
    return _planner
