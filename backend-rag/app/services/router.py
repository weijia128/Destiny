"""
查询路由判断器
根据用户查询判断问题类型、复杂度和涉及实体
"""
import re
from typing import Tuple, List, Dict, Optional
from loguru import logger

from ..config import get_settings
from ..models.enums import QueryType, RetrievalStrategy


class QueryRouter:
    """查询路由 - 判断问题类型和复杂度"""

    def __init__(self):
        self.settings = get_settings()
        self._init_patterns()

    def _init_patterns(self):
        """初始化模式匹配规则"""

        # 问题类型关键词
        self.intent_patterns: Dict[QueryType, List[str]] = {
            QueryType.PALACE_INQUIRY: [
                r"宫.*", r".*宫.*", r"命宫", r"官禄宫", r"财帛宫",
                r"夫妻宫", r"疾厄宫", r"迁移宫", r"仆役宫"
            ],
            QueryType.STAR_INQUIRY: [
                r"星.*", r".*星.*", r"紫微", r"天机", r"太阳",
                r"武曲", r"天同", r"廉贞", r"天府", r"太阴",
                r"贪狼", r"巨门", r"天相", r"天梁", r"七杀", r"破军"
            ],
            QueryType.FORTUNE_QUERY: [
                r"运势", r"财运", r"事业.*", r"财运.*", r"感情.*",
                r"健康.*", r"桃花.*", r"贵人.*", r"小人.*"
            ],
            QueryType.PATTERN_QUERY: [
                r"格局", r"成.*格", r"什么.*格", r".*格.*",
                r"紫府同宫", r"杀破狼格", r"火贪格", r"铃贪格"
            ],
            QueryType.BASIC_CONCEPT: [
                r"什么是.*", r".*是什么", r"解释.*", r"意思.*",
                r"如何.*", r"怎么.*"
            ],
            QueryType.COMPARISON: [
                r".*和.*哪个.*", r".*比较.*", r".*区别.*",
                r".*还是.*", r".*相比.*"
            ],
        }

        # 复杂度判断模式
        self.complex_patterns = [
            r".*比较.*",
            r".*关系.*",
            r".*如何.*影响.*",
            r".*综合.*分析.*",
            r".*未来.*趋势.*",
            r".*和.*哪个.*",
            r".*还是.*",
            r".*原因.*",
            r".*为什么.*",
            r".*应该.*",
            r".*可以.*同时.*",
        ]

        # 命理实体关键词
        self.entity_keywords = self._load_entity_keywords()

    def _load_entity_keywords(self) -> Dict[str, List[str]]:
        """加载命理实体关键词"""
        return {
            # 紫微斗数
            "ziwei_stars": [
                "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
                "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
                "七杀", "破军", "文昌", "文曲", "左辅", "右弼",
                "天魁", "天钺", "禄存", "天马", "火星", "铃星"
            ],
            "ziwei_palaces": [
                "命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫",
                "疾厄宫", "迁移宫", "仆役宫", "官禄宫", "田宅宫",
                "福德宫", "父母宫"
            ],
            "ziwei_transformations": [
                "化禄", "化权", "化科", "化忌"
            ],
            # 八字
            "bazi_elements": [
                "日主", "用神", "喜神", "忌神", "闲神",
                "正官", "七杀", "正财", "偏财", "正印", "偏印",
                "比肩", "劫财", "食神", "伤官"
            ],
            "bazi_concepts": [
                "身强", "身弱", "从格", "化格", "调候", "通关"
            ],
            # 共通概念
            "shared_concepts": [
                "五行", "金", "木", "水", "火", "土",
                "天干", "地支", "阴阳", "干支", "六合", "三合",
                "大运", "流年", "太岁", "岁运"
            ],
            # 奇门
            "qimen_elements": [
                "九星", "八门", "八神", "值符", "值使",
                "天蓬", "天任", "天冲", "天辅", "天英", "天芮",
                "天柱", "天心", "开门", "休门", "生门", "伤门",
                "杜门", "景门", "死门", "惊门"
            ],
        }

    def classify(self, query: str) -> Tuple[QueryType, bool, List[str]]:
        """
        分类查询

        返回: (问题类型, 是否复杂, 涉及实体)
        """
        # 1. 判断问题类型
        query_type = self._detect_intent(query)

        # 2. 判断复杂度
        is_complex = self._is_complex(query)

        # 3. 提取涉及实体
        entities = self._extract_entities(query)

        logger.debug(
            f"Query classification: type={query_type}, "
            f"complex={is_complex}, entities={entities}"
        )

        return query_type, is_complex, entities

    def _detect_intent(self, query: str) -> QueryType:
        """检测问题意图"""
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query):
                    return intent
        return QueryType.GENERAL

    def _is_complex(self, query: str) -> bool:
        """判断是否为复杂问题"""

        # 1. 模式匹配
        for pattern in self.complex_patterns:
            if re.search(pattern, query):
                logger.debug(f"Complex query detected by pattern: {pattern}")
                return True

        # 2. 长度阈值
        if len(query) > self.settings.complex_query_length_threshold:
            logger.debug(
                f"Complex query by length: {len(query)} > "
                f"{self.settings.complex_query_length_threshold}"
            )
            return True

        # 3. 多个实体 (后续通过 _extract_entities 判断)
        return False

    def _extract_entities(self, query: str) -> List[str]:
        """提取命理实体"""
        entities = []

        # 合并所有实体关键词
        all_keywords = []
        for keyword_list in self.entity_keywords.values():
            all_keywords.extend(keyword_list)

        # 精确匹配
        for entity in all_keywords:
            if entity in query:
                entities.append(entity)

        # 去重并保持顺序
        unique_entities = []
        seen = set()
        for entity in entities:
            if entity not in seen:
                unique_entities.append(entity)
                seen.add(entity)

        # 判断复杂度 - 多实体
        if len(unique_entities) > self.settings.complex_entity_threshold:
            logger.debug(
                f"Complex query by entities: {len(unique_entities)} > "
                f"{self.settings.complex_entity_threshold}"
            )
            # 更新复杂度标记
            self._mark_complex()

        return unique_entities

    def _mark_complex(self):
        """标记为复杂查询 (副作用方法)"""
        # 复杂度由 classify 返回，这里只是辅助方法
        pass

    def get_entity_types(self, entities: List[str]) -> List[str]:
        """获取实体所属类型"""
        types = []

        for entity in entities:
            for category, keywords in self.entity_keywords.items():
                if entity in keywords:
                    types.append(category)
                    break

        return list(set(types))

    def should_use_cross_type(self, query: str, entities: List[str]) -> bool:
        """判断是否需要跨类型检索"""
        # 检查是否涉及共通概念
        shared_concepts = self.settings.shared_concepts_list

        for concept in shared_concepts:
            if concept in query:
                logger.debug(f"Cross-type needed for shared concept: {concept}")
                return True

        # 检查实体是否涉及多个命理类型
        entity_types = self.get_entity_types(entities)

        if len(entity_types) > 1:
            logger.debug(f"Cross-type needed: {entity_types}")
            return True

        return False


# 单例实例
_query_router: Optional[QueryRouter] = None


def get_query_router() -> QueryRouter:
    """获取查询路由器单例"""
    global _query_router
    if _query_router is None:
        _query_router = QueryRouter()
    return _query_router
