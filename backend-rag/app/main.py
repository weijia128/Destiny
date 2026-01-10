"""
FastAPI 主应用
"""
import os
import sys
from pathlib import Path
from typing import List, Optional
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# 添加 app 目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app import __version__
from app.config import get_settings
from app.models.schemas import (
    SearchRequest, RAGRequest, UploadRequest, AddTextRequest,
    SearchResponse, RAGResponse, UploadResponse, StatsResponse, HealthResponse
)
from app.models.enums import RetrievalStrategy
from app.services.rag_engine import get_rag_engine
from app.services.unified_retriever import get_unified_retriever
from app.services.chroma_service import get_chroma_service
from app.services.hybrid_retriever import get_hybrid_retriever
from app.services.knowledge_service import KnowledgeService

# 初始化数据目录
from app.data import init_data_directories
init_data_directories()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    settings = get_settings()
    print(f"Ziwei RAG Service v{__version__}")
    print(f"Embedding model: {settings.openai_embedding_model}")
    print(f"Reranker model: {settings.reranker_model}")
    print(f"Chroma persist dir: {settings.chroma_persist_dir}")

    yield

    # 关闭时
    print("Shutting down...")


# 创建 FastAPI 应用
app = FastAPI(
    title="Ziwei RAG Service",
    description="紫微斗数命理分析系统 - 向量检索 + GraphRAG 服务",
    version=__version__,
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ API 端点 ============

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    settings = get_settings()

    # 检查 Chroma 连接
    chroma = get_chroma_service()
    try:
        chroma_stats = chroma.get_stats()
        chroma_connected = True
    except Exception:
        chroma_connected = False

    return HealthResponse(
        status="healthy" if chroma_connected else "degraded",
        version=__version__,
        chroma_connected=chroma_connected,
        embedding_model=settings.openai_embedding_model
    )


@app.post("/api/rag/search", response_model=SearchResponse)
async def search_knowledge(request: SearchRequest):
    """知识库检索"""
    import time
    start = time.time()

    retriever = get_unified_retriever()

    results = await retriever.search(
        query=request.query,
        strategy=request.strategy,
        destiny_types=request.destiny_types,
        categories=request.categories,
        top_k=request.top_k
    )

    query_time_ms = int((time.time() - start) * 1000)

    return SearchResponse(
        results=results,
        total=len(results),
        strategy=request.strategy.value if isinstance(request.strategy, RetrievalStrategy) else request.strategy,
        query_time_ms=query_time_ms
    )


@app.post("/api/rag/query", response_model=RAGResponse)
async def rag_query(request: RAGRequest):
    """RAG 问答"""
    rag_engine = get_rag_engine()
    return await rag_engine.query(request)


@app.get("/api/rag/chat")
async def rag_chat(
    q: str = Query(..., description="问题"),
    destiny_type: str = Query("ziwei", description="命理类型"),
    category: Optional[str] = Query(None, description="子分类"),
    top_k: int = Query(10, ge=1, le=50)
):
    """简单的 GET 请求 RAG 问答"""
    request = RAGRequest(
        query=q,
        destiny_type=destiny_type,
        category=category,
        top_k=top_k
    )
    return await rag_query(request)


@app.post("/api/knowledge/upload")
async def upload_document(
    file: UploadFile = File(...),
    destiny_type: str = Form(...),
    category: str = Form(...),
    title: Optional[str] = Form(None),
    level: str = Form("method")
):
    """上传文档到知识库"""
    import tempfile
    import shutil

    # 创建临时文件
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".txt"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        service = KnowledgeService()
        result = await service.add_document(
            file_path=temp_path,
            destiny_type=destiny_type,
            category=category,
            title=title or file.filename,
            level=level
        )

        return UploadResponse(
            status="success",
            document_id=result.get("document_id", ""),
            chunks_created=result.get("chunks", 0),
            message=f"成功索引 {file.filename}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


@app.post("/api/knowledge/text")
async def add_text_knowledge(request: AddTextRequest):
    """直接添加文本到知识库"""
    service = KnowledgeService()

    entry = {
        "title": request.title,
        "content": request.content,
        "destiny_type": request.destiny_type,
        "category": request.category,
        "level": request.level,
        "keywords": request.keywords or [],
        "entities": request.entities or [],
        "relations": request.relations or [],
    }

    result = await service.add_text(entry)

    return UploadResponse(
        status="success",
        document_id=result.get("document_id", ""),
        chunks_created=result.get("chunks", 1),
        message=f"已添加: {request.title}"
    )


@app.get("/api/knowledge/stats")
async def get_knowledge_stats():
    """获取知识库统计"""
    service = KnowledgeService()
    return service.get_stats()


@app.get("/api/knowledge/documents")
async def list_documents(
    destiny_type: Optional[str] = Query(None, description="命理类型")
):
    """列出已索引的文档"""
    service = KnowledgeService()
    return {"documents": service.list_documents(destiny_type)}


@app.delete("/api/knowledge/{document_id}")
async def delete_document(document_id: str):
    """删除文档"""
    service = KnowledgeService()
    result = service.delete_document(document_id)
    return {"status": "success", "deleted": result}


@app.post("/api/knowledge/reindex/{destiny_type}")
async def reindex_knowledge(destiny_type: str):
    """重建知识索引"""
    service = KnowledgeService()
    result = service.reindex_all(destiny_type)
    return {"status": "success", "indexed": result}


@app.get("/api/collections")
async def list_collections():
    """列出所有集合"""
    chroma = get_chroma_service()
    return {"collections": chroma.list_collections()}


# ============ 启动入口 ============

def main():
    """启动服务"""
    settings = get_settings()

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    main()
