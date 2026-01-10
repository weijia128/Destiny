# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level
- `npm run install:all` - Install dependencies for all packages
- `npm run dev` - Start both frontend and backend in parallel
- `npm run dev:frontend` - Start frontend only
- `npm run dev:backend` - Start backend only
- `npm run build` - Build both frontend and backend
- `npm run build:frontend` - Build frontend only
- `npm run build:backend` - Build backend only

### Frontend (cd frontend)
- `npm run dev` - Start Vite dev server (port 3000)
- `npm run build` - TypeScript compile + Vite build
- `npm run preview` - Preview production build
- `npm run test` - Run tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Backend (cd backend)
- `npm run dev` - Start tsx watch server (port 8000)
- `npm run build` - TypeScript compile
- `npm run start` - Run compiled JavaScript
- `npm run test` - Run tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### RAG Service (cd backend-rag)
- Setup: `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- Initialize: `python scripts/init_knowledge.py`
- Start: `python -m app.main` (port 8001)

### Environment Setup
Backend requires `.env` file with AI provider API keys. Copy from `backend/.env.example`.

**Required for production:**
- `DEEPSEEK_API_KEY` - DeepSeek AI (recommended, most cost-effective)

**Optional providers:**
- `MINIMAX_API_KEY` - MiniMax AI (fallback)
- `ANTHROPIC_API_KEY` - Claude AI (fallback)

**RAG Service (Vector Database):**
- `OPENAI_API_KEY` - OpenAI API key for embeddings (required for backend-rag)

**Example `.env` configuration:**
```bash
# Recommended: DeepSeek (best value)
DEEPSEEK_API_KEY=sk-...

# Optional: Additional providers for fallback
MINIMAX_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...

# Server configuration
PORT=8000

# RAG Service (backend-rag/)
OPENAI_API_KEY=sk-...

## Architecture Overview

This is a **紫微斗数命理分析系统** (Ziwei Destiny Analysis System) - a fortune-telling application using LangGraph-style state machine architecture.

### Monorepo Structure
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

### Key Technologies
- **Frontend**: React 18, Zustand (state), Tailwind CSS, Framer Motion, iztro (astrology chart library)
- **Backend**: Express, LangGraph (state machine), better-sqlite3 (database)
- **RAG Service**: FastAPI, Chroma (vector database), OpenAI embeddings, BM25 keyword search
- **AI Providers**: DeepSeek (default), MiniMax, Anthropic Claude
- **Astrology**: iztro library for Chinese Ziwei astrology calculations
- **State Machine**: LangGraph for workflow orchestration
- **Caching**: SQLite with 30-day TTL

## State Machine Architecture

The system implements a **dual-layer state machine** inspired by LangGraph:

### Backend State Machine (`backend/src/agents/destinyAgent.ts`)
States: `init` → `retrieve` → `analyze` → `respond` → `done` (with `error` handling)

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

**State Machine Execution Flow:**

1. **init** - Initialize agent with chart info, category, and conversation history
   - `initialize(chartInfo, category, history)` - Load context into agent state

2. **retrieve** - Fetch relevant knowledge from knowledge base
   - `nodeRetrieve(userMessage)` - Extract keywords from user message and chart
   - `getRelevantKnowledge(category, chart, userMessage)` - Query knowledge base
   - Stores retrieved context in `state.retrievedContext`

3. **analyze** - Build comprehensive analysis prompt
   - `buildAnalysisPrompt(userMessage)` - Construct system prompt + messages
   - Combines: chart data + retrieved knowledge + conversation history

4. **respond** - Generate AI response
   - `streamRespond(userMessage)` - AsyncGenerator for SSE streaming
   - Supports multiple AI providers (Anthropic, MiniMax, Mock)

5. **done** - Complete the analysis cycle

**Key Components:**
- `DestinyAnalysisAgent` class - Encapsulates the entire state machine
- `nodeRetrieve()` - Knowledge base retrieval (line 135-146)
- `buildAnalysisPrompt()` - Prompt construction with full context (line 151-205)
- `streamRespond()` - AsyncGenerator for real-time SSE streaming (line 262-327)
- Dual AI provider support with automatic fallback
- Mock responses when no API keys configured

### LangGraph State Machine Architecture (`backend/src/graph/`)

The backend now uses **LangGraph** (inspired by LangChain) for state machine orchestration:

**File Structure:**
- `graph/destinyGraph.ts` - State graph compilation and execution
- `graph/nodes.ts` - Individual node implementations
- `types/graph.ts` - State type definitions

**State Graph Flow:**
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

**State Object Structure:**
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

**Execution Methods:**
- `streamAnalyzeDestiny()` - Streaming execution with SSE (used in API endpoints)
- Graph compilation: `new StateGraph<DestinyGraphState>()` with conditional edges

**Key Files:**
- `backend/src/graph/destinyGraph.ts` - Graph definition and compilation
- `backend/src/graph/nodes.ts` - Node implementations (router, retrieve*, retrieveRAG, analyze, respond)
- `backend/src/types/graph.ts` - TypeScript type definitions (includes metadata field)

### RAG System Architecture (`backend-rag/`)

The system implements a **hybrid RAG architecture** combining vector search, keyword search, and GraphRAG:

**Architecture Overview:**
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

**Retrieval Strategies:**
1. **HYBRID_VECTOR** - 向量检索 + BM25 关键词检索 + Reranker 重排序
2. **GRAPH_LOCAL** - 基于实体邻居的图谱局部检索
3. **GRAPH_GLOBAL** - 基于社区摘要的图谱全局检索
4. **CROSS_TYPE** - 跨命理类型检索 (如涉及五行等共通概念)

**Key Components:**

**1. Query Router** (`backend-rag/app/services/router.py`)
- Classifies query type (palace/star/fortune/pattern)
- Detects complexity (length, entity count)
- Extracts entities (stars, palaces, transformations)

**2. Retrieval Planner** (`backend-rag/app/services/planner.py`)
- Selects optimal retrieval strategy based on query
- Estimates cost and time for each strategy

**3. Unified Retriever** (`backend-rag/app/services/unified_retriever.py`)
- Integrates hybrid, GraphRAG, and cross-type retrievers
- Provides single interface for all search operations

**4. Chroma Service** (`backend-rag/app/services/chroma_service.py`)
- Manages vector database operations
- Persistent storage at `./chroma_db`

**5. BM25 Service** (`backend-rag/app/services/bm25_service.py`)
- Keyword-based search using jieba tokenization
- Complementary to vector search

**Knowledge Organization:**
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
- `POST /api/rag/search` - Vector/keyword search
- `POST /api/rag/query` - Full RAG query with LLM generation
- `POST /api/knowledge/upload` - Upload document to knowledge base
- `POST /api/knowledge/text` - Add text directly
- `GET /api/knowledge/stats` - Knowledge statistics
- `GET /health` - Health check

**Integration with LangGraph:**
The `retrieveRAGNode` in `backend/src/graph/nodes.ts` connects to the RAG service:
- Supports new categories: `ziweigeju`, `sixi`, `dashun`, `geju`, `yongshen`, etc.
- Falls back to legacy knowledge when RAG service unavailable
- Returns metadata (strategy, entities, sources) for debugging

**Starting RAG Service:**
```bash
cd backend-rag
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python scripts/init_knowledge.py  # Initialize knowledge base
python -m app.main  # Start on port 8001
```

### Frontend State Management (`frontend/src/store/`)
Uses **Zustand** for lightweight state management with localStorage persistence.

**Store Structure:**
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

**Persistence:**
- Automatically persists to localStorage under key `ziwei-destiny-storage`
- Persisted fields: `birthInfo`, `chart`, `messages`
- Rehydrates on page reload for seamless user experience

### Data Flow
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

## API Endpoints

All backend endpoints are prefixed with `/api/`:

**Core Analysis:**
- `GET /api/health` - Health check
- `POST /api/chat` - Non-streaming chat (returns complete response)
- `POST /api/chat/stream` - **SSE streaming chat** (primary endpoint)

**Knowledge Base:**
- `POST /api/knowledge/search` - Search knowledge base by category/keywords

**Reports:**
- `POST /api/reports/save` - Save report to server filesystem
- `GET /api/reports` - List all saved reports
- `GET /api/reports/:filename` - Read specific report content
- `DELETE /api/reports/:filename` - Delete report

**Cache Management:**
- `GET /api/cache/stats` - Overall cache statistics
- `GET /api/cache/:chartKey` - Get specific cache entry
- `DELETE /api/cache/:chartKey` - Delete specific cache entry
- `DELETE /api/cache/expired/:days` - Clean expired entries (older than N days)
- `DELETE /api/cache/category/:category` - Clear cache by category

### Request Format (`ChatRequest`)
```typescript
{
  prompt: string;        // Complete analysis prompt with detailed chart info
  chart: string;         // Formatted ziwei chart data (formatChartToReadableText output)
  category: AnalysisCategory;  // 'career' | 'wealth' | 'relationship' | 'health' | 'family' | 'general'
  history: ChatMessage[]; // Conversation history (last 10 messages)
}
```

**Important:** The `chart` field contains the detailed output from `formatChartToReadableText()`, providing complete palace information in convert.py format to the backend AI.

## Knowledge Base System

Located in `backend/src/knowledge/index.ts`:

**Categories:** career, wealth, relationship, health, family, general

### Knowledge Entry Structure
Each knowledge entry has:
- `id` - Unique identifier (e.g., "career-1", "wealth-2")
- `category` - AnalysisCategory type
- `title` - Entry title
- `content` - Detailed knowledge content (markdown formatted)
- `stars` - Related astrology stars array (e.g., ['紫微', '武曲', '天机'])
- `palaces` - Related chart palaces array (e.g., ['官禄宫', '财帛宫'])
- `keywords` - Search keywords array (e.g., ['事业', '工作', '职业'])

### Knowledge Retrieval Pipeline

**1. Entry Point:** `getRelevantKnowledge(category, chart, userMessage)` (line 362-374)

**2. Keyword Extraction:** `extractKeywords(text)` (line 379-393)
   - Combines user message + chart info
   - Matches against predefined patterns:
     - 14 major stars (紫微, 天机, 太阳, 武曲, etc.)
     - 4 transformations (化禄, 化权, 化科, 化忌)
     - 12 palaces (命宫, 兄弟宫, 夫妻宫, etc.)
     - Domain keywords (事业, 财运, 感情, 健康, etc.)

**3. Knowledge Retrieval:** `retrieveKnowledge(category, keywords)` (line 342-358)
   - Filters by category
   - Scores entries by keyword matches in:
     - Entry keywords
     - Related stars
     - Related palaces
   - Returns top 3 most relevant entries

**4. Formatting:** `formatKnowledgeForAI(entries)` (line 326-340)
   - Converts entries to readable markdown format
   - Includes title, content, and metadata
   - Feeds into AI system prompt

**Current Implementation:**
- In-memory knowledge base (array of 20+ entries)
- Simple keyword matching algorithm
- Category-based filtering

**Future Enhancement:**
- Migration to vector database (Pinecone/Qdrant/Milvus)
- Semantic search with embeddings
- Dynamic knowledge base updates

### Frontend Knowledge Base (`frontend/src/services/agentService.ts`)

The frontend also maintains a **local knowledge base** to reduce backend calls:

**Structure:**
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

**Usage:**
```typescript
// Retrieve knowledge before API call
const knowledge = retrieveKnowledge(category, chart);

// Build prompt with knowledge context
const prompt = buildAnalysisPrompt(category, chart, userMessage, knowledge);

// Send to backend with context
await streamChat(prompt, chart, category, history);
```

**Benefits:**
- **Reduced Latency:** No extra API call for knowledge retrieval
- **Offline Capability:** Can build prompts without backend
- **Consistency:** Same knowledge base used across all sessions
- **Easy Updates:** Simple string-based knowledge editing

**Integration with Backend:**
- Frontend knowledge is **pre-loaded** and passed in the prompt
- Backend also has knowledge base for server-side operations
- Both sources are synchronized for consistent analysis

**Key Functions:**
- `retrieveKnowledge(category, chart)` - Get relevant knowledge (line 122-137)
- `buildAnalysisPrompt(category, chart, message, knowledge)` - Construct prompt (line 139-219)

## Frontend Component Structure

`frontend/src/components/`:
- `StarField.tsx` - Animated starfield background
- `CategorySelect.tsx` - Main category selection (Ziwei, Bazi, etc.)
- `BirthInfoForm.tsx` - Birth date/time/gender collection
- `ChartDisplay.tsx` - 4x4 grid astrology chart display
- `AnalysisCategorySelector.tsx` - Select analysis category (career, wealth, etc.)
- `ChatInterface.tsx` - Main chat UI with streaming responses

`frontend/src/services/`:
- `chartService.ts` - iztro chart calculations, chart formatting for AI/export
- `agentService.ts` - Frontend state machine orchestration
- `api.ts` - HTTP client with SSE support
- `exportService.ts` - Markdown report generation with detailed chart info

## Important Conventions

### Type System Architecture

The system uses a **flexible category type system** to support multiple divination methods:

**Category Type Hierarchy:**
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

**Usage Guidelines:**
- **New code:** Use `SubCategory` type for maximum flexibility
- **Legacy code:** `AnalysisCategory` still works (maps to universal categories)
- **Type compatibility:** `AnalysisCategory` is a subset of `SubCategory`

**Type Mapping:**
```typescript
// Universal categories work across all divination methods
const universalCategories: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general'
];

// Method-specific categories enhance specialized analysis
const ziweiCategories: SubCategory[] = [
  ...universalCategories, 'ziweigeju', 'sixi', 'dashun'
];

const baziCategories: SubCategory[] = [
  ...universalCategories, 'geju', 'yongshen', 'shishen', 'dayun'
];
```

**Implementation Files:**
- `backend/src/types/index.ts` - Type definitions
- `frontend/src/types/index.ts` - Frontend mirror (should match backend)

**Migration Note:** When adding support for new divination methods (八字, 奇门遁甲, etc.), add new categories to `SubCategory` type while maintaining backward compatibility with existing `AnalysisCategory` code.

## Prompt Builder Architecture

The system implements a **multi-divination prompt builder system** that supports different fortune-telling methods (紫微斗数, 八字命理, 奇门遁甲, 六爻预测, 手相占卜) with their own specialized prompts and knowledge bases.

### Architecture Overview

**Frontend Structure** (`frontend/src/services/prompts/`):
```
prompts/
├── index.ts          # 工厂类，管理所有 prompt 构建器
├── ziwei.ts          # 紫微斗数专属 prompt + 知识库
├── bazi.ts           # 八字命理专属 prompt + 知识库
├── qimen.ts          # 奇门遁甲专属 prompt + 知识库
├── liuyao.ts         # 六爻预测专属 prompt + 知识库
└── palmistry.ts      # 手相占卜专属 prompt + 知识库
```

**Backend Structure** (`backend/src/prompts/`):
```
prompts/
├── index.ts          # 工厂类，管理所有 prompt 构建器
├── ziwei.ts          # 紫微斗数专属 prompt
└── others.ts         # 其他占卜方法 prompt (八字、奇门、六爻、手相)
```

### Prompt Builder Interface

All prompt builders implement the `PromptBuilder` interface:

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

The factory automatically routes categories to the appropriate builder:

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

### Usage Examples

**Frontend:**
```typescript
import { promptBuilderFactory, ZiweiPromptBuilder } from '@/services/prompts';

// 自动选择构建器
const builder = promptBuilderFactory.getBuilderByCategory('ziweigeju');
const result = builder.buildPrompt(
  formattedData,
  category,
  knowledge,
  userMessage,
  history
);

// 格式化紫微斗数命盘
const chartData = ZiweiPromptBuilder.formatChart(ziweiChart);
```

**Backend:**
```typescript
import { promptBuilderFactory } from '../prompts/index.js';

// 在 interpretationService 中使用
static buildPrompt(chartText, category, knowledge, userMessage, history) {
  const builder = promptBuilderFactory.getBuilderByCategory(category);
  return builder.buildPrompt(chartText, category, knowledge, userMessage, history);
}
```

### Key Differences Between Divination Methods

| 占卜方法 | AI Persona | 核心术语 | 数据结构 |
|---------|-----------|---------|---------|
| 紫微斗数 | "天机大师" | 命宫、官禄宫、星曜、四化、大限、流年 | ZiweiChart (12宫位) |
| 八字命理 | "八字先生" | 日主、用神、喜忌、十神、格局 | BaziChart (四柱八字) |
| 奇门遁甲 | "奇门先生" | 九星、八门、八神、格局、值符 | QimenChart (天盘地盘人盘) |
| 六爻预测 | "六爻先生" | 用神、世应、六亲、卦象、爻辞 | LiuyaoGua (六爻卦象) |
| 手相占卜 | "手相先生" | 掌纹、丘位、手指、生命线、智慧线 | PalmReading (手相特征) |

### Adding a New Divination Method

To add support for a new fortune-telling method:

1. **Create a new prompt builder** (`frontend/src/services/prompts/newmethod.ts`):
```typescript
export class NewMethodPromptBuilder implements PromptBuilder {
  getType(): string { return 'newmethod'; }

  buildPrompt(chartText, category, knowledge, userMessage, history) {
    // Return specialized prompt for this method
  }

  getKnowledge(category): string {
    // Return knowledge base for this method
  }

  // ... implement other methods
}
```

2. **Register in factory** (`frontend/src/services/prompts/index.ts`):
```typescript
import { NewMethodPromptBuilder } from './newmethod';

constructor() {
  this.register(new NewMethodPromptBuilder());
}
```

3. **Add categories** to `SubCategory` type in `types/index.ts`:
```typescript
export type SubCategory =
  | ...existingCategories
  // New method categories
  | 'newcategory1' | 'newcategory2';
```

4. **Update routing logic** in `getBuilderByCategory()` to handle new categories

### Knowledge Base Per Method

Each divination method has its own specialized knowledge base:

**紫微斗数** (ziwei.ts):
- 事业运势：官禄宫、命宫主星、迁移宫
- 财运分析：财帛宫、武曲星、化禄
- 感情姻缘：夫妻宫、桃花星、红鸾天喜
- 紫微格局：紫府同宫、杀破狼格等
- 四化飞星：化禄、化权、化科、化忌
- 大运分析：大限、流年、时空定位

**八字命理** (bazi.ts):
- 事业运势：正官、七杀、食伤、印星
- 财运分析：正财、偏财、财星得位
- 感情姻缘：男命看财星、女命看官杀
- 八字格局：正格、从格、化格
- 用神分析：用神、喜神、忌神
- 十神分析：正官、七杀、正财、偏财等

**奇门遁甲** (qimen.ts):
- 事业运势：开门、值符、九星
- 财运分析：生门、财星、八神
- 局数分析：阳遁、阴遁、定局
- 八门分析：休生伤杜景死惊开
- 九星分析：天蓬、天任、天冲等
- 八神分析：值符、腾蛇、太阴等

**六爻预测** (liuyao.ts):
- 事业运势：官鬼爻、父母爻
- 财运分析：妻财爻、兄弟爻
- 感情姻缘：男测财、女测官
- 卦象分析：六十四卦、卦名
- 六爻用神：用神取法、原神忌神
- 世应分析：世爻、应爻关系

**手相占卜** (palmistry.ts):
- 事业运势：事业线、智慧线、太阳线
- 财运分析：财富线、金星丘、小指
- 感情姻缘：感情线、婚姻线、桃花
- 掌纹线路：生命线、智慧线、感情线
- 掌丘分析：金星丘、木星丘等
- 手指特征：手指长度、指甲形状

### Benefits of This Architecture

1. **Separation of Concerns**: Each divination method has its own prompt and knowledge
2. **Easy to Extend**: Add new methods without modifying existing code
3. **Type Safety**: TypeScript ensures correct prompt builder usage
4. **Consistent Interface**: All builders implement the same interface
5. **Automatic Routing**: Factory automatically selects the right builder based on category

## ReAct Pattern and Tool Calling

The system implements a **ReAct (Reasoning + Acting) pattern** with tool calling capabilities, enabling AI agents to:
- Actively decide whether to call tools
- Execute knowledge base searches
- Call external APIs (e.g., calendar, almanac)
- Support multi-round tool calling (tool chains)

### Architecture Overview

The ReAct pattern is implemented using LangGraph state machine with tool integration:

**ReAct Flow:**
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

**Original Flow (Maintained):**
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

**Available Tools:**

**1. Knowledge Search Tool (`knowledge_search`)**
- **Purpose**: Dynamic search of fortune-telling knowledge base
- **Parameters**: `category`, `keywords[]`, `chartText?`
- **Usage**: When users ask about specific stars, palaces, or patterns

**2. Calendar/Almanac Tool (`calendar_almanac`)**
- **Purpose**: Query calendar and almanac information
- **Parameters**: `date` (YYYY-MM-DD), `detail?`
- **Usage**: When users ask about specific dates or want almanac advice

**Tool Registry:**
```typescript
class ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  getAll(): Tool[];
  getByCategory(category): Tool[];
  formatForAI(): string; // Format tools list for AI consumption
}
```

### ReAct Nodes Implementation

**Core Nodes:**

**1. Reasoning Node (`reactReasoningNode`)**
- AI decides whether tools are needed
- Parses AI decisions and routes appropriately
- Maximum 5 tool calls to prevent infinite loops

**2. Tool Call Node (`reactToolCallNode`)**
- Executes AI-decided tool calls
- Formats observation results for AI consumption
- Handles errors gracefully and continues flow

**3. Final Answer Node (`reactFinalAnswerNode`)**
- Generates comprehensive response based on all tool results
- Combines chart analysis with external information

### ReAct System Prompt

**Tool Usage Instructions:**
```typescript
const reActPrompt = `You are a fortune-telling analyst with tool capabilities.

**Available Tools:**
${toolsList}

**Output Format:**
If tool call needed:
```
需要: 是
工具: tool_name
参数: {"param": "value"}
思考: [reasoning process]
```

If no tool needed:
```
需要: 否
思考: [reasoning process]
最终答案: [direct answer]
```

**Constraints:**
- Maximum 5 tool calls
- Tools should have clear purposes
- Prefer existing knowledge, use tools when necessary
```

### State Machine Integration

**Extended State Fields:**
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

**Integration Strategy:**
- **Backward Compatible**: Default `useReAct = false`
- **Conditional Routing**: Router decides between original flow and ReAct flow
- **Preserved APIs**: Existing endpoints unchanged
- **New Endpoint**: `POST /api/chat/react` for ReAct mode

### API Endpoints

**New ReAct Endpoint:**
```typescript
// POST /api/chat/react
{
  prompt: string,
  chart: string,
  category: AnalysisCategory,
  history: ChatMessage[],
  enableReAct: boolean = true
}
```

**Response Format:**
```typescript
// Server-Sent Events
data: {"type": "token", "content": "chunk1"}
data: {"type": "token", "content": "chunk2"}
data: [DONE]
```

### Tool Execution Example

```
User: "我的事业运势如何？"

↓ AI Reasoning
"需要了解命盘中事业相关的星曜配置"

↓ Tool Call
tool: knowledge_search
params: {"category": "career", "keywords": ["事业", "命宫", "官禄宫"]}

↓ Tool Result
"官禄宫显示武曲星坐守..."

↓ AI Reasoning Again
"需要查看当前日期的黄历"

↓ Tool Call
tool: calendar_almanac
params: {"date": "2025-01-04"}

↓ Tool Result
"今日宜：嫁娶、出行、移讼..."

↓ Final Answer
综合命盘信息和今日黄历，您的事业运势...
```

### Implementation Files

**New Files (6):**
1. `backend/src/tools/types.ts` - Tool type definitions
2. `backend/src/tools/registry.ts` - Tool registry
3. `backend/src/tools/knowledgeSearchTool.ts` - Knowledge search tool
4. `backend/src/tools/calendarTool.ts` - Calendar/almanac tool
5. `backend/src/graph/reactNodes.ts` - ReAct nodes
6. `backend/src/graph/reactGraph.ts` - ReAct state machine

**Modified Files (4):**
1. `backend/src/types/graph.ts` - Extended state definitions
2. `backend/src/graph/destinyGraph.ts` - Integrated ReAct support
3. `backend/src/services/interpretationService.ts` - ReAct prompt building
4. `backend/src/index.ts` - New API endpoint

### Key Benefits

1. **Dynamic Knowledge Retrieval**: AI can search knowledge base when needed
2. **External Information Access**: Calendar and almanac integration
3. **Multi-Step Reasoning**: Support for complex analysis requiring multiple tools
4. **Background Processing**: Thinking process hidden from users
5. **Backward Compatibility**: Original functionality preserved
6. **Extensible**: Easy to add new tools

### Usage Guidelines

**For Developers:**
- Tools should have clear purposes and specific use cases
- Maximum 5 tool calls to prevent infinite loops
- Tools must handle errors gracefully
- All tool results should be formatted for AI consumption

**For Users:**
- ReAct mode automatically enabled for complex queries
- Thinking process happens in background
- Final responses integrate all relevant information
- No change to existing user interface

### iztro Integration
The `iztro` library is used for all astrology calculations. It handles:
- Solar/Lunar calendar conversion
- 12 palaces calculation
- Major/minor stars placement
- Four transformations (四化)

**When working with chart data:** Always format chart info as a string for the AI prompt. The `chartService.ts` has helper methods for this.

### Chart Formatting

The system provides two chart formatting functions in `frontend/src/services/chartService.ts`:

**1. `formatChartForAI(chart: ZiweiChart)`**
- Compact format for AI processing
- Used internally for quick analysis
- Structure:
  ```
  【紫微斗数命盘】
  【基本信息】
  【十二宫位详情】
  命宫 [壬子]: 主星: 紫微(庙)、天机(旺)
  ```

**2. `formatChartToReadableText(chart: ZiweiChart)`**
- Detailed format matching Python `convert.py` style
- Used for AI prompts and report generation
- Includes ALL palace details with convert.py formatting:
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
- Converts hour value (0, 2, 4, ... 22) to Chinese hour name
- Example: `hour=12` → "午时", `hour=6` → "卯时"
- **Always use this function instead of manual calculation**

### Report Export

Reports are generated using `ExportService` in `frontend/src/services/exportService.ts`:

- **`exportSimpleReport(chart, content)`** - Quick export with full chart details
- **`generateMarkdownReport(chart, type, content, messages)`** - Complete report with statistics

All reports include `formatChartToReadableText()` output for detailed palace information.

### Auto-Save Reports

**Automatic Report Saving**: When users click "生成综合报告" (Generate Comprehensive Report), the system automatically:

1. **Generates complete report** with convert.py-style chart details
2. **Saves to server** automatically in `backend/reports/` directory
3. **Filename format**: `紫微斗数分析_YYYY年MM月DD日_YYYY-MM-DD.md`

**New API Endpoints**:
- `POST /api/reports/save` - Save report to server filesystem
- `GET /api/reports` - List all saved reports
- `GET /api/reports/:filename` - Read specific report
- `DELETE /api/reports/:filename` - Delete report

**Implementation**:
- `backend/src/services/reportService.ts` - File system operations
- `frontend/src/App.tsx` - Auto-save on report generation
- `frontend/src/services/api.ts` - saveReportToServer() function

**Report Content Structure**:
```
# 紫微斗数命盘分析报告

生成时间: YYYY/M/D HH:MM:SS

----------基本信息----------
命主性别：女
阳历生日：1993-03-30
阴历生日：一九九三年三月初八
八字：癸酉 乙卯 庚戌 乙酉
生辰时辰：酉时 (18点)
...

----------宫位信息----------
宫位1号位，宫位名称是疾厄。
宫位天干为甲，宫位地支为寅。
主星:天同（本命星耀，亮度为利，无四化星）
...

## AI 分析报告

[Generated AI analysis content]
```

## Database Schema

The backend uses **better-sqlite3** for local SQLite database storage.

### Tables

**1. knowledge_entries** - Stores knowledge base entries
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

**2. analysis_cache** - Caches AI analysis results
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

**Cache Strategy:**
- Cache key: Hash of (birthInfo + analysisType)
- Default TTL: 30 days
- Automatic expiration cleanup via DELETE endpoint
- Tracks hit count for popular queries

**Database Files:**
- Location: `backend/src/database/`
- Schema: `backend/src/database/schema.sql`
- Migrations: `backend/src/database/index.ts` (auto-run on startup)
- Seeds: `backend/src/database/seeds/seed.ts`

### Caching System

The system implements **intelligent caching** to reduce AI API calls and improve response times:

**Cache Key Generation:**
```typescript
// backend/src/index.ts (line 51-65)
const chartKey = createHash('sha256')
  .update(JSON.stringify(birthInfo))
  .digest('hex')
  .substring(0, 16);
```

**Cache Flow:**
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

**Cache Management:**
- **TTL (Time To Live):** 30 days (configurable)
- **Hit Tracking:** `hitCount` field increments on each cache hit
- **Automatic Expiration:** Expired entries can be cleaned via API
- **Cache Invalidation:** Manual deletion by chartKey or category

**Cache API Endpoints:**
- `GET /api/cache/stats` - Overall cache statistics
- `GET /api/cache/:chartKey` - Get specific cache entry
- `DELETE /api/cache/:chartKey` - Delete specific entry
- `DELETE /api/cache/expired/:days` - Clean entries older than N days
- `DELETE /api/cache/category/:category` - Clear by category

**Implementation Files:**
- `backend/src/repositories/CacheRepository.ts` - Cache operations (get, set, delete)
- `backend/src/index.ts` (line 51-65) - Cache checking in API endpoint
- `frontend/src/services/api.ts` (line 36-146) - Detects cache hits from SSE

**Cache Benefits:**
- Instant responses for repeated queries
- Reduced AI API costs
- Lower latency for popular birth charts
- Statistics tracking for optimization

### AI Provider Integration

**Multi-Provider Architecture:**

The system supports **three AI providers** with intelligent fallback mechanism:

**Provider Priority (as of 2025-01):**
1. **Default Provider:** `deepseek` - Cost-effective and performant
2. **Fallback Providers:** `minimax`, `anthropic`
3. **Mock Mode:** Returns predefined responses when no API keys configured

**Supported Providers:**

**1. DeepSeek** (`deepseek`) - **DEFAULT**
- Model: `deepseek-chat`
- Requires: `DEEPSEEK_API_KEY` in `.env`
- Max tokens: 2048
- Streaming: Supported via custom client
- Client: `backend/src/clients/deepseekClient.ts`
- Cost: Most economical option
- Performance: Excellent for Chinese content

**2. MiniMax** (`minimax`)
- Model: Configurable via `MINIMAX_MODEL` env var (default: `abab6.5s-chat`)
- Requires: `MINIMAX_API_KEY` in `.env`
- Streaming: Supported via custom client
- Client: `backend/src/clients/minimaxClient.ts`
- Specialty: Strong Chinese language understanding

**3. Anthropic Claude** (`anthropic`)
- Model: `claude-sonnet-4-20250514`
- Requires: `ANTHROPIC_API_KEY` in `.env`
- Max tokens: 2048
- Streaming: Supported via official SDK `messages.stream()`
- Cost: Most expensive but highest quality

**Provider Selection Logic:**
```typescript
// backend/src/services/interpretationService.ts (line 28-119)
1. Check all API keys availability
2. Try DEFAULT_PROVIDER first (deepseek)
3. If unavailable/fails, try other available providers
4. If all fail, return mock response
```

**AI Persona:**
- Name: "天机大师" (Master Tianji)
- Analysis style: **Objective, professional, fact-based, cost-aware**
- Core principles:
  - **客观中立** - Honest analysis without sugar-coating
  - **成本意识** - States what effort/cost is required to achieve results
  - **专业准确** - Uses technical terms, avoids flowery language
  - **直面困难** - Points out problems directly without rushing to "solutions"
  - **避免过度承诺** - No absolute guarantees like "必有大成"
- System prompt: Combines chart data + knowledge base + conversation history
- Temperature: Default (not explicitly set, uses model defaults)

**Prompt Design Philosophy (Updated 2026-01):**
The system was updated to prioritize **objectivity over comfort**:
- Old approach: "积极正面，即使遇到不利的格局也给出化解建议"
- New approach: "直面困难，对不利格局直接指出问题所在，不要急于给化解方法"
- Reason: User feedback indicated reports were **过度美化** (overly beautified) and lacked practical value
- Goal: Provide **实事求是** (fact-based) analysis that helps users make realistic decisions

**Environment Configuration:**
```bash
# .env file (copy from backend/.env.example)
DEEPSEEK_API_KEY=sk-...      # Recommended
MINIMAX_API_KEY=...          # Optional
ANTHROPIC_API_KEY=sk-ant-... # Optional
```

**Implementation Files:**
- `backend/src/services/interpretationService.ts` - Provider selection and orchestration
- `backend/src/clients/deepseekClient.ts` - DeepSeek API client
- `backend/src/clients/minimaxClient.ts` - MiniMax API client
- Anthropic uses official `@anthropic-ai/sdk` package

### Error Handling
- Backend returns `ApiResponse<T>` format: `{ success: boolean, data?: T, error?: string }`
- Frontend gracefully degrades when backend is unavailable (uses mock responses)
- State machine transitions to `error` state on failure

### TypeScript Configuration
- Frontend uses Vite + `@vitejs/plugin-react`
- Backend uses `tsx` for development (no build step required)
- Both use ES modules (`"type": "module"` in package.json)

## Testing

The project uses **Vitest** as the testing framework for both frontend and backend.

### Test Structure

**Backend Tests** (`backend/src/**/*.test.ts`):
```
backend/src/
├── prompts/
│   └── index.test.ts              # Prompt builder factory tests
├── repositories/
│   └── CacheRepository.test.ts    # Cache repository tests
├── services/
│   └── knowledgeService.test.ts   # Knowledge service tests
└── test/
    └── utils.ts                    # Test utilities
```

**Frontend Tests** (`frontend/src/**/*.{test,spec}.{ts,tsx}`):
```
frontend/src/
├── services/
│   ├── chartService.test.ts       # Chart service tests
│   └── api.test.ts                # API client tests
└── test/
    ├── setup.ts                    # Test setup (jsdom, mocks)
    └── utils.tsx                   # Test utilities (render helpers)
```

### Running Tests

```bash
# Backend tests
cd backend
npm run test                # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# Frontend tests
cd frontend
npm run test                # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

### Test Configuration

**Backend** (`backend/vitest.config.ts`):
- Environment: `node`
- Coverage provider: `v8`
- Test pattern: `src/**/*.{test,spec}.ts`

**Frontend** (`frontend/vitest.config.ts`):
- Environment: `jsdom`
- Setup file: `src/test/setup.ts`
- Test pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Includes React Testing Library

### Writing Tests

**Backend Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { KnowledgeService } from './knowledgeService.js';

describe('KnowledgeService', () => {
  it('should extract keywords', () => {
    const text = '命宫有紫微星';
    const keywords = KnowledgeService.extractKeywords(text);
    expect(keywords).toContain('紫微');
    expect(keywords).toContain('命宫');
  });
});
```

**Frontend Test Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
```

### Test Utilities

**Backend** (`backend/src/test/utils.ts`):
- `createMockBirthInfo()` - Create mock birth info
- `createMockChatMessage()` - Create mock chat message
- `createMockChartText()` - Create mock chart text
- `delay(ms)` - Delay helper for async tests

**Frontend** (`frontend/src/test/utils.tsx`):
- `renderWithProviders()` - Render with React context providers
- `createMockBirthInfo()` - Create mock birth info
- `createMockChatMessage()` - Create mock chat message
- Re-exports all `@testing-library/react` utilities

### Coverage Goals

- **Target**: 70%+ code coverage
- **Priority**: Core services, business logic, state machines
- **Current Status**: Basic test infrastructure established

**Tested Components:**
- ✅ Prompt Builder Factory
- ✅ Knowledge Service (keyword extraction, ranking)
- ✅ Cache Repository (partial)

**To Be Tested:**
- ⏳ LangGraph state machines
- ⏳ AI provider integration
- ⏳ Frontend services (chart, api)
- ⏳ React components

## Development Notes

- Port 3000 for frontend (Vite), port 8000 for backend (Express), port 8001 for RAG service
- Vite proxy configured to forward `/api/*` requests to backend
- The frontend can work standalone with mock data if backend is down
- All state transitions are logged for debugging
- Knowledge base now uses vector database (Chroma) with hybrid search
- RAG service provides fallback to legacy knowledge when unavailable
- Test framework: Vitest with jsdom (frontend) and node (backend) environments

### Hour/Time Conventions
- **Hour values:** 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 (representing start of each 时辰)
- **Always use `getHourName(hour)`** for display - never manually calculate
- **DO NOT use `Math.floor(hour / 2)`** - this produces incorrect results (e.g., 午时 hour=12 becomes "6时")
- See `frontend/src/utils/constants.ts` for hour value mappings

## Quick Start Guide

For developers new to this project, follow these steps:

### 1. Setup (First Time)
```bash
# Install all dependencies
npm run install:all

# Configure backend environment
cd backend
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

# Configure RAG service
cd ../backend-rag
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Return to root
cd ..
```

### 2. Development
```bash
# Start RAG service first (port 8001)
cd backend-rag
source venv/bin/activate
python -m app.main &
cd ..

# Start both frontend and backend
npm run dev

# Or start them separately:
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 8000
```

### 3. Understanding the Code Flow

**When a user asks a question:**
1. Frontend (`App.tsx`) → calls `handleSendMessage()`
2. `agentService.ts` → retrieves knowledge + builds prompt
3. `api.ts` → calls `streamChat()` → POST `/api/chat/stream`
4. Backend (`index.ts`) → checks cache
5. If cache miss → `destinyGraph.ts` executes LangGraph state machine
6. `interpretationService.ts` → calls DeepSeek API
7. Streams response back via SSE
8. Frontend displays chunks in `ChatInterface`

**Key files to explore:**
- Start: `frontend/src/App.tsx` (main flow)
- Frontend API: `frontend/src/services/api.ts` (HTTP + SSE)
- Backend API: `backend/src/index.ts` (Express routes)
- State Machine: `backend/src/graph/destinyGraph.ts` (LangGraph)
- AI Integration: `backend/src/services/interpretationService.ts`

### 4. Common Tasks

**Add a new AI provider:**
1. Create client in `backend/src/clients/yourprovider.ts`
2. Add to `interpretationService.ts` provider list
3. Add API key to `.env`

**Add a new analysis category (for existing divination method):**
1. Add to `SubCategory` type in `backend/src/types/index.ts`
2. Add knowledge in `backend/src/knowledge/ziwei/yourcategory.ts` (for 紫微斗数)
3. Add retrieve node in `backend/src/graph/nodes.ts`
4. Update router logic in `destinyGraph.ts`

**Add a new divination method (e.g., 梅花易数、面相):**
1. Create prompt builder in `frontend/src/services/prompts/newmethod.ts`:
   ```typescript
   export class NewMethodPromptBuilder implements PromptBuilder {
     getType(): string { return 'newmethod'; }
     buildPrompt(...) { /* specialized prompt */ }
     getKnowledge(...) { /* knowledge base */ }
     getCategoryName(...) { /* category names */ }
     getSupportedCategories() { return [...]; }
     static formatChart(data) { /* data formatter */ }
   }
   ```
2. Create backend prompt builder in `backend/src/prompts/newmethod.ts`
3. Register in both factories (`prompts/index.ts`)
4. Add categories to `SubCategory` type
5. Update routing logic in `getBuilderByCategory()`
6. Add data formatter logic (similar to `formatChartToReadableText()` for 紫微斗数)

**Modify AI prompt for existing divination method:**
- Frontend: Edit `frontend/src/services/prompts/{method}.ts`
- Backend: Edit `backend/src/prompts/{method}.ts`

**Add a new tool (ReAct mode):**
1. Create tool definition in `backend/src/tools/{toolname}Tool.ts`:
   ```typescript
   export const {toolName}Tool: Tool = {
     name: '{toolname}',
     description: 'Tool description for AI',
     parameters: [
       { name: 'param1', type: 'string', description: 'Parameter description', required: true },
       { name: 'param2', type: 'number', description: 'Optional parameter', required: false }
     ],
     category: 'knowledge' | 'external',
     handler: async (params) => {
       // Tool implementation
       return { success: true, data: result, toolName: '{toolname}' };
     }
   };
   ```
2. Register tool in `backend/src/tools/registry.ts`:
   ```typescript
   this.register({toolName}Tool);
   ```
3. Add tool execution logic in handler function
4. Test with `POST /api/chat/react` endpoint

**Add a new divination method with ReAct support:**
1. Create prompt builder in `frontend/src/services/prompts/newmethod.ts`:
   ```typescript
   export class NewMethodPromptBuilder implements PromptBuilder {
     getType(): string { return 'newmethod'; }
     buildPrompt(...) { /* specialized prompt */ }
     getKnowledge(...) { /* knowledge base */ }
     getCategoryName(...) { /* category names */ }
     getSupportedCategories() { return [...]; }
     static formatChart(data) { /* data formatter */ }
   }
   ```
2. Create backend prompt builder in `backend/src/prompts/newmethod.ts`
3. Register in both factories (`prompts/index.ts`)
4. Add categories to `SubCategory` type
5. Update routing logic in `getBuilderByCategory()`
6. Add data formatter logic (similar to `formatChartToReadableText()` for 紫微斗数)

**Change cache TTL:**
- Edit `backend/src/repositories/CacheRepository.ts` → `DEFAULT_TTL_DAYS`

**Add/Update RAG knowledge:**
- Edit `backend-rag/scripts/init_knowledge.py` to modify embedded knowledge
- Run `python scripts/init_knowledge.py` to reinitialize
- Or use API: `POST /api/knowledge/text` to add new entries
- Or upload: `POST /api/knowledge/upload` to add documents (PDF/MD/TXT)

**Check RAG service health:**
```bash
curl http://localhost:8001/health
```

**View RAG statistics:**
```bash
curl http://localhost:8001/api/knowledge/stats
```

### 5. Debugging Tips

**Check if backend is running:**
```bash
curl http://localhost:8000/api/health
```

**Check RAG service:**
```bash
curl http://localhost:8001/health
```

**Check cache statistics:**
```bash
curl http://localhost:8000/api/cache/stats
```

**Clear all cache:**
```bash
curl -X DELETE http://localhost:8000/api/cache/expired/0
```

**View LangGraph execution:**
- Check terminal logs during `/api/chat/stream` calls
- Each state transition is logged
- RAG queries show `[RAG]` prefixed logs

**Debug RAG retrieval:**
- Check RAG service logs for query classification and strategy selection
- Use `/api/rag/search` endpoint to test retrieval without LLM

**Frontend state inspection:**
- Use React DevTools to inspect Zustand store
- localStorage key: `ziwei-destiny-storage`

**Debug ReAct mode:**
- Check backend logs for ReAct cycle: `🧠 ReAct: AI 思考中...`
- Monitor tool execution: `🔧 执行工具: tool_name`
- Track reasoning process: `Reasoning: [thought process]`
- Check tool results: `Observation: [formatted result]`

**Test ReAct endpoint:**
```bash
curl -X POST http://localhost:8000/api/chat/react \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "chart": "test", "category": "general", "history": []}'
```

### 6. Production Deployment

**Build:**
```bash
npm run build
```

**Environment variables:**
- Ensure `DEEPSEEK_API_KEY` is set (or other AI provider keys)
- Ensure `OPENAI_API_KEY` is set for RAG service
- Set `PORT` if needed (default: 8000 for backend, 8001 for RAG)

**Database:**
- SQLite database auto-initializes on first run
- Located at `backend/destiny.db`
- Migrations run automatically

**RAG Service:**
- Chroma database at `backend-rag/chroma_db/`
- BM25 index at `backend-rag/data/bm25/`
- Document records at `backend-rag/data/document_records.json`

**Reports:**
- Ensure `backend/reports/` directory exists
- Reports saved as `.md` files with auto-generated names
