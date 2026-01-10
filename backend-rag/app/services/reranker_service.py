"""
重排序服务 (Reranker)
使用 Cross-Encoder 对检索结果进行精排
"""
import os
from typing import List, Optional
from loguru import logger

from sentence_transformers import CrossEncoder

from ..config import get_settings
from ..models.schemas import SearchResult, RerankedResult


class RerankerService:
    """重排序服务"""

    def __init__(self):
        self.settings = get_settings()
        self.model_name = self.settings.reranker_local_model
        self.use_local = self.settings.reranker_model == "local"
        self.use_openai = self.settings.reranker_model == "openai"

        # 加载本地模型
        self.model = None
        if self.use_local:
            self._load_local_model()

    def _load_local_model(self):
        """加载本地 Cross-Encoder 模型"""
        try:
            self.model = CrossEncoder(self.model_name)
            logger.info(f"Loaded local reranker model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load local model: {e}")
            logger.warning("Falling back to OpenAI reranker")
            self.use_local = False
            self.use_openai = True

    async def rerank(
        self,
        query: str,
        results: List[SearchResult],
        top_k: int = 5
    ) -> List[RerankedResult]:
        """
        对检索结果进行重排序

        Args:
            query: 查询文本
            results: 检索结果列表
            top_k: 返回数量

        Returns:
            重排序后的结果列表
        """
        if not results:
            return []

        if len(results) <= top_k:
            # 不需要重排序
            return [
                RerankedResult(result=r, rerank_score=r.score)
                for r in results
            ]

        if self.use_local and self.model:
            return await self._rerank_local(query, results, top_k)
        elif self.use_openai:
            return await self._rerank_openai(query, results, top_k)
        else:
            # 无重排序器，直接返回
            logger.warning("No reranker available, returning original order")
            return [
                RerankedResult(result=r, rerank_score=r.score)
                for r in results[:top_k]
            ]

    async def _rerank_local(
        self,
        query: str,
        results: List[SearchResult],
        top_k: int
    ) -> List[RerankedResult]:
        """使用本地模型重排序"""
        try:
            # 准备输入 [query, document]
            pairs = [
                [query, result.content]
                for result in results
            ]

            # 批量推理
            scores = self.model.predict(pairs)

            # 归一化分数到 0-1
            import torch
            if isinstance(scores, torch.Tensor):
                scores = scores.numpy()

            min_score = scores.min()
            max_score = scores.max()
            if max_score > min_score:
                normalized = (scores - min_score) / (max_score - min_score)
            else:
                normalized = scores * 0.5

            # 构建结果
            reranked = []
            for i, result in enumerate(results):
                reranked.append(RerankedResult(
                    result=result,
                    rerank_score=float(normalized[i])
                ))

            # 按分数降序排序
            reranked.sort(key=lambda x: x.rerank_score, reverse=True)

            return reranked[:top_k]

        except Exception as e:
            logger.error(f"Local reranking error: {e}")
            # 返回原始结果
            return [
                RerankedResult(result=r, rerank_score=r.score)
                for r in results[:top_k]
            ]

    async def _rerank_openai(
        self,
        query: str,
        results: List[SearchResult],
        top_k: int
    ) -> List[RerankedResult]:
        """使用 OpenAI 重排序"""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.settings.reranker_api_key)

            # 构建 prompt
            system_prompt = """你是一个专业的命理知识检索系统。
给定用户查询和参考文档，你需要评估每个文档与查询的相关程度。
请用0-1之间的分数表示相关性，1表示完全相关，0表示完全不相关。
只返回JSON数组格式，不要其他文字。

格式示例:
[
  {"index": 0, "score": 0.95},
  {"index": 1, "score": 0.30}
]
"""

            documents_text = "\n\n".join([
                f"[{i}] {result.content[:500]}"
                for i, result in enumerate(results)
            ])

            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",  # 使用轻量模型
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"查询: {query}\n\n文档:\n{documents_text}"}
                ],
                temperature=0,
                max_tokens=500
            )

            # 解析结果
            import json
            content = response.choices[0].message.content
            # 清理可能的 markdown 代码块
            content = content.strip()
            if content.startswith("```"):
                content = "\n".join(content.split("\n")[1:-1])
            if content.startswith("json"):
                content = content[4:].strip()

            scores_data = json.loads(content)

            # 构建结果
            score_map = {item["index"]: item["score"] for item in scores_data}

            reranked = []
            for i, result in enumerate(results):
                reranked.append(RerankedResult(
                    result=result,
                    rerank_score=score_map.get(i, result.score)
                ))

            # 排序
            reranked.sort(key=lambda x: x.rerank_score, reverse=True)

            return reranked[:top_k]

        except Exception as e:
            logger.error(f"OpenAI reranking error: {e}")
            return [
                RerankedResult(result=r, rerank_score=r.score)
                for r in results[:top_k]
            ]


# 单例实例
_reranker_service: RerankerService | None = None


def get_reranker_service() -> RerankerService:
    """获取重排序服务单例"""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = RerankerService()
    return _reranker_service
