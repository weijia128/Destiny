"""
混合检索器
结合向量检索、BM25 关键词检索和 GraphRAG 图谱构建
"""
from typing import List, Optional, Tuple
from loguru import logger

from ..config import get_settings
from ..models.enums import RetrievalStrategy
from ..models.schemas import SearchResult, RerankedResult
from ..services.chroma_service import get_chroma_service
from ..services.bm25_service import get_bm25_service
from ..services.embedding_service import get_embedding_service
from ..services.reranker_service import get_reranker_service
from ..services.graphrag_retriever import get_graphrag_retriever


class HybridRetriever:
    """混合检索器 - 向量 + BM25 + GraphRAG"""

    def __init__(self):
        self.settings = get_settings()
        self.chroma = get_chroma_service()
        self.bm25 = get_bm25_service()
        self.embedding = get_embedding_service()
        self.reranker = get_reranker_service()
        self.graphrag = get_graphrag_retriever()

        # 权重配置
        self.vector_weight = self.settings.hybrid_vector_weight
        self.keyword_weight = self.settings.hybrid_keyword_weight

    async def search(
        self,
        query: str,
        destiny_types: List[str],
        categories: Optional[List[str]] = None,
        top_k: int = 10
    ) -> List[SearchResult]:
        """
        混合检索

        Args:
            query: 查询文本
            destiny_types: 命理类型列表
            categories: 子分类列表 (None 表示全部)
            top_k: 返回数量

        Returns:
            检索结果列表
        """
        # 并行执行向量检索和 BM25 检索
        vector_results, bm25_results = await self._parallel_search(
            query, destiny_types, categories, top_k
        )

        # 融合结果
        fused = self._fuse_results(vector_results, bm25_results)

        # 重排序
        reranked = await self.reranker.rerank(query, fused, top_k)

        # 返回结果
        return [r.result for r in reranked]

    async def _parallel_search(
        self,
        query: str,
        destiny_types: List[str],
        categories: Optional[List[str]],
        top_k: int
    ) -> Tuple[List[SearchResult], List[SearchResult]]:
        """并行执行两种检索"""
        import asyncio

        # 向量化查询
        query_embedding = self.embedding.encode_single(query)

        # 创建检索任务
        vector_tasks = []
        bm25_tasks = []

        for dt in destiny_types:
            # 如果没有指定分类，获取该类型的所有分类
            cats = categories if categories else self._get_all_categories(dt)

            for cat in cats:
                vector_tasks.append(self._vector_search(dt, cat, query, query_embedding, top_k))
                bm25_tasks.append(self._bm25_search(dt, cat, query, top_k))

        # 并行执行
        vector_results_list, bm25_results_list = await asyncio.gather(
            asyncio.gather(*vector_tasks),
            asyncio.gather(*bm25_tasks)
        )

        # 合并结果
        vector_results = []
        bm25_results = []

        for results in vector_results_list:
            vector_results.extend(results)

        for results in bm25_results_list:
            bm25_results.extend(results)

        return vector_results, bm25_results

    async def _vector_search(
        self,
        destiny_type: str,
        category: str,
        query: str,
        query_embedding: List[float],
        top_k: int
    ) -> List[SearchResult]:
        """向量检索"""
        try:
            results = self.chroma.search(
                destiny_type=destiny_type,
                category=category,
                query=query,
                query_embedding=query_embedding,
                n_results=top_k
            )
            return results
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []

    async def _bm25_search(
        self,
        destiny_type: str,
        category: str,
        query: str,
        top_k: int
    ) -> List[SearchResult]:
        """BM25 检索"""
        try:
            results = self.bm25.search(
                destiny_type=destiny_type,
                category=category,
                query=query,
                n_results=top_k
            )
            return results
        except Exception as e:
            logger.error(f"BM25 search error: {e}")
            return []

    def _fuse_results(
        self,
        vector_results: List[SearchResult],
        bm25_results: List[SearchResult]
    ) -> List[SearchResult]:
        """
        融合向量和 BM25 结果

        使用加权融合策略:
        1. 合并所有结果
        2. 对相同 ID 的结果取最高分数
        3. 按融合分数排序
        """
        # 构建 ID 到结果的映射
        result_map = {}

        # 处理向量结果
        for r in vector_results:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            fusion_score = r.score * self.vector_weight
            result_map[key] = {
                "result": r,
                "score": fusion_score,
                "source": "vector"
            }

        # 处理 BM25 结果
        for r in bm25_results:
            key = f"{r.destiny_type}:{r.category}:{r.id}"
            bm25_score = r.score * self.keyword_weight

            if key in result_map:
                # 取最高分数
                existing = result_map[key]
                existing["score"] = max(existing["score"], bm25_score)
            else:
                result_map[key] = {
                    "result": r,
                    "score": bm25_score,
                    "source": "bm25"
                }

        # 构建融合结果
        fused = []
        for item in result_map.values():
            r = item["result"]
            # 更新分数
            fused_result = SearchResult(
                id=r.id,
                content=r.content,
                score=item["score"],
                title=r.title,
                destiny_type=r.destiny_type,
                category=r.category,
                level=r.level,
                source="hybrid",
                distance=r.distance
            )
            fused.append(fused_result)

        # 按分数排序
        fused.sort(key=lambda x: x.score, reverse=True)

        return fused

    def _get_all_categories(self, destiny_type: str) -> List[str]:
        """获取指定命理类型的所有分类"""
        categories = {
            "shared": ["basic"],
            "ziwei": ["palace", "star", "transformation", "fortune", "pattern"],
            "bazi": ["structure", "yongshen", "ten_gods", "dayun"],
            "qimen": ["nine_star", "eight_door", "eight_god", "formation"],
            "liuyao": ["gua", "liuyao_yongshen", "shiyin"],
            "shouxiang": ["palm", "finger", "mount", "line"],
        }
        return categories.get(destiny_type, ["general"])

    async def index_documents(
        self,
        destiny_type: str,
        category: str,
        documents: List[dict]
    ):
        """
        索引文档 (同时建立向量、BM25 和 GraphRAG 图谱)

        Args:
            destiny_type: 命理类型
            category: 子分类
            documents: 文档列表
        """
        logger.info(f"Indexing {len(documents)} documents for {destiny_type}/{category}")

        # 提取内容
        contents = [doc.get("content", "") for doc in documents]
        ids = [doc.get("id", str(i)) for i in range(len(documents))]
        titles = [doc.get("title", "") for i in range(len(documents))]
        levels = [doc.get("level", "method") for i in range(len(documents))]

        # 1. 向量化
        embeddings = self.embedding.encode(contents)

        # 2. 构建元数据
        metadatas = [
            {
                "title": titles[i],
                "level": levels[i],
                "destiny_type": destiny_type,
                "category": category,
                "source_type": doc.get("source_type", "manual"),
            }
            for i, doc in enumerate(documents)
        ]

        # 3. 存入 Chroma 向量库
        self.chroma.add_documents(
            destiny_type=destiny_type,
            category=category,
            documents=contents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )

        # 4. 构建 BM25 索引
        bm25_docs = [
            {
                "id": ids[i],
                "content": contents[i],
                "title": titles[i],
                "level": levels[i],
            }
            for i in range(len(documents))
        ]
        self.bm25.build_index(
            destiny_type=destiny_type,
            category=category,
            documents=bm25_docs
        )

        # 5. 构建 GraphRAG 图谱 (异步，不阻塞索引)
        try:
            graph_result = await self.graphrag.build_graph_from_documents(
                destiny_type=destiny_type,
                category=category,
                documents=documents
            )
            logger.info(
                f"Graph built: {graph_result.get('entities', 0)} entities, "
                f"{graph_result.get('relations', 0)} relations"
            )
        except Exception as e:
            logger.warning(f"GraphRAG build failed, continuing without graph: {e}")

        logger.info(
            f"Indexed {len(documents)} documents for {destiny_type}/{category}"
        )


# 单例实例
_hybrid_retriever: HybridRetriever | None = None


def get_hybrid_retriever() -> HybridRetriever:
    """获取混合检索器单例"""
    global _hybrid_retriever
    if _hybrid_retriever is None:
        _hybrid_retriever = HybridRetriever()
    return _hybrid_retriever
