# CLAUDE.md

这是紫微斗数命理分析系统 (Ziwei Destiny Analysis System) - 一个使用 LangGraph 风格状态机架构的占卜应用。

## 文档导航

项目文档已拆分为两个部分，便于查找和维护：

### [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)
**系统架构设计文档** - 理解项目整体架构和设计模式

- 架构概览 (Monorepo 结构、核心技术栈)
- 状态机架构 (LangGraph、状态转换)
- RAG 系统架构 (向量搜索、GraphRAG)
- 前端状态管理 (Zustand)
- 数据流 (从前端到后端到 AI)
- API 端点 (聊天、知识库、报告、缓存)
- 知识库系统 (检索管道、知识条目结构)
- 类型系统架构 (SubCategory、占卜方法)
- Prompt 构建器架构 (多占卜方法支持)
- ReAct 模式和工具调用
- iztro 集成 (命盘格式化、报告导出)
- 数据库模式 (SQLite、缓存)
- AI 提供商集成 (DeepSeek、MiniMax、Claude)

### [CLAUDE_DEVELOPMENT.md](./CLAUDE_DEVELOPMENT.md)
**开发指南文档** - 快速上手、常见任务、调试技巧

- 开发命令 (npm scripts)
- 环境配置 (.env 设置)
- 测试 (Vitest、覆盖率)
- 快速入门指南 (新开发者上手步骤)
- 常见任务 (添加功能、修改配置)
- 调试技巧 (curl 命令、日志检查)
- 生产部署 (构建、环境变量)

## 项目概览

```
ziwei-destiny/
├── frontend/        # React + Vite + TypeScript (端口 3000)
├── backend/         # Express + LangGraph (端口 8000)
├── backend-rag/     # Python RAG Service (端口 8001)
└── CLAUDE*.md       # 项目文档
```

## 技术栈

| 层级 | 技术 |
|------|------|
| Frontend | React 18, Zustand, Tailwind CSS, Framer Motion |
| Backend | Express, LangGraph, SQLite |
| RAG Service | FastAPI, Chroma, OpenAI Embeddings |
| AI Providers | DeepSeek (默认), MiniMax, Anthropic Claude |
| Astrology | iztro (紫微斗数计算库) |

## 快速启动

```bash
# 安装依赖
npm run install:all

# 配置环境变量
cd backend && cp .env.example .env
# 编辑 .env 添加 DEEPSEEK_API_KEY

# 启动开发服务器
npm run dev
```

详细步骤请参考 [CLAUDE_DEVELOPMENT.md](./CLAUDE_DEVELOPMENT.md#快速入门指南)

## 关键文件

| 文件 | 说明 |
|------|------|
| `frontend/src/App.tsx` | 主应用组件 |
| `frontend/src/services/api.ts` | HTTP + SSE 客户端 |
| `backend/src/index.ts` | Express 路由 |
| `backend/src/graph/destinyGraph.ts` | LangGraph 状态机 |
| `backend/src/services/interpretationService.ts` | AI 提供商集成 |

## 端口

- Frontend: `3000`
- Backend: `8000`
- RAG Service: `8001`
