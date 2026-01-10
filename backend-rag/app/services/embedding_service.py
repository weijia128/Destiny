"""
Embedding 服务
"""
import os
from typing import List, Optional
from loguru import logger

from openai import OpenAI, AsyncOpenAI
from openai import RateLimitError, APIError

from ..config import get_settings


class EmbeddingService:
    """Embedding 服务 - 使用 OpenAI"""

    def __init__(self):
        self.settings = get_settings()
        self.model = self.settings.openai_embedding_model
        self.base_url = self.settings.openai_base_url
        self.api_key = self.settings.openai_api_key

        # 同步客户端
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

        # 异步客户端
        self.async_client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

        # 批处理大小
        self.batch_size = 100

    def encode(self, texts: List[str]) -> List[List[float]]:
        """
        批量向量化

        Args:
            texts: 文本列表

        Returns:
            向量列表
        """
        if not texts:
            return []

        all_embeddings = []

        # 分批处理
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            embeddings = self._encode_batch(batch)
            all_embeddings.extend(embeddings)

        logger.debug(f"Encoded {len(texts)} texts in {len(all_embeddings)} batches")
        return all_embeddings

    def encode_single(self, text: str) -> List[float]:
        """单条向量化"""
        embeddings = self.encode([text])
        return embeddings[0] if embeddings else []

    async def encode_async(self, texts: List[str]) -> List[List[float]]:
        """异步批量向量化"""
        if not texts:
            return []

        all_embeddings = []

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            embeddings = await self._encode_batch_async(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    def _encode_batch(self, texts: List[str]) -> List[List[float]]:
        """批量调用 API"""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts
            )

            embeddings = [data.embedding for data in response.data]
            return embeddings

        except RateLimitError as e:
            logger.warning(f"Rate limit error, retrying: {e}")
            # 简单重试逻辑
            import time
            time.sleep(1)
            return self._encode_batch(texts)

        except APIError as e:
            logger.error(f"API error during embedding: {e}")
            raise

    async def _encode_batch_async(self, texts: List[str]) -> List[List[float]]:
        """异步批量调用 API"""
        try:
            response = await self.async_client.embeddings.create(
                model=self.model,
                input=texts
            )

            embeddings = [data.embedding for data in response.data]
            return embeddings

        except Exception as e:
            logger.error(f"Async API error during embedding: {e}")
            raise

    def encode_query(self, query: str) -> List[float]:
        """查询向量化 (与 encode_single 相同)"""
        return self.encode_single(query)

    def get_dimension(self) -> int:
        """获取向量维度"""
        # text-embedding-3-small: 1536 维度
        # text-embedding-3-large: 3072 维度
        if "3-small" in self.model:
            return 1536
        elif "3-large" in self.model:
            return 3072
        elif "ada" in self.model:
            return 1024
        else:
            return 1536  # 默认


# 单例实例
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """获取 Embedding 服务单例"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
