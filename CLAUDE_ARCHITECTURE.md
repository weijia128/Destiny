# CLAUDE_ARCHITECTURE.md

系统架构设计文档，描述项目的整体架构、核心组件和设计模式。

## 目录

- [架构概览](#架构概览)
- [状态机架构](#状态机架构)
- [RAG 系统架构](#rag-系统架构)
- [前端状态管理](#前端状态管理)
- [数据流](#数据流)
- [API 端点](#api-端点)
- [知识库系统](#知识库系统)
- [前端组件结构](#前端组件结构)
- [类型系统架构](#类型系统架构)
- [Prompt 构建器架构](#prompt-构建器架构)
- [ReAct 模式和工具调用](#react-模式和工具调用)
- [iztro 集成](#iztro-集成)
- [数据库模式](#数据库模式)
- [缓存系统](#缓存系统)
- [AI 提供商集成](#ai-提供商集成)

---

## 架构概览

这是一个 **紫微斗数命理分析系统** (Ziwei Destiny Analysis System) - 使用 LangGraph 风格状态机架构的占卜应用。

### Monorepo 结构

```
ziwei-destiny/
├── frontend/                    # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── services/           # Business logic (api, chart, agent, export)
│   │   │   └── prompts/        # Prompt构建器系统
│   │   ├── store/              # Zustand state management
│   │   ├── types/              # TypeScript type definitions
│   │   └── App.tsx             # Main application component
│   └── package.json
│
├── backend/                     # Express + TypeScript + LangGraph
│   ├── src/
│   │   ├── graph/              # LangGraph state machine
│   │   │   ├── destinyGraph.ts # Graph compilation
│   │   │   └── nodes.ts        # Node implementations (includes retrieveRAGNode)
│   │   ├── services/           # Business services
│   │   │   ├── interpretationService.ts  # AI provider orchestration
│   │   │   ├── knowledgeService.ts       # Knowledge base retrieval
│   │   │   ├── chartService.ts           # Chart processing
│   │   │   ├── reportService.ts          # Report file management
│   │   │   └── ragService.ts             # RAG client (NEW)
│   │   ├── prompts/            # Prompt构建器系统
│   │   ├── repositories/       # Data access layer
│   │   ├── clients/            # External API clients
│   │   ├── database/           # SQLite database
│   │   ├── knowledge/          # Static knowledge base
│   │   ├── types/              # TypeScript types
│   │   │   ├── index.ts        # Shared types
│   │   │   └── graph.ts        # LangGraph state types (includes metadata field)
│   │   └── index.ts            # Express app + API routes
│   ├── reports/                # Generated report files
│   └── package.json
│
├── backend-rag/                 # Python RAG Service (NEW)
│   ├── app/                    # FastAPI application
│   │   ├── main.py             # API endpoints
│   │   ├── config.py           # Configuration
│   │   ├── models/             # Pydantic models
│   │   │   ├── enums.py        # DestinyType, RetrievalStrategy
│   │   │   └── schemas.py      # KnowledgeEntry, SearchResult
│   │   └── services/           # Core services
│   │       ├── chroma_service.py       # Chroma vector database
│   │       ├── bm25_service.py         # BM25 keyword search
│   │       ├── embedding_service.py    # OpenAI embeddings
│   │       ├── reranker_service.py     # Cross-encoder reranking
│   │       ├── router.py               # Query classification
│   │       ├── planner.py              # Retrieval strategy planning
│   │       ├── hybrid_retriever.py     # Hybrid search (vector + BM25)
│   │       ├── graphrag_retriever.py   # GraphRAG search
│   │       ├── cross_type_retriever.py # Cross-type search
│   │       ├── unified_retriever.py    # Unified search interface
│   │       ├── rag_engine.py           # RAG engine
│   │       └── knowledge_service.py    # Knowledge management
│   ├── scripts/                # Utility scripts
│   │   ├── init_knowledge.py   # Initialize knowledge base
│   │   └── migrate_knowledge.py # Migration scripts
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
│
└── package.json                # Root orchestration scripts
```

### 核心技术栈

- **Frontend**: React 18, Zustand (state), Tailwind CSS, Framer Motion, iztro (astrology chart library)
- **Backend**: Express, LangGraph (state machine), better-sqlite3 (database)
- **RAG Service**: FastAPI, Chroma (vector database), OpenAI embeddings, BM25 keyword search
- **AI Providers**: DeepSeek (default), MiniMax, Anthropic Claude
- **Astrology**: iztro library for Chinese Ziwei astrology calculations
- **State Machine**: LangGraph for workflow orchestration
- **Caching**: SQLite with 30-day TTL

---

## 状态机架构

系统实现了受 LangGraph 启发的 **双层状态机**：

### Backend State Machine (`backend/src/agents/destinyAgent.ts`)

状态: `init` → `retrieve` → `analyze` → `respond` → `done` (含 `error` 处理)

```typescript
// State transitions are strictly enforced
const stateTransitions = {
  init: ['retrieve'],
  retrieve: ['analyze'],
  analyze: ['respond'],
  respond: ['done'],
  error: ['init'],
  done: []
}
```

**状态机执行流程:**

1. **init** - 使用命盘信息、类别和对话历史初始化代理
   - `initialize(chartInfo, category, history)` - 将上下文加载到代理状态

2. **retrieve** - 从知识库获取相关知识
   - `nodeRetrieve(userMessage)` - 从用户消息和命盘中提取关键词
   - `getRelevantKnowledge(category, chart, userMessage)` - 查询知识库
   - 在 `state.retrievedContext` 中存储检索到的上下文

3. **analyze** - 构建综合分析提示
   - `buildAnalysisPrompt(userMessage)` - 构造系统提示 + 消息
   - 组合: 命盘数据 + 检索到的知识 + 对话历史

4. **respond** - 生成 AI 响应
   - `streamRespond(userMessage)` - 用于 SSE 流式传输的 AsyncGenerator
   - 支持多个 AI 提供商 (Anthropic, MiniMax, Mock)

5. **done** - 完成分析周期

**核心组件:**
- `DestinyAnalysisAgent` 类 - 封装整个状态机
- `nodeRetrieve()` - 知识库检索 (line 135-146)
- `buildAnalysisPrompt()` - 包含完整上下文的提示构建 (line 151-205)
- `streamRespond()` - 用于实时 SSE 流式传输的 AsyncGenerator (line 262-327)
- 双 AI 提供商支持，自动降级
- 未配置 API 密钥时返回模拟响应

### LangGraph State Machine Architecture (`backend/src/graph/`)

后端现在使用 **LangGraph** (受 LangChain 启发) 进行状态机编排:

**文件结构:**
- `graph/destinyGraph.ts` - 状态图编译和执行
- `graph/nodes.ts` - 单个节点实现
- `types/graph.ts` - 状态类型定义

**状态图流程:**
```
__start__
   ↓
router (路由节点)
   ├─ Determines next node based on category
   └─ Returns: { nextNode: "retrieveCareer" | "retrieveWealth" | ... }
   ↓
retrieve{Category} nodes (知识检索节点)
   ├─ retrieveCareer
   ├─ retrieveWealth
   ├─ retrieveRelationship
   ├─ retrieveHealth
   ├─ retrieveFamily
   └─ retrieveGeneral
   ↓
analyze (分析节点)
   └─ Builds system prompt with chart + knowledge + history
   ↓
respond (响应节点)
   └─ Calls AI provider and streams response
   ↓
__end__
```

**状态对象结构:**
```typescript
interface DestinyGraphState {
  // Input
  birthInfo: BirthInfo;
  category: AnalysisCategory;
  history: ChatMessage[];

  // Processing
  chartText: string;           // Formatted chart
  retrievedContext: string;    // Knowledge base context
  promptData: PromptData;      // System prompt + messages
  nextNode: string;            // Router decision

  // Output
  response: string;            // AI response

  // Error handling
  error?: string;
}
```

**执行方法:**
- `streamAnalyzeDestiny()` - 通过 SSE 流式执行 (用于 API 端点)
- 图编译: `new StateGraph<DestinyGraphState>()` 带条件边

**关键文件:**
- `backend/src/graph/destinyGraph.ts` - 图定义和编译
- `backend/src/graph/nodes.ts` - 节点实现 (router, retrieve*, retrieveRAG, analyze, respond)
- `backend/src/types/graph.ts` - TypeScript 类型定义 (包含 metadata 字段)

---

## RAG 系统架构

系统实现了 **混合 RAG 架构**，结合向量搜索、关键词搜索和 GraphRAG:

**架构概览:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                          查询路由层                                  │
├─────────────────────────────────────────────────────────────────────┤
│  用户查询 → QueryRouter (判断问题类型+复杂度) → 选择检索策略          │
│                     │                                               │
│                     ▼                                               │
│         ┌───────────────┬───────────────────────────────┐          │
│         │ 简单问题      │ 复杂问题                       │          │
│         ▼               ▼                               ▼          │
│    混合向量检索    GraphRAG局部检索     GraphRAG全局检索             │
│    (向量+BM25)     (实体关系)            (社区摘要)                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          统一知识库                                  │
├─────────────────────────────────────────────────────────────────────┤
│  shared (共通) → ziwei (紫微) → bazi (八字) → qimen (奇门) → ...     │
│  五行理论、天干地支等基础概念按 destiny_type 和 category 组织         │
└─────────────────────────────────────────────────────────────────────┘
```

**检索策略:**
1. **HYBRID_VECTOR** - 向量检索 + BM25 关键词检索 + Reranker 重排序
2. **GRAPH_LOCAL** - 基于实体邻居的图谱局部检索
3. **GRAPH_GLOBAL** - 基于社区摘要的图谱全局检索
4. **CROSS_TYPE** - 跨命理类型检索 (如涉及五行等共通概念)

**核心组件:**

**1. Query Router** (`backend-rag/app/services/router.py`)
- 分类查询类型 (palace/star/fortune/pattern)
- 检测复杂度 (长度、实体数量)
- 提取实体 (星曜、宫位、四化)

**2. Retrieval Planner** (`backend-rag/app/services/planner.py`)
- 根据查询选择最优检索策略
- 估算每种策略的成本和时间

**3. Unified Retriever** (`backend-rag/app/services/unified_retriever.py`)
- 集成混合、GraphRAG 和跨类型检索器
- 为所有搜索操作提供单一接口

**4. Chroma Service** (`backend-rag/app/services/chroma_service.py`)
- 管理向量数据库操作
- 持久化存储于 `./chroma_db`

**5. BM25 Service** (`backend-rag/app/services/bm25_service.py`)
- 使用 jieba 分词的关键词搜索
- 向量搜索的补充

**知识组织:**
```typescript
// Knowledge is organized by destiny_type and category
interface KnowledgeEntry {
  id: string;
  destiny_type: "shared" | "ziwei" | "bazi" | "qimen" | "liuyao" | "shouxiang";
  category: string;  // e.g., "palace", "star", "fortune" for ziwei
  content: string;   // Markdown formatted
  entities: string[];  // Related stars/palaces
  keywords: string[];
}
```

**RAG Service Endpoints:**
- `POST /api/rag/search` - 向量/关键词搜索
- `POST /api/rag/query` - 完整 RAG 查询含 LLM 生成
- `POST /api/knowledge/upload` - 上传文档到知识库
- `POST /api/knowledge/text` - 直接添加文本
- `GET /api/knowledge/stats` - 知识统计
- `GET /health` - 健康检查

**与 LangGraph 集成:**
`backend/src/graph/nodes.ts` 中的 `retrieveRAGNode` 连接到 RAG 服务:
- 支持新类别: `ziweigeju`, `sixi`, `dashun`, `geju`, `yongshen` 等
- RAG 服务不可用时降级到传统知识
- 返回元数据 (strategy, entities, sources) 用于调试

---

## 前端状态管理

使用 **Zustand** 进行轻量级状态管理，支持 localStorage 持久化。

**Store 结构:**
```typescript
interface AppState {
  // Birth info and chart
  birthInfo: BirthInfo | null
  chart: ZiweiChart | null

  // Chat messages
  messages: ChatMessage[]
  currentCategory: AnalysisCategory | null

  // UI state
  isLoading: boolean
  isSidebarOpen: boolean

  // Actions
  setBirthInfo: (info: BirthInfo) => void
  setChart: (chart: ZiweiChart) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, content: string) => void
  setCurrentCategory: (category: AnalysisCategory) => void
  resetAll: () => void
}
```

**持久化:**
- 自动持久化到 localStorage，键名为 `ziwei-destiny-storage`
- 持久化字段: `birthInfo`, `chart`, `messages`
- 页面重新加载时恢复，实现无缝用户体验

---

## 数据流

```
User Input (BirthInfo/Question)
  ↓
Frontend Store (Zustand)
  ↓
agentService.ts (build prompt + retrieve knowledge)
  ↓
api.ts: streamChat() → POST /api/chat/stream
  ↓
────────────────── Backend (Express) ──────────────────
  ↓
Cache Check (CacheRepository)
  ├─ HIT → Return cached response via SSE
  └─ MISS → Continue to LangGraph
      ↓
  LangGraph State Machine (destinyGraph.ts)
      ├─ router node: route to category
      ├─ retrieve{Category} node: fetch knowledge
      ├─ analyze node: build system prompt
      └─ respond node: call AI provider
          ↓
  AI Provider (DeepSeek/MiniMax/Claude)
      ↓
  Stream response chunks via SSE
      ↓
  Save to cache (30-day TTL)
  ↓
────────────────── Frontend ──────────────────
  ↓
api.ts receives SSE chunks
  ↓
Update Zustand store (message.content)
  ↓
ChatInterface displays streaming text
```

---

## API 端点

所有后端端点都以 `/api/` 为前缀:

**核心分析:**
- `GET /api/health` - 健康检查
- `POST /api/chat` - 非流式聊天 (返回完整响应)
- `POST /api/chat/stream` - **SSE 流式聊天** (主要端点)

**知识库:**
- `POST /api/knowledge/search` - 按类别/关键词搜索知识库

**报告:**
- `POST /api/reports/save` - 保存报告到服务器文件系统
- `GET /api/reports` - 列出所有保存的报告
- `GET /api/reports/:filename` - 读取特定报告内容
- `DELETE /api/reports/:filename` - 删除报告

**缓存管理:**
- `GET /api/cache/stats` - 整体缓存统计
- `GET /api/cache/:chartKey` - 获取特定缓存条目
- `DELETE /api/cache/:chartKey` - 删除特定缓存条目
- `DELETE /api/cache/expired/:days` - 清理过期条目 (N 天前)
- `DELETE /api/cache/category/:category` - 按类别清除缓存

### Request Format (`ChatRequest`)
```typescript
{
  prompt: string;        // Complete analysis prompt with detailed chart info
  chart: string;         // Formatted ziwei chart data (formatChartToReadableText output)
  category: AnalysisCategory;  // 'career' | 'wealth' | 'relationship' | 'health' | 'family' | 'general'
  history: ChatMessage[]; // Conversation history (last 10 messages)
}
```

**重要:** `chart` 字段包含 `formatChartToReadableText()` 的详细输出，向 AI 提供完整的 convert.py 格式宫位信息。

---

## 知识库系统

位于 `backend/src/knowledge/index.ts`:

**类别:** career, wealth, relationship, health, family, general

### Knowledge Entry Structure

每个知识条目包含:
- `id` - 唯一标识符 (如 "career-1", "wealth-2")
- `category` - AnalysisCategory 类型
- `title` - 条目标题
- `content` - 详细知识内容 (markdown 格式)
- `stars` - 相关星曜数组 (如 ['紫微', '武曲', '天机'])
- `palaces` - 相关宫位数组 (如 ['官禄宫', '财帛宫'])
- `keywords` - 搜索关键词数组 (如 ['事业', '工作', '职业'])

### Knowledge Retrieval Pipeline

**1. 入口点:** `getRelevantKnowledge(category, chart, userMessage)` (line 362-374)

**2. 关键词提取:** `extractKeywords(text)` (line 379-393)
   - 组合用户消息 + 命盘信息
   - 匹配预定义模式:
     - 14 主星 (紫微, 天机, 太阳, 武曲, etc.)
     - 4 四化 (化禄, 化权, 化科, 化忌)
     - 12 宫位 (命宫, 兄弟宫, 夫妻宫, etc.)
     - 领域关键词 (事业, 财运, 感情, 健康, etc.)

**3. 知识检索:** `retrieveKnowledge(category, keywords)` (line 342-358)
   - 按类别过滤
   - 按以下位置的关键词匹配对条目评分:
     - 条目关键词
     - 相关星曜
     - 相关宫位
   - 返回最相关的 3 个条目

**4. 格式化:** `formatKnowledgeForAI(entries)` (line 326-340)
   - 将条目转换为可读的 markdown 格式
   - 包含标题、内容和元数据
   - 输入到 AI 系统提示

**当前实现:**
- 内存知识库 (20+ 条目的数组)
- 简单的关键词匹配算法
- 基于类别的过滤

**未来增强:**
- 迁移到向量数据库 (Pinecone/Qdrant/Milvus)
- 使用嵌入进行语义搜索
- 动态知识库更新

### Frontend Knowledge Base (`frontend/src/services/agentService.ts`)

前端也维护 **本地知识库** 以减少后端调用:

**结构:**
```typescript
// agentService.ts (line 122-219)
const knowledgeBase = {
  career: "【事业运势分析要点】...",
  wealth: "【财运分析要点】...",
  relationship: "【感情婚姻分析要点】...",
  health: "【健康分析要点】...",
  family: "【家庭子女分析要点】...",
  general: "【综合分析框架】..."
}
```

**使用:**
```typescript
// Retrieve knowledge before API call
const knowledge = retrieveKnowledge(category, chart);

// Build prompt with knowledge context
const prompt = buildAnalysisPrompt(category, chart, userMessage, knowledge);

// Send to backend with context
await streamChat(prompt, chart, category, history);
```

**优势:**
- **降低延迟:** 无需额外的 API 调用获取知识
- **离线能力:** 可在没有后端的情况下构建提示
- **一致性:** 所有会话使用相同的知识库
- **易于更新:** 简单的基于字符串的知识编辑

---

## 前端组件结构

`frontend/src/components/`:
- `StarField.tsx` - 动画星空背景
- `CategorySelect.tsx` - 主类别选择 (Ziwei, Bazi, etc.)
- `BirthInfoForm.tsx` - 出生日期/时间/性别收集
- `ChartDisplay.tsx` - 4x4 网格占卜图表显示
- `AnalysisCategorySelector.tsx` - 选择分析类别 (career, wealth, etc.)
- `ChatInterface.tsx` - 主聊天 UI，支持流式响应

`frontend/src/services/`:
- `chartService.ts` - iztro 命盘计算，AI/导出的命盘格式化
- `agentService.ts` - 前端状态机编排
- `api.ts` - 带 SSE 支持的 HTTP 客户端
- `exportService.ts` - 包含详细命盘信息的 Markdown 报告生成

---

## 类型系统架构

系统使用 **灵活的类别类型系统** 来支持多种占卜方法:

**类别类型层次:**
```typescript
// backend/src/types/index.ts (line 27-70)

// Legacy type (still supported for backward compatibility)
export type AnalysisCategory =
  | 'career' | 'wealth' | 'relationship' | 'health' | 'family' | 'general';

// New extended type (recommended for all new code)
export type SubCategory =
  // Universal categories (applicable to all divination methods)
  | 'career' | 'wealth' | 'relationship' | 'health' | 'family' | 'general'

  // Ziwei-specific categories
  | 'ziweigeju'  // 紫微格局
  | 'sixi'       // 四化分析
  | 'dashun'     // 大运分析

  // Bazi-specific categories
  | 'geju'       // 八字格局
  | 'yongshen'   // 用神分析
  | 'shishen'    // 十神分析
  | 'dayun'      // 大运流年

  // Qimen-specific categories (奇门遁甲)
  | 'jushi'      // 局势分析
  | 'men'        // 门宫分析
  | 'xing'       // 星神分析
  | 'shen'       // 神煞分析

  // Liuyao-specific categories (六爻)
  | 'gua'        // 卦象分析
  | 'liuyaoyin'  // 六爻用神
  | 'shiyin'     // 世应分析

  // Hand reading categories (手相)
  | 'xian'       // 掌纹线路
  | 'qiu'        // 掌丘分析
  | 'zhi'        // 手指特征
  | 'wen'        // 纹理细节
```

**使用指南:**
- **新代码:** 使用 `SubCategory` 类型以获得最大灵活性
- **传统代码:** `AnalysisCategory` 仍然有效 (映射到通用类别)
- **类型兼容性:** `AnalysisCategory` 是 `SubCategory` 的子集

**实现文件:**
- `backend/src/types/index.ts` - 类型定义
- `frontend/src/types/index.ts` - 前端镜像 (应与后端匹配)

---

## Prompt 构建器架构

系统实现了 **多占卜 Prompt 构建器系统**，支持不同的占卜方法 (紫微斗数, 八字命理, 奇门遁甲, 六爻预测, 手相占卜)，每种都有自己的专用提示和知识库。

### 架构概览

**Frontend 结构** (`frontend/src/services/prompts/`):
```
prompts/
├── index.ts          # 工厂类，管理所有 prompt 构建器
├── ziwei.ts          # 紫微斗数专属 prompt + 知识库
├── bazi.ts           # 八字命理专属 prompt + 知识库
├── qimen.ts          # 奇门遁甲专属 prompt + 知识库
├── liuyao.ts         # 六爻预测专属 prompt + 知识库
└── palmistry.ts      # 手相占卜专属 prompt + 知识库
```

**Backend 结构** (`backend/src/prompts/`):
```
prompts/
├── index.ts          # 工厂类，管理所有 prompt 构建器
├── ziwei.ts          # 紫微斗数专属 prompt
└── others.ts         # 其他占卜方法 prompt (八字、奇门、六爻、手相)
```

### Prompt Builder Interface

所有 Prompt 构建器实现 `PromptBuilder` 接口:

```typescript
interface PromptBuilder {
  getType(): string;                           // 返回占卜方法类型
  buildPrompt(chartText, category, knowledge, userMessage, history): PromptBuildResult;
  getKnowledge(category): string;              // 获取知识库内容
  getCategoryName(category): string;          // 获取类别名称
  getSupportedCategories(): SubCategory[];     // 获取支持的类别列表
}
```

### Category-Based Routing

工厂自动将类别路由到适当的构建器:

```typescript
// 紫微斗数专属类别
['ziweigeju', 'sixi', 'dashun'] → ZiweiPromptBuilder

// 八字专属类别
['geju', 'yongshen', 'shishen', 'dayun'] → BaziPromptBuilder

// 奇门遁甲专属类别
['jushi', 'men', 'xing', 'shen'] → QimenPromptBuilder

// 六爻专属类别
['gua', 'liuyaoyin', 'shiyin'] → LiuyaoPromptBuilder

// 手相专属类别
['xian', 'qiu', 'zhi', 'wen'] → PalmistryPromptBuilder

// 通用类别 → 默认使用紫微斗数
['career', 'wealth', 'relationship', 'health', 'family', 'general'] → ZiweiPromptBuilder
```

### Key Differences Between Divination Methods

| 占卜方法 | AI Persona | 核心术语 | 数据结构 |
|---------|-----------|---------|---------|
| 紫微斗数 | "天机大师" | 命宫、官禄宫、星曜、四化、大限、流年 | ZiweiChart (12宫位) |
| 八字命理 | "八字先生" | 日主、用神、喜忌、十神、格局 | BaziChart (四柱八字) |
| 奇门遁甲 | "奇门先生" | 九星、八门、八神、格局、值符 | QimenChart (天盘地盘人盘) |
| 六爻预测 | "六爻先生" | 用神、世应、六亲、卦象、爻辞 | LiuyaoGua (六爻卦象) |
| 手相占卜 | "手相先生" | 掌纹、丘位、手指、生命线、智慧线 | PalmReading (手相特征) |

---

## ReAct 模式和工具调用

系统实现了 **ReAct (推理 + 行动) 模式**，支持工具调用功能，使 AI 代理能够:
- 主动决定是否调用工具
- 执行知识库搜索
- 调用外部 API (如日历、黄历)
- 支持多轮工具调用 (工具链)

### 架构概览

ReAct 模式使用带工具集成的 LangGraph 状态机实现:

**ReAct 流程:**
```
router → enterReAct
              ↓
        ┌─────┴─────┐
        ↓           ↓
  reasoning ← toolCall
        ↓           ↑
    ┌───┴─────┐    │
    ↓         ↓    │
finalAnswer    └────┘
    ↓
__end__
```

**原始流程 (保留):**
```
__start__ → router → retrieve{Category} → analyze → respond → __end__
```

### Tool System

**Tool Definition Interface:**
```typescript
interface Tool {
  name: string;                    // Tool name (unique identifier)
  description: string;             // Tool description (for AI)
  parameters: ToolParameter[];     // Parameter definitions
  handler: ToolHandler;            // Tool processor
  category: 'knowledge' | 'external'; // Tool category
}
```

**可用工具:**

**1. Knowledge Search Tool (`knowledge_search`)**
- **用途**: 动态搜索占卜知识库
- **参数**: `category`, `keywords[]`, `chartText?`
- **使用**: 当用户询问特定星曜、宫位或格局时

**2. Calendar/Almanac Tool (`calendar_almanac`)**
- **用途**: 查询日历和黄历信息
- **参数**: `date` (YYYY-MM-DD), `detail?`
- **使用**: 当用户询问特定日期或想要黄历建议时

### ReAct Nodes Implementation

**核心节点:**

**1. Reasoning Node (`reactReasoningNode`)**
- AI 决定是否需要工具
- 解析 AI 决策并适当路由
- 最多 5 次工具调用以防止无限循环

**2. Tool Call Node (`reactToolCallNode`)**
- 执行 AI 决策的工具调用
- 格式化观察结果供 AI 消费
- 优雅地处理错误并继续流程

**3. Final Answer Node (`reactFinalAnswerNode`)**
- 基于所有工具结果生成综合响应
- 组合命盘分析和外部信息

### State Machine Integration

**扩展状态字段:**
```typescript
StateAnnotation.extend({
  useReAct: boolean,              // ReAct mode toggle
  reasoning: string[],           // AI thinking process (background only)
  toolCalls: ToolCallRequest[],  // Tool call history
  toolResults: ToolCallResponse[], // Tool execution results
  maxToolCalls: number,          // Maximum tool calls (default: 5)
  toolCallCount: number,         // Current tool call count
  reactPhase: 'thought' | 'action' | 'observation' | 'final' | 'error',
  finalAnswer: string
});
```

**集成策略:**
- **向后兼容**: 默认 `useReAct = false`
- **条件路由**: 路由器在原始流程和 ReAct 流程之间决定
- **保留的 API**: 现有端点不变
- **新端点**: `POST /api/chat/react` 用于 ReAct 模式

---

## iztro 集成

`iztro` 库用于所有占卜计算。它处理:
- 阳/阴历转换
- 12 宫位计算
- 主/小星曜放置
- 四化 (四化)

**使用命盘数据时:** 始终将命盘信息格式化为字符串用于 AI 提示。`chartService.ts` 有辅助方法。

### Chart Formatting

系统在 `frontend/src/services/chartService.ts` 中提供两个命盘格式化函数:

**1. `formatChartForAI(chart: ZiweiChart)`**
- AI 处理的紧凑格式
- 内部用于快速分析
- 结构:
  ```
  【紫微斗数命盘】
  【基本信息】
  【十二宫位详情】
  命宫 [壬子]: 主星: 紫微(庙)、天机(旺)
  ```

**2. `formatChartToReadableText(chart: ZiweiChart)`**
- 匹配 Python `convert.py` 样式的详细格式
- 用于 AI 提示和报告生成
- 包含所有宫位详细信息和 convert.py 格式:
  ```
  ----------基本信息----------
  命主性别：女
  阳历生日：2000-08-16
  生辰时辰：午时 (12点)
  ----------宫位信息----------
  宫位1号位，宫位名称是命宫。
  宫位天干为壬，宫位地支为子。
  不是身宫，不是来因宫。
  主星:紫微（本命星耀，亮度为庙，化禄四化星）
  辅星：文昌（本命星耀）
  杂耀:左辅（本命星耀）
  长生 12 神:长生。
  博士 12 神:青龙。
  ```

**3. `getHourName(hour: number)`**
- 将小时值 (0, 2, 4, ... 22) 转换为中文时辰名称
- 示例: `hour=12` → "午时", `hour=6` → "卯时"
- **始终使用此函数而不是手动计算**

### Report Export

报告使用 `frontend/src/services/exportService.ts` 中的 `ExportService` 生成:

- **`exportSimpleReport(chart, content)`** - 包含完整命盘详细信息的快速导出
- **`generateMarkdownReport(chart, type, content, messages)`** - 带统计的完整报告

所有报告包含 `formatChartToReadableText()` 输出以获取详细宫位信息。

### Auto-Save Reports

**自动报告保存**: 当用户点击 "生成综合报告" 时，系统自动:

1. **生成完整报告** 带 convert.py 样式命盘详细信息
2. **保存到服务器** 自动到 `backend/reports/` 目录
3. **文件名格式**: `紫微斗数分析_YYYY年MM月DD日_YYYY-MM-DD.md`

**新 API 端点**:
- `POST /api/reports/save` - 保存报告到服务器文件系统
- `GET /api/reports` - 列出所有保存的报告
- `GET /api/reports/:filename` - 读取特定报告
- `DELETE /api/reports/:filename` - 删除报告

---

## 数据库模式

后端使用 **better-sqlite3** 进行本地 SQLite 数据库存储。

### Tables

**1. knowledge_entries** - 存储知识库条目
```sql
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  stars TEXT,          -- JSON array
  palaces TEXT,        -- JSON array
  keywords TEXT,       -- JSON array
  created_at INTEGER,
  updated_at INTEGER
)
```

**2. analysis_cache** - 缓存 AI 分析结果
```sql
CREATE TABLE analysis_cache (
  id TEXT PRIMARY KEY,
  chartKey TEXT NOT NULL,
  analysisType TEXT NOT NULL,
  result TEXT NOT NULL,
  tokenCount INTEGER,
  executionTime REAL,
  hitCount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
)
```

**数据库文件:**
- 位置: `backend/src/database/`
- 模式: `backend/src/database/schema.sql`
- 迁移: `backend/src/database/index.ts` (启动时自动运行)
- 种子: `backend/src/database/seeds/seed.ts`

---

## 缓存系统

系统实现了 **智能缓存** 以减少 AI API 调用并提高响应时间:

**缓存键生成:**
```typescript
// backend/src/index.ts (line 51-65)
const chartKey = createHash('sha256')
  .update(JSON.stringify(birthInfo))
  .digest('hex')
  .substring(0, 16);
```

**缓存流程:**
```
Request arrives
  ↓
Generate chartKey (hash of birthInfo)
  ↓
Check cacheRepository.get(chartKey, category)
  ├─ CACHE HIT
  │   ├─ Increment hit count
  │   ├─ Return cached result immediately
  │   └─ Add "fromCache: true" flag to SSE
  │
  └─ CACHE MISS
      ├─ Call LangGraph state machine
      ├─ Stream AI response
      ├─ Save result to cache
      └─ Set expiration (30 days default)
```

**缓存管理:**
- **TTL (Time To Live):** 30 天 (可配置)
- **命中跟踪:** 每次缓存命中时 `hitCount` 字段增加
- **自动过期:** 过期条目可通过 API 清理
- **缓存失效:** 按 chartKey 或类别手动删除

**缓存 API 端点:**
- `GET /api/cache/stats` - 整体缓存统计
- `GET /api/cache/:chartKey` - 获取特定缓存条目
- `DELETE /api/cache/:chartKey` - 删除特定缓存条目
- `DELETE /api/cache/expired/:days` - 清理 N 天前的条目
- `DELETE /api/cache/category/:category` - 按类别清除

---

## AI 提供商集成

**多提供商架构:**

系统支持 **三个 AI 提供商**，具有智能降级机制:

**提供商优先级 (截至 2025-01):**
1. **默认提供商:** `deepseek` - 成本效益高且性能好
2. **降级提供商:** `minimax`, `anthropic`
3. **模拟模式:** 未配置 API 密钥时返回预定义响应

**支持的提供商:**

**1. DeepSeek** (`deepseek`) - **默认**
- 模型: `deepseek-chat`
- 需要: `.env` 中的 `DEEPSEEK_API_KEY`
- 最大 tokens: 2048
- 流式: 通过自定义客户端支持
- 客户端: `backend/src/clients/deepseekClient.ts`
- 成本: 最经济的选择
- 性能: 中文内容表现优异

**2. MiniMax** (`minimax`)
- 模型: 通过 `MINIMAX_MODEL` 环境变量可配置 (默认: `abab6.5s-chat`)
- 需要: `.env` 中的 `MINIMAX_API_KEY`
- 流式: 通过自定义客户端支持
- 客户端: `backend/src/clients/minimaxClient.ts`
- 特长: 强大的中文语言理解

**3. Anthropic Claude** (`anthropic`)
- 模型: `claude-sonnet-4-20250514`
- 需要: `.env` 中的 `ANTHROPIC_API_KEY`
- 最大 tokens: 2048
- 流式: 通过官方 SDK `messages.stream()` 支持
- 成本: 最昂贵但质量最高

**Provider Selection Logic:**
```typescript
// backend/src/services/interpretationService.ts (line 28-119)
1. Check all API keys availability
2. Try DEFAULT_PROVIDER first (deepseek)
3. If unavailable/fails, try other available providers
4. If all fail, return mock response
```

**AI Persona:**
- 名称: "天机大师" (Master Tianji)
- 分析风格: **客观、专业、基于事实、成本意识**
- 核心原则:
  - **客观中立** - 诚实的分析，不粉饰
  - **成本意识** - 说明实现结果所需的努力/成本
  - **专业准确** - 使用技术术语，避免华丽语言
  - **直面困难** - 直接指出问题，不急于"解决方案"
  - **避免过度承诺** - 不做像"必有大成"这样的绝对保证
- 系统提示: 组合命盘数据 + 知识库 + 对话历史
- 温度: 默认 (未明确设置，使用模型默认值)

**Prompt Design Philosophy (Updated 2026-01):**
系统已更新以优先考虑 **客观性而非舒适**:
- 旧方法: "积极正面，即使遇到不利的格局也给出化解建议"
- 新方法: "直面困难，对不利格局直接指出问题所在，不要急于给化解方法"
- 原因: 用户反馈表明报告 **过度美化** 且缺乏实用价值
- 目标: 提供 **实事求是** (基于事实) 的分析，帮助用户做出现实决策

**Implementation Files:**
- `backend/src/services/interpretationService.ts` - 提供商选择和编排
- `backend/src/clients/deepseekClient.ts` - DeepSeek API 客户端
- `backend/src/clients/minimaxClient.ts` - MiniMax API 客户端
- Anthropic 使用官方 `@anthropic-ai/sdk` 包
