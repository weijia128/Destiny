"""
统一 RAG 引擎
整合路由、检索、LLM 生成的完整流程
"""
import time
from typing import List, Dict, Optional, Any
from loguru import logger

from openai import AsyncOpenAI

from ..config import get_settings
from ..models.enums import RetrievalStrategy, QueryType
from ..models.schemas import (
    SearchResult, RAGRequest, RAGResponse, KnowledgeEntry
)
from ..services.router import get_query_router
from ..services.planner import get_retrieval_planner
from ..services.unified_retriever import get_unified_retriever
from ..services.embedding_service import get_embedding_service


class RAGEngine:
    """统一 RAG 引擎"""

    def __init__(self):
        self.settings = get_settings()
        self.router = get_query_router()
        self.planner = get_retrieval_planner()
        self.retriever = get_unified_retriever()
        self.embedding = get_embedding_service()

        # LLM 客户端
        self.llm_client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            base_url=self.settings.openai_base_url,
        )

    async def query(self, request: RAGRequest) -> RAGResponse:
        """
        处理 RAG 查询

        流程:
        1. 路由判断 → 选择策略
        2. 执行检索 → 获取知识
        3. 跨类型补充 (如需要)
        4. LLM 生成
        """
        start_time = time.time()

        # 1. 路由判断
        query_type, is_complex, entities = self.router.classify(request.query)

        logger.debug(
            f"Query classified: type={query_type}, "
            f"complex={is_complex}, entities={entities}"
        )

        # 2. 规划检索策略
        strategy = self.planner.plan(
            query=request.query,
            query_type=query_type,
            is_complex=is_complex,
            entities=entities,
            current_type=request.destiny_type,
        )

        # 3. 执行检索
        categories = [request.category] if request.category else None

        results = await self.retriever.search(
            query=request.query,
            strategy=strategy,
            destiny_types=[request.destiny_type],
            categories=categories,
            top_k=request.top_k,
            entities=entities
        )

        # 4. 检查是否需要跨类型补充
        if self.router.should_use_cross_type(request.query, entities):
            from ..services.cross_type_retriever import get_cross_type_retriever
            cross_retriever = get_cross_type_retriever()

            cross_results = await cross_retriever.search(
                query=request.query,
                current_type=request.destiny_type,
                target_types=[request.destiny_type, "shared"],
                top_k=3
            )

            # 合并结果
            results = self._merge_results(results, cross_results)

        # 5. 构建上下文
        context = self._build_context(results)

        # 6. 构建对话历史
        history_context = self._build_history_context(request.chat_history)

        # 7. LLM 生成
        response = await self._generate_response(
            query=request.query,
            context=context,
            history=history_context,
            destiny_type=request.destiny_type
        )

        query_time_ms = int((time.time() - start_time) * 1000)

        return RAGResponse(
            response=response,
            sources=results,
            strategy=strategy.value,
            entities=entities,
            query_time_ms=query_time_ms
        )

    def _merge_results(
        self,
        primary: List[SearchResult],
        secondary: List[SearchResult]
    ) -> List[SearchResult]:
        """合并检索结果"""
        result_map = {}

        for r in primary:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            result_map[key] = r

        for r in secondary:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            if key not in result_map:
                result_map[key] = r

        results = list(result_map.values())
        results.sort(key=lambda x: x.score, reverse=True)

        return results

    def _build_context(self, results: List[SearchResult], max_length: int = 8000) -> str:
        """构建检索上下文"""
        context_parts = []

        for r in results:
            # 来源标记
            source_info = f"【来源: {r.destiny_type}/{r.category}】"

            # 内容 (限制长度)
            content = r.content[:3000] if len(r.content) > 3000 else r.content

            context_parts.append(f"{source_info}\n{content}")

        context = "\n\n---\n\n".join(context_parts)

        # 截断到最大长度
        if len(context) > max_length:
            context = context[:max_length] + "\n...(内容已截断)"

        return context

    def _build_history_context(
        self,
        chat_history: Optional[List[Dict[str, str]]]
    ) -> str:
        """构建对话历史上下文"""
        if not chat_history:
            return ""

        history_parts = []
        for msg in chat_history[-5:]:  # 只保留最近5轮
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_parts.append(f"{role}: {content}")

        return "\n".join(history_parts)

    async def _generate_response(
        self,
        query: str,
        context: str,
        history: str,
        destiny_type: str
    ) -> str:
        """调用 LLM 生成回答"""
        # 根据命理类型选择系统提示
        system_prompt = self._get_system_prompt(destiny_type)

        messages = [
            {"role": "system", "content": system_prompt},
        ]

        if history:
            messages.append({"role": "system", "content": f"对话历史:\n{history}"})

        messages.extend([
            {"role": "system", "content": f"参考知识:\n{context}"},
            {"role": "user", "content": query},
        ])

        try:
            response = await self.llm_client.chat.completions.create(
                model="gpt-3.5-turbo",  # 或使用配置中的模型
                messages=messages,
                temperature=0.7,
                max_tokens=2000,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return "抱歉，处理您的问题时遇到了技术困难。请稍后再试或重新表述您的问题。"

    def _get_system_prompt(self, destiny_type: str) -> str:
        """获取系统提示词"""
        prompts = {
            "ziwei": """你是紫微斗数命理大师，精通紫微斗数理论。

你的特点：
- 客观中立，不过度美化分析结果
- 直面困难，对不利格局直接指出问题
- 使用专业术语，如：命宫、官禄宫、财帛宫、化禄、化忌等
- 回答要有理有据，结合命盘分析
- 避免绝对化的承诺，如"必有大成"

分析时请：
1. 先明确问题涉及的宫位和星曜
2. 结合命盘特征进行分析
3. 给出客观的评价和建议""",

            "bazi": """你是八字命理大师，精通八字命理理论。

你的特点：
- 客观分析日主强弱
- 准确判断用神喜忌
- 结合格局进行分析
- 避免绝对化承诺

分析时请：
1. 明确日主状态（身强/身弱）
2. 分析用神是否得力
3. 结合大运流年判断""",

            "qimen": """你是奇门遁甲大师，精通奇门遁甲理论。

你的特点：
- 熟悉九星、八门、八神的含义
- 能判断格局吉凶
- 结合具体事情分析""",

            "shared": """你是命理学专家，精通五行、天干地支等基础理论。

你的特点：
- 解释基础概念清晰准确
- 能融会贯通各派理论
- 回答简洁明了""",
        }

        return prompts.get(destiny_type, prompts["shared"])

    async def search_only(
        self,
        query: str,
        destiny_type: str = "ziwei",
        category: str = None,
        strategy: RetrievalStrategy = None,
        top_k: int = 10
    ) -> List[SearchResult]:
        """仅执行检索，不生成回答"""
        # 路由判断
        query_type, is_complex, entities = self.router.classify(query)

        # 规划策略
        if strategy is None:
            strategy = self.planner.plan(
                query=query,
                query_type=query_type,
                is_complex=is_complex,
                entities=entities,
                current_type=destiny_type,
            )

        # 执行检索
        categories = [category] if category else None

        return await self.retriever.search(
            query=query,
            strategy=strategy,
            destiny_types=[destiny_type],
            categories=categories,
            top_k=top_k,
            entities=entities
        )

    async def index_documents(
        self,
        destiny_type: str,
        category: str,
        documents: List[KnowledgeEntry]
    ):
        """索引文档到知识库"""
        docs = [
            {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content,
                "level": doc.level.value,
                "destiny_type": doc.destiny_type.value,
                "category": doc.category,
                "entities": doc.entities,
                "source_type": doc.source_type,
            }
            for doc in documents
        ]

        await self.retriever.index(destiny_type, category, docs)

        logger.info(
            f"Indexed {len(documents)} documents for {destiny_type}/{category}"
        )


# 单例实例
_rag_engine: RAGEngine | None = None


def get_rag_engine() -> RAGEngine:
    """获取 RAG 引擎单例"""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine
