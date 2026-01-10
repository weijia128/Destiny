"""
配置管理模块
"""
import os
from pathlib import Path
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """应用配置"""

    # OpenAI
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    openai_embedding_model: str = Field(default="text-embedding-3-small")
    openai_base_url: str = Field(default="https://api.openai.com/v1")

    # Reranker
    reranker_model: str = Field(default="local", description="openai | local")
    reranker_api_key: str = Field(default="")
    reranker_local_model: str = Field(default="cross-encoder/ms-marco-MiniLM-L-6-v2")

    # Chroma
    chroma_persist_dir: str = Field(default="./chroma_db")
    chroma_collection_prefix: str = Field(default="ziwei_")

    # BM25
    bm25_k1: float = Field(default=1.5)
    bm25_b: float = Field(default=0.75)

    # Retrieval
    default_top_k: int = Field(default=10)
    hybrid_vector_weight: float = Field(default=0.6)
    hybrid_keyword_weight: float = Field(default=0.4)

    # Router
    complex_query_length_threshold: int = Field(default=50)
    complex_entity_threshold: int = Field(default=2)

    # Cross-type
    enable_cross_type: bool = Field(default=True)
    shared_concepts: str = Field(default="五行,天干,地支,用神,喜忌,大运,流年")

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8001)
    debug: bool = Field(default=False)

    # Logging
    log_level: str = Field(default="INFO")

    @property
    def shared_concepts_list(self) -> List[str]:
        return [c.strip() for c in self.shared_concepts.split(",") if c.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 命理类型配置
DESTINY_TYPES = {
    "shared": {
        "name": "共通知识",
        "collections": ["basic"],  # 五行理论、天干地支等
    },
    "ziwei": {
        "name": "紫微斗数",
        "collections": ["palace", "star", "transformation", "fortune", "pattern"],
    },
    "bazi": {
        "name": "八字命理",
        "collections": ["structure", "yongshen", "ten_gods", "dayun"],
    },
    "qimen": {
        "name": "奇门遁甲",
        "collections": ["nine_star", "eight_door", "eight_god", "formation"],
    },
    "liuyao": {
        "name": "六爻预测",
        "collections": ["gua", "liuyao_yongshen", "shiyin"],
    },
    "shouxiang": {
        "name": "手相占卜",
        "collections": ["palm", "finger", "mount", "line"],
    },
}

# 检索策略配置
RETRIEVAL_STRATEGIES = {
    "hybrid_vector": {
        "description": "向量混合检索",
        "use_reranker": True,
        "top_k": 10,
    },
    "graph_local": {
        "description": "GraphRAG 局部检索",
        "use_community": False,
        "top_k": 10,
    },
    "graph_global": {
        "description": "GraphRAG 全局检索",
        "use_community": True,
        "top_k": 5,
    },
    "cross_type": {
        "description": "跨类型检索",
        "use_shared": True,
        "top_k": 5,
    },
}
