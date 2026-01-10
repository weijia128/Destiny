"""
数据模型定义
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field

from .enums import DestinyType, KnowledgeLevel, RetrievalStrategy, QueryType


class KnowledgeEntry(BaseModel):
    """知识条目 - 统一的数据结构"""

    # 基础信息
    id: str = Field(..., description="唯一标识")
    title: str = Field(..., description="标题")
    content: str = Field(..., description="详细内容 (Markdown格式)")

    # 分类标签
    destiny_type: DestinyType = Field(..., description="命理大类")
    category: str = Field(..., description="子分类")
    level: KnowledgeLevel = Field(
        default=KnowledgeLevel.METHOD,
        description="知识层级"
    )

    # 知识关联 (用于 GraphRAG)
    entities: List[str] = Field(
        default_factory=list,
        description="实体列表"
    )
    relations: List[Dict[str, str]] = Field(
        default_factory=list,
        description="关系列表"
    )
    community: Optional[str] = Field(
        default=None,
        description="社区归属 (GraphRAG)"
    )

    # 检索优化
    keywords: List[str] = Field(
        default_factory=list,
        description="搜索关键词"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="额外元数据"
    )

    # 来源追踪
    source_file: Optional[str] = Field(
        default=None,
        description="源文件路径"
    )
    source_type: str = Field(
        default="manual",
        description="来源类型: manual | uploaded | extracted"
    )

    # 时间戳
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        use_enum_values = True


class SearchResult(BaseModel):
    """检索结果"""

    id: str = Field(..., description="知识条目ID")
    content: str = Field(..., description="内容")
    score: float = Field(..., description="相关性分数")

    # 来源信息
    title: str = Field(..., description="标题")
    destiny_type: str = Field(..., description="命理类型")
    category: str = Field(..., description="子分类")
    level: str = Field(default="method", description="知识层级")

    # 检索元数据
    source: str = Field(default="vector", description="vector | bm25 | graph")
    distance: Optional[float] = Field(default=None, description="向量距离")

    class Config:
        use_enum_values = True


class RerankedResult(BaseModel):
    """重排序后的检索结果"""

    result: SearchResult
    rerank_score: float = Field(..., description="重排序分数")


class QueryContext(BaseModel):
    """查询上下文"""

    query: str = Field(..., description="用户查询")
    query_type: QueryType = Field(..., description="查询类型")
    is_complex: bool = Field(default=False, description="是否复杂问题")
    entities: List[str] = Field(default_factory=list, description="涉及实体")
    strategy: RetrievalStrategy = Field(
        default=RetrievalStrategy.HYBRID_VECTOR,
        description="检索策略"
    )


# ============ API Request Models ============

class SearchRequest(BaseModel):
    """检索请求"""
    query: str = Field(..., description="查询文本")
    destiny_types: List[str] = Field(
        default_factory=lambda: ["ziwei"],
        description="命理类型列表"
    )
    categories: Optional[List[str]] = Field(
        default=None,
        description="子分类列表"
    )
    strategy: RetrievalStrategy = Field(
        default=RetrievalStrategy.HYBRID_VECTOR,
        description="检索策略"
    )
    top_k: int = Field(default=10, ge=1, le=50, description="返回数量")


class RAGRequest(BaseModel):
    """RAG 问答请求"""
    query: str = Field(..., description="问题")
    destiny_type: str = Field(default="ziwei", description="命理类型")
    category: Optional[str] = Field(default=None, description="子分类")
    chat_history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="对话历史"
    )
    top_k: int = Field(default=10, ge=1, le=50, description="检索数量")


class UploadRequest(BaseModel):
    """文档上传请求"""
    destiny_type: str = Field(..., description="命理类型")
    category: str = Field(..., description="子分类")
    title: Optional[str] = Field(default=None, description="文档标题")
    level: str = Field(default="method", description="知识层级")


class AddTextRequest(BaseModel):
    """直接添加文本请求"""
    title: str = Field(..., description="标题")
    content: str = Field(..., description="内容")
    destiny_type: str = Field(..., description="命理类型")
    category: str = Field(..., description="子分类")
    level: str = Field(default="method", description="知识层级")
    keywords: Optional[List[str]] = Field(default=None, description="关键词")
    entities: Optional[List[str]] = Field(default=None, description="实体")
    relations: Optional[List[Dict[str, str]]] = Field(default=None, description="关系")


# ============ API Response Models ============

class SearchResponse(BaseModel):
    """检索响应"""
    results: List[SearchResult]
    total: int = Field(..., description="总数")
    strategy: str = Field(..., description="使用的检索策略")
    query_time_ms: int = Field(..., description="查询耗时(ms)")


class RAGResponse(BaseModel):
    """RAG 问答响应"""
    response: str = Field(..., description="AI生成的回答")
    sources: List[SearchResult] = Field(
        default_factory=list,
        description="参考的知识来源"
    )
    strategy: str = Field(..., description="使用的检索策略")
    entities: List[str] = Field(
        default_factory=list,
        description="涉及实体"
    )
    query_time_ms: int = Field(..., description="查询耗时(ms)")


class UploadResponse(BaseModel):
    """上传响应"""
    status: str = Field(..., description="状态")
    document_id: str = Field(..., description="文档ID")
    chunks_created: int = Field(..., description="创建的块数")
    message: str = Field(..., description="消息")


class StatsResponse(BaseModel):
    """统计响应"""
    total_documents: int = Field(..., description="文档数")
    total_chunks: int = Field(..., description="知识块数")
    by_destiny_type: Dict[str, Dict[str, int]] = Field(
        ...,
        description="按命理类型统计"
    )
    collections: Dict[str, int] = Field(..., description="各集合文档数")


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = Field(..., description="状态")
    version: str = Field(..., description="版本号")
    chroma_connected: bool = Field(..., description="Chroma连接状态")
    embedding_model: str = Field(..., description="Embedding模型")
