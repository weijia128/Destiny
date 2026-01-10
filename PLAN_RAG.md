# GraphRAG + 向量混合检索 RAG 系统实现计划

## 目标
为紫微斗数命理分析系统实现混合检索架构：GraphRAG + 向量检索 + BM25，支持查询路由和多命理知识库。

## 技术选型
- **向量数据库**: Chroma (持久化、本地存储)
- **Embedding**: OpenAI `text-embedding-3-small`
- **关键词检索**: BM25 (rank-bm25 库)
- **重排序**: Cross-Encoder (cross-encoder/ms-marco-MiniLM)
- **服务框架**: FastAPI
- **集成方式**: HTTP REST API

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          查询路由层                                  │
├─────────────────────────────────────────────────────────────────────┤
│  用户查询 → Router(判断类型+复杂度) → 策略规划                       │
│                     │                                               │
│                     ▼                                               │
│         ┌───────────────┬───────────────────────────────┐          │
│         │ 简单问题      │ 复杂问题                       │          │
│         ▼               ▼                               ▼          │
│    混合向量检索    GraphRAG局部检索     GraphRAG全局检索             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          统一知识库                                  │
├─────────────────────────────────────────────────────────────────────┤
│  shared (共通) → ziwei (紫微) → bazi (八字) → qimen (奇门) → ...     │
└─────────────────────────────────────────────────────────────────────┘
```

## 实现步骤

### Phase 1: 基础结构
1. [ ] 创建 Python RAG 服务基础结构
   - [ ] `backend-rag/requirements.txt`
   - [ ] `backend-rag/.env.example`
   - [ ] `backend-rag/app/__init__.py`
   - [ ] `backend-rag/app/config.py`

2. [ ] 实现知识条目数据结构和分类体系
   - [ ] `backend-rag/app/models/enums.py` - DestinyType, KnowledgeLevel
   - [ ] `backend-rag/app/models/schemas.py` - KnowledgeEntry, SearchResult

### Phase 2: 检索核心
3. [ ] 实现查询路由判断器 (QueryRouter)
   - [ ] `backend-rag/app/services/router.py`

4. [ ] 实现检索策略规划器 (RetrievalPlanner)
   - [ ] `backend-rag/app/services/planner.py`

5. [ ] 实现 Chroma 向量存储服务
   - [ ] `backend-rag/app/services/chroma_service.py`

6. [ ] 实现 BM25 关键词检索服务
   - [ ] `backend-rag/app/services/bm25_service.py`

7. [ ] 实现重排序服务
   - [ ] `backend-rag/app/services/reranker_service.py`

### Phase 3: 检索器实现
8. [ ] 实现混合检索器 (HybridRetriever)
   - [ ] `backend-rag/app/services/hybrid_retriever.py`

9. [ ] 实现 GraphRAG 检索器
   - [ ] `backend-rag/app/services/graphrag_retriever.py`

10. [ ] 实现跨类型检索器
    - [ ] `backend-rag/app/services/cross_type_retriever.py`

11. [ ] 实现统一检索接口
    - [ ] `backend-rag/app/services/unified_retriever.py`

### Phase 4: RAG 引擎
12. [ ] 实现统一 RAG 引擎
    - [ ] `backend-rag/app/services/rag_engine.py`

### Phase 5: 服务接口
13. [ ] 实现 FastAPI 服务接口
    - [ ] `backend-rag/app/main.py`

### Phase 6: 数据迁移
14. [ ] 实现数据迁移脚本
    - [ ] `backend-rag/scripts/migrate_knowledge.py`
    - [ ] `backend-rag/scripts/init_knowledge.py`

### Phase 7: 后端集成
15. [ ] 实现 Node.js RAG 客户端服务
    - [ ] `backend/src/services/ragService.ts`

16. [ ] 改造 LangGraph 节点
    - [ ] `backend/src/graph/nodes.ts`

## 文件清单

```
backend-rag/
├── requirements.txt
├── .env.example
├── .gitignore
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── models/
│   │   ├── __init__.py
│   │   ├── enums.py         # DestinyType, KnowledgeLevel, RetrievalStrategy
│   │   └── schemas.py       # KnowledgeEntry, SearchResult, API models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chroma_service.py        # 向量存储
│   │   ├── bm25_service.py          # BM25 索引
│   │   ├── reranker_service.py      # 重排序
│   │   ├── router.py                # 查询路由判断
│   │   ├── planner.py               # 检索策略规划
│   │   ├── hybrid_retriever.py      # 混合检索
│   │   ├── graphrag_retriever.py    # GraphRAG 检索
│   │   ├── cross_type_retriever.py  # 跨类型检索
│   │   ├── unified_retriever.py     # 统一检索接口
│   │   └── rag_engine.py            # RAG 引擎
│   └── data/
│       ├── __init__.py
│       └── document_records.json
├── scripts/
│   ├── migrate_knowledge.py
│   └── init_knowledge.py
└── tests/
    └── test_retrieval.py

backend/src/services/
└── ragService.ts           # Node.js RAG 客户端
```

## 启动方式

```bash
# 1. 安装依赖
cd backend-rag
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. 初始化知识库
python scripts/init_knowledge.py

# 3. 启动服务
python -m app.main  # 端口 8001

# 4. 启动 Node 后端
cd backend
npm run dev
```

## 风险和注意事项

1. **OpenAI API 费用**: Embedding 和重排序需要 API Key
2. **模型选择**: 重排序模型可选本地或 API
3. **GraphRAG 实现**: 简化版本，暂不实现完整的社区检测
4. **降级方案**: Python 服务不可用时切换到原有知识库
