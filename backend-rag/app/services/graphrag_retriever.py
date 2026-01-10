"""
GraphRAG 检索器
基于知识图谱的检索，支持局部和全局检索

功能:
1. 从文档中提取实体和关系
2. 构建知识图谱
3. 支持局部检索（实体邻居）和全局检索（社区摘要）
"""
import json
import hashlib
from typing import List, Dict, Optional, Tuple, Any
from pathlib import Path
from loguru import logger

from openai import AsyncOpenAI

from ..config import get_settings
from ..models.enums import RetrievalStrategy
from ..models.schemas import SearchResult
from ..services.chroma_service import get_chroma_service
from ..services.embedding_service import get_embedding_service


# 实体类型定义
ENTITY_TYPES = {
    # 紫微斗数
    "星曜": ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"],
    "宫位": ["命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫", "迁移宫", "仆役宫", "官禄宫", "田宅宫", "福德宫", "父母宫"],
    "四化": ["化禄", "化权", "化科", "化忌"],
    "格局": ["紫府同宫格", "杀破狼格", "火贪格", "铃贪格", "府相朝垣格", "日丽中天格"],

    # 八字命理
    "十神": ["正官", "七杀", "正财", "偏财", "正印", "偏印", "比肩", "劫财", "食神", "伤官"],
    "用神": ["用神", "喜神", "忌神", "调候"],

    # 通用
    "五行": ["金", "木", "水", "火", "土"],
    "天干": ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    "地支": ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
}


class GraphRAGRetriever:
    """GraphRAG 检索器 - 完整版"""

    def __init__(self):
        self.settings = get_settings()
        self.chroma = get_chroma_service()
        self.embedding = get_embedding_service()

        # 图谱存储目录
        self.graph_dir = Path("./data/graph")
        self.graph_dir.mkdir(parents=True, exist_ok=True)

        # LLM 客户端 (用于实体提取)
        self.llm_client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            base_url=self.settings.openai_base_url,
        )

        # 实体索引缓存: {entity_name: [doc_ids]}
        self._entity_index: Dict[str, List[str]] = {}

    # ==================== 图谱构建 ====================

    async def build_graph_from_documents(
        self,
        destiny_type: str,
        category: str,
        documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        从文档中提取实体和关系，构建知识图谱

        Args:
            destiny_type: 命理类型
            category: 子分类
            documents: 文档列表

        Returns:
            构建统计信息
        """
        logger.info(f"Building graph for {destiny_type}/{category}, {len(documents)} documents")

        all_entities = []
        all_relations = []
        doc_mapping = {}  # doc_id -> entity_names

        for doc in documents:
            doc_id = doc.get("id", "")
            content = doc.get("content", "")
            title = doc.get("title", "")

            if not content:
                continue

            # 提取实体和关系
            entities, relations = await self._extract_entities_relations(
                content, title, doc_id
            )

            all_entities.extend(entities)
            all_relations.extend(relations)

            if entities:
                doc_mapping[doc_id] = list(set(e["name"] for e in entities))

        # 去重实体
        unique_entities = self._dedup_entities(all_entities)

        # 保存图谱
        await self._save_graph(destiny_type, category, unique_entities, all_relations)

        # 更新实体索引
        self._update_entity_index(unique_entities, doc_mapping)

        # 生成社区摘要（如果有足够的实体）
        if len(unique_entities) >= 5:
            await self._generate_community_summary(destiny_type, category, unique_entities)

        logger.info(
            f"Graph built: {len(unique_entities)} entities, "
            f"{len(all_relations)} relations, "
            f"{len(doc_mapping)} documents"
        )

        return {
            "entities": len(unique_entities),
            "relations": len(all_relations),
            "documents": len(doc_mapping)
        }

    async def _extract_entities_relations(
        self,
        content: str,
        title: str,
        doc_id: str
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        使用 LLM 从文本中提取实体和关系

        提示词设计：
        - 实体：命名实体 + 类型 + 属性
        - 关系：实体之间的关系 + 关系类型
        """
        # 1. 先用规则快速提取已知实体
        rule_entities = self._extract_known_entities(content)

        # 2. 用 LLM 提取未知实体和所有关系
        try:
            llm_result = await self._llm_extract_entities_relations(content, title, doc_id)
            llm_entities = llm_result["entities"]
            llm_relations = llm_result["relations"]
        except Exception as e:
            logger.warning(f"LLM extraction failed, using rule-based only: {e}")
            llm_entities = []
            llm_relations = []

        # 3. 合并结果
        entities = rule_entities + llm_entities

        # 4. 为每个实体添加来源
        for entity in entities:
            entity["doc_id"] = doc_id
            entity["source"] = title

        # 5. 过滤掉太短或重复的实体
        entities = [e for e in entities if len(e.get("name", "")) >= 2]
        entities = self._dedup_entities(entities)

        return entities, llm_relations

    def _extract_known_entities(self, content: str) -> List[Dict]:
        """用规则快速提取已知实体"""
        entities = []
        content_lower = content.lower()

        for entity_type, keywords in ENTITY_TYPES.items():
            for keyword in keywords:
                if keyword in content:
                    entities.append({
                        "name": keyword,
                        "type": entity_type,
                        "method": "rule"
                    })

        return entities

    async def _llm_extract_entities_relations(
        self,
        content: str,
        title: str,
        doc_id: str
    ) -> Dict[str, Any]:
        """调用 LLM 提取实体和关系"""

        prompt = f"""从以下命理知识文档中提取实体和关系。

文档标题: {title}
文档内容:
{content[:3000]}

请以 JSON 格式返回结果：

{{
  "entities": [
    {{"name": "实体名", "type": "实体类型", "description": "简要描述"}}
  ],
  "relations": [
    {{"source": "源实体", "target": "目标实体", "type": "关系类型", "description": "关系描述"}}
  ]
}}

实体类型可选：星曜, 宫位, 四化, 格局, 十神, 用神, 五行, 天干, 地支, 概念, 其他
关系类型可选：属, 位于, 同宫, 相生, 相克, 组成, 包含, 影响, 增强, 削弱, 相关

只返回 JSON，不要其他内容。"""

        response = await self.llm_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000
        )

        import json as json_lib
        result_text = response.choices[0].message.content

        # 清理可能的 markdown 格式
        result_text = result_text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        try:
            result = json_lib.loads(result_text)
            return {
                "entities": result.get("entities", []),
                "relations": result.get("relations", [])
            }
        except json_lib.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return {"entities": [], "relations": []}

    def _dedup_entities(self, entities: List[Dict]) -> List[Dict]:
        """去重实体"""
        seen = {}
        result = []

        for entity in entities:
            key = entity.get("name", "")
            if key and key not in seen:
                seen[key] = True
                result.append(entity)

        return result

    async def _save_graph(
        self,
        destiny_type: str,
        category: str,
        entities: List[Dict],
        relations: List[Dict]
    ):
        """保存图谱到文件"""
        graph_file = self.graph_dir / f"{destiny_type}_{category}_graph.json"

        graph_data = {
            "destiny_type": destiny_type,
            "category": category,
            "entities": entities,
            "relations": relations,
            "updated_at": str(Path(__file__).stat().st_mtime) if False else ""
        }

        with open(graph_file, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, ensure_ascii=False, indent=2)

        logger.debug(f"Saved graph to {graph_file}")

    def _update_entity_index(
        self,
        entities: List[Dict],
        doc_mapping: Dict[str, List[str]]
    ):
        """更新实体索引"""
        for entity in entities:
            entity_name = entity.get("name", "")
            for doc_id, entity_names in doc_mapping.items():
                if entity_name in entity_names:
                    if entity_name not in self._entity_index:
                        self._entity_index[entity_name] = []
                    if doc_id not in self._entity_index[entity_name]:
                        self._entity_index[entity_name].append(doc_id)

    async def _generate_community_summary(
        self,
        destiny_type: str,
        category: str,
        entities: List[Dict]
    ):
        """生成社区摘要"""
        # 简单聚类：根据实体类型分组
        communities = {}
        for entity in entities:
            entity_type = entity.get("type", "其他")
            if entity_type not in communities:
                communities[entity_type] = []
            communities[entity_type].append(entity.get("name", ""))

        # 生成摘要
        summaries = []
        for entity_type, names in communities.items():
            summary = f"{entity_type}相关实体: {', '.join(names[:10])}"
            summaries.append({
                "id": f"{destiny_type}_{category}_{entity_type}",
                "type": entity_type,
                "entities": names,
                "summary": summary
            })

        # 保存
        summary_file = self.graph_dir / f"{destiny_type}_{category}_communities.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summaries, f, ensure_ascii=False, indent=2)

        logger.debug(f"Generated {len(summaries)} community summaries")

    # ==================== 检索 ====================

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
        GraphRAG 检索

        Args:
            query: 查询文本
            strategy: 检索策略 (GRAPH_LOCAL 或 GRAPH_GLOBAL)
            destiny_types: 命理类型列表
            categories: 子分类列表
            top_k: 返回数量
            entities: 涉及实体

        Returns:
            检索结果列表
        """
        if strategy == RetrievalStrategy.GRAPH_GLOBAL:
            return await self._global_search(query, destiny_types, categories, top_k, entities)
        else:
            return await self._local_search(query, destiny_types, categories, top_k, entities)

    async def _local_search(
        self,
        query: str,
        destiny_types: List[str],
        categories: Optional[List[str]] = None,
        top_k: int = 10,
        entities: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        局部检索 - 基于实体的邻居检索

        流程:
        1. 提取查询中的实体
        2. 查找实体的邻居节点
        3. 检索相关内容
        """
        # 如果没有提供实体，尝试从查询中提取
        if not entities:
            entities = self._extract_entities_from_query(query)

        # 如果还是没有实体，降级到向量检索
        if not entities:
            logger.debug("No entities found, falling back to vector search")
            return await self._fallback_to_vector(query, destiny_types, categories, top_k)

        all_results = []

        for entity in entities:
            # 查找实体的关联内容
            entity_results = await self._search_entity_neighbors(
                entity, destiny_types, categories, top_k
            )
            all_results.extend(entity_results)

        # 去重并排序
        merged = self._merge_results(all_results)

        return merged[:top_k]

    async def _global_search(
        self,
        query: str,
        destiny_types: List[str],
        categories: Optional[List[str]] = None,
        top_k: int = 5,
        entities: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        全局检索 - 基于社区摘要的检索

        流程:
        1. 将查询与社区摘要进行匹配
        2. 找到最相关的社区
        3. 返回社区内的所有相关内容
        """
        # 查询向量化
        query_embedding = self.embedding.encode_single(query)

        all_results = []

        for dt in destiny_types:
            # 获取该类型的社区摘要
            community_summaries = self._get_community_summaries(dt)

            # 匹配最相关的社区
            relevant_communities = self._match_communities(
                query, query_embedding, community_summaries, top_k=3
            )

            # 检索相关社区的内容
            for community_id in relevant_communities:
                community_results = self._search_community(
                    dt, community_id, query, query_embedding, top_k
                )
                all_results.extend(community_results)

        # 排序
        all_results.sort(key=lambda x: x.score, reverse=True)

        return all_results[:top_k]

    def _extract_entities_from_query(self, query: str) -> List[str]:
        """从查询中提取实体"""
        entities = []

        # 紫微斗数实体
        ziwei_entities = [
            "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
            "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
            "七杀", "破军", "命宫", "官禄宫", "财帛宫",
            "夫妻宫", "化禄", "化权", "化科", "化忌"
        ]

        # 八字实体
        bazi_entities = [
            "日主", "用神", "喜神", "忌神", "正官", "七杀",
            "正财", "偏财", "正印", "偏印", "身强", "身弱"
        ]

        all_entities = ziwei_entities + bazi_entities

        for entity in all_entities:
            if entity in query:
                entities.append(entity)

        return list(set(entities))

    async def _search_entity_neighbors(
        self,
        entity: str,
        destiny_types: List[str],
        categories: Optional[List[str]],
        top_k: int
    ) -> List[SearchResult]:
        """搜索实体的邻居节点"""
        results = []

        # 1. 检索包含该实体的文档
        query_embedding = self.embedding.encode_single(entity)

        for dt in destiny_types:
            cats = categories if categories else self._get_all_categories(dt)

            for cat in cats:
                # 在元数据中搜索 (Chroma 不直接支持这种搜索)
                # 降级：使用实体作为查询词
                cat_results = self.chroma.search(
                    destiny_type=dt,
                    category=cat,
                    query=entity,
                    query_embedding=query_embedding,
                    n_results=top_k
                )
                results.extend(cat_results)

        return results

    def _match_communities(
        self,
        query: str,
        query_embedding: List[float],
        community_summaries: List[Dict],
        top_k: int = 3
    ) -> List[str]:
        """匹配最相关的社区"""
        # 简化：基于社区摘要的标题和描述匹配
        relevant = []

        for community in community_summaries:
            summary = community.get("summary", "")
            title = community.get("title", "")

            # 简单的关键词匹配
            score = 0
            query_words = set(query)
            content_words = set(summary + title)

            overlap = query_words & content_words
            score = len(overlap) / max(len(query_words), 1)

            if score > 0:
                relevant.append((community.get("id"), score))

        # 排序并返回 top_k
        relevant.sort(key=lambda x: x[1], reverse=True)

        return [c[0] for c in relevant[:top_k]]

    def _search_community(
        self,
        destiny_type: str,
        community_id: str,
        query: str,
        query_embedding: List[float],
        top_k: int
    ) -> List[SearchResult]:
        """搜索社区内的内容"""
        # 获取社区内的文档
        results = self.chroma.search(
            destiny_type=destiny_type,
            category="general",  # 简化：使用 general 分类
            query=query,
            query_embedding=query_embedding,
            n_results=top_k
        )

        return results

    def _get_community_summaries(self, destiny_type: str) -> List[Dict]:
        """获取社区摘要"""
        summary_file = self.graph_dir / f"{destiny_type}_communities.json"

        if not summary_file.exists():
            return []

        try:
            with open(summary_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading community summaries: {e}")
            return []

    def _merge_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """合并去重结果"""
        seen = {}
        merged = []

        for r in results:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            if key not in seen:
                seen[key] = True
                merged.append(r)

        # 按分数排序
        merged.sort(key=lambda x: x.score, reverse=True)

        return merged

    async def _fallback_to_vector(
        self,
        query: str,
        destiny_types: List[str],
        categories: Optional[List[str]],
        top_k: int
    ) -> List[SearchResult]:
        """降级到向量检索"""
        from ..services.hybrid_retriever import get_hybrid_retriever

        hybrid = get_hybrid_retriever()
        return await hybrid.search(
            query=query,
            destiny_types=destiny_types,
            categories=categories,
            top_k=top_k
        )

    def _get_all_categories(self, destiny_type: str) -> List[str]:
        """获取所有分类"""
        categories = {
            "shared": ["basic"],
            "ziwei": ["palace", "star", "transformation", "fortune", "pattern"],
            "bazi": ["structure", "yongshen", "ten_gods", "dayun"],
            "qimen": ["nine_star", "eight_door", "eight_god", "formation"],
            "liuyao": ["gua", "liuyao_yongshen", "shiyin"],
            "shouxiang": ["palm", "finger", "mount", "line"],
        }
        return categories.get(destiny_type, ["general"])


# 单例实例
_graphrag_retriever: GraphRAGRetriever | None = None


def get_graphrag_retriever() -> GraphRAGRetriever:
    """获取 GraphRAG 检索器单例"""
    global _graphrag_retriever
    if _graphrag_retriever is None:
        _graphrag_retriever = GraphRAGRetriever()
    return _graphrag_retriever
