# CLAUDE_DEVELOPMENT.md

开发指南文档，包含命令、测试、调试和部署相关内容。

## 目录

- [开发命令](#开发命令)
- [环境配置](#环境配置)
- [测试](#测试)
- [开发注意事项](#开发注意事项)
- [快速入门指南](#快速入门指南)
- [常见任务](#常见任务)
- [调试技巧](#调试技巧)
- [生产部署](#生产部署)

---

## 开发命令

### Root Level
- `npm run install:all` - 安装所有包的依赖
- `npm run dev` - 同时启动前端和后端
- `npm run dev:frontend` - 仅启动前端
- `npm run dev:backend` - 仅启动后端
- `npm run build` - 构建前端和后端
- `npm run build:frontend` - 仅构建前端
- `npm run build:backend` - 仅构建后端

### Frontend (cd frontend)
- `npm run dev` - 启动 Vite 开发服务器 (端口 3000)
- `npm run build` - TypeScript 编译 + Vite 构建
- `npm run preview` - 预览生产构建
- `npm run test` - 使用 Vitest 运行测试
- `npm run test:watch` - 监视模式运行测试
- `npm run test:coverage` - 运行测试并生成覆盖率报告

### Backend (cd backend)
- `npm run dev` - 启动 tsx 监视服务器 (端口 8000)
- `npm run build` - TypeScript 编译
- `npm run start` - 运行编译后的 JavaScript
- `npm run test` - 使用 Vitest 运行测试
- `npm run test:watch` - 监视模式运行测试
- `npm run test:coverage` - 运行测试并生成覆盖率报告

### RAG Service (cd backend-rag)
- **设置:** `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- **初始化:** `python scripts/init_knowledge.py`
- **启动:** `python -m app.main` (端口 8001)

---

## 环境配置

后端需要带有 AI 提供商 API 密钥的 `.env` 文件。从 `backend/.env.example` 复制。

**生产环境必需:**
- `DEEPSEEK_API_KEY` - DeepSeek AI (推荐，性价比最高)

**可选提供商:**
- `MINIMAX_API_KEY` - MiniMax AI (降级选项)
- `ANTHROPIC_API_KEY` - Claude AI (降级选项)

**RAG Service (向量数据库):**
- `OPENAI_API_KEY` - OpenAI API 密钥用于嵌入 (backend-rag 必需)

**示例 `.env` 配置:**
```bash
# 推荐: DeepSeek (最佳选择)
DEEPSEEK_API_KEY=sk-...

# 可选: 额外的提供商用于降级
MINIMAX_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...

# Server configuration
PORT=8000

# RAG Service (backend-rag/)
OPENAI_API_KEY=sk-...
```

---

## 测试

项目使用 **Vitest** 作为前端和后端的测试框架。

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
- `createMockBirthInfo()` - 创建模拟出生信息
- `createMockChatMessage()` - 创建模拟聊天消息
- `createMockChartText()` - 创建模拟命盘文本
- `delay(ms)` - 异步测试的延迟辅助函数

**Frontend** (`frontend/src/test/utils.tsx`):
- `renderWithProviders()` - 使用 React 上下文提供者渲染
- `createMockBirthInfo()` - 创建模拟出生信息
- `createMockChatMessage()` - 创建模拟聊天消息
- Re-exports all `@testing-library/react` utilities

### Coverage Goals

- **目标**: 70%+ 代码覆盖率
- **优先级**: 核心服务、业务逻辑、状态机
- **当前状态**: 基础测试基础设施已建立

**已测试组件:**
- ✅ Prompt Builder Factory
- ✅ Knowledge Service (keyword extraction, ranking)
- ✅ Cache Repository (partial)

**待测试:**
- ⏳ LangGraph state machines
- ⏳ AI provider integration
- ⏳ Frontend services (chart, api)
- ⏳ React components

---

## 开发注意事项

- Port 3000 for frontend (Vite), port 8000 for backend (Express), port 8001 for RAG service
- Vite proxy configured to forward `/api/*` requests to backend
- 前端可在后端关闭时独立使用模拟数据工作
- 所有状态转换都记录用于调试
- 知识库现在使用向量数据库 (Chroma) 带混合搜索
- RAG 服务在不可用时降级到传统知识
- 测试框架: Vitest with jsdom (frontend) and node (backend) environments

### Hour/Time Conventions
- **Hour values:** 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 (代表每个时辰的开始)
- **Always use `getHourName(hour)`** for display - never manually calculate
- **DO NOT use `Math.floor(hour / 2)`** - this produces incorrect results (e.g., 午时 hour=12 becomes "6时")
- See `frontend/src/utils/constants.ts` for hour value mappings

---

## 快速入门指南

项目新开发者请遵循以下步骤:

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

---

## 常见任务

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

---

## 调试技巧

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

---

## 生产部署

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
