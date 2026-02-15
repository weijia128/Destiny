# Destiny 命理分析系统 — 演进规划

## Context

现有项目（`/Users/weijia/Library/Mobile Documents/com~apple~CloudDocs/code/ai/Destiny`）已经是一个**架构成熟的工作原型**：
- 紫微斗数完整实现（iztro 排盘 + LangGraph 状态机 + ReAct 推理 + RAG 知识库）
- 多 AI Provider 支持（DeepSeek/MiniMax/Claude）+ SSE 流式响应
- 其他术数（八字/奇门/六爻/手相）有骨架代码但未完成
- 无 iOS 原生代码，纯 Web 应用

**目标**：在现有基础上渐进演进，优先补齐更多术数，架构升级为 Multi-Agent，最终做成可商业化的 iOS App。

---

## Phase 1: Multi-Agent 架构升级

> 把单一 LangGraph 状态机演进为 Supervisor + Sub-Agent 协作模式

### 1.0 先补齐“协议 + 可观测性 + 评测基线”（强烈建议）

- **统一 I/O 协议**：`SubAgentInput/Output` 里显式携带 `traceId`、用户上下文（性别/出生信息/关注主题）、以及可选的“结构化中间结果”（排盘/起卦结果），为后续 Fusion 与报告导出打基础。
- **可观测性**：每次调用记录结构化日志（`traceId/agent/provider/model/latency/tokens`），并把关键工具调用（RAG、排盘、外部 API）纳入 trace，便于定位质量与成本波动。
- **最小评测集**：先沉淀一小批固定样例（按事业/感情/健康等主题覆盖），用回放式评测做“路由是否正确 / 输出是否稳定 / 幻觉率”对比，避免 Multi-Agent 上线后难以归因。

### 1.1 定义 Agent 接口

创建 `backend/src/agents/types.ts`：
- `SubAgent` 接口：每个术数实现此接口
- `SubAgentInput/Output`：标准化输入输出
- `AgentRegistry`：注册/发现机制

### 1.2 将紫微斗数封装为第一个 Sub-Agent

创建 `backend/src/agents/ziweiAgent.ts`：
- 封装现有 iztro 排盘 + 知识检索 + prompt 构建
- `destinyGraph.ts` 改为委托给 Sub-Agent，**保持现有 API 不变**

### 1.3 创建 Supervisor Agent

创建 `backend/src/agents/supervisorAgent.ts`：
- 意图分析：判断用户问题应该调用哪些术数
- 路由策略：支持**用户显式指定术数优先** + 自动意图识别兜底；初版建议先做**单术数路由**跑稳，再升级多术数并行分发
- 并行分发给对应 Sub-Agent
- 新 API：`POST /api/v2/analyze`，现有端点不动

### 1.4 创建 Fusion Agent

创建 `backend/src/agents/fusionAgent.ts`：
- 综合多个 Sub-Agent 结果
- 识别一致性、互补性、矛盾点
- 输出统一叙述（建议先做“结构化融合”：并列摘要 + 一致/矛盾点标注；评测稳定后再做强融合终稿）

### 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/src/agents/types.ts` | 新建 | Agent 接口定义 |
| `backend/src/agents/registry.ts` | 新建 | Agent 注册中心 |
| `backend/src/agents/ziweiAgent.ts` | 新建 | 紫微 Sub-Agent |
| `backend/src/agents/supervisorAgent.ts` | 新建 | 路由 + 分发 |
| `backend/src/agents/fusionAgent.ts` | 新建 | 多术数融合 |
| `backend/src/graph/destinyGraph.ts` | 修改 | 委托给 Sub-Agent |
| `backend/src/index.ts` | 修改 | 添加 v2 端点 |

---

## Phase 2: 补齐术数模块（按优先级排序）

### 2.0 通用工程约束（降低返工）

- **计算与解读分层**：每个术数都拆成 `services/*Service.ts`（纯算法/可单测）与 `agents/*Agent.ts`（prompt/工具编排/可回放）。
- **可验证优先**：先把“排盘/起卦准确性”用单元测试锁住，再迭代 AI 解读 prompt；避免算法与 prompt 纠缠导致定位困难。

### 2.1 八字命理（Priority 1，复杂度：中）

**计算引擎**：`lunar-javascript`（已安装）提供完整的八字计算能力。

| 文件 | 说明 |
|------|------|
| `backend/src/services/baziService.ts` | 新建，四柱/十神/喜用神/大运计算 |
| `backend/src/agents/baziAgent.ts` | 新建，实现 SubAgent 接口 |
| `backend/src/knowledge/bazi/*.ts` | 扩充（仅有 career.ts），补齐 wealth/relationship/health/family/general/geju/yongshen |
| `backend/src/prompts/others.ts` | 修改，丰富 BaziPromptBuilder |
| `frontend/src/components/BaziChartDisplay.tsx` | 新建，四柱可视化展示 |

### 2.2 梅花易数（Priority 2，复杂度：小）

**计算引擎**：纯算法，自行实现（约 200 行）。时间或数字 → 上下卦 → 动爻 → 体用生克。

| 文件 | 说明 |
|------|------|
| `backend/src/services/meihuaService.ts` | 新建，起卦 + 体用分析 |
| `backend/src/agents/meihuaAgent.ts` | 新建 |
| `backend/src/knowledge/meihua/*.ts` | 新建，八卦含义 + 体用关系 |
| `backend/src/types/index.ts` | 修改，添加 `meihua` 到 DestinyType |

### 2.3 六爻（Priority 3，复杂度：中）

**计算引擎**：摇钱模拟 → 本卦/变卦 → 世应/六亲/六神。

| 文件 | 说明 |
|------|------|
| `backend/src/services/liuyaoService.ts` | 新建 |
| `backend/src/agents/liuyaoAgent.ts` | 新建 |
| `frontend/src/components/CoinToss.tsx` | 新建，摇卦交互动画 |

### 2.4 奇门遁甲（Priority 4，复杂度：大）

`lunar-javascript` 有 QiMen 类支持。需要九宫格多层盘面展示。

### 2.5 手相（Priority 5，复杂度：大）

需要 Vision API（Claude Vision）分析手掌照片。替换现有 `palmistryService.ts` 中的随机 mock 数据。
建议在接口设计阶段就明确：默认不落盘或短期存储、明确用户授权与免责声明、以及必要的隐私/合规策略（尤其是移动端上传图片场景）。

---

## Phase 3: iOS App

### 3.0 App Store 约束（提前纳入设计，避免临上线大改）

- 登录：若提供微信/Google 等第三方登录，通常需要同时提供 Apple Sign In；建议在 Phase 3 就把 auth 抽象好。
- 付费：数字内容/功能解锁走 iOS IAP；后端需要订单与收据校验（或第三方订阅平台）对应的 API 设计。

### 3.1 短期 — PWA（复杂度：小，可立即开始）

| 文件 | 说明 |
|------|------|
| `frontend/public/manifest.json` | 新建，PWA 清单 |
| `frontend/src/sw.ts` | 新建，Service Worker |
| `frontend/index.html` | 修改，添加 iOS meta tags |

### 3.2 中期 — Expo (React Native)

你是 Web 前端背景，Expo 是最佳选择：
- 复用 React 经验，学习成本最低
- 后端完全不需要改动（已经是 API 服务）
- `expo-camera` 支持手相拍照

```
mobile/
  app/(tabs)/        # 首页/历史/个人
  app/ziwei/         # 紫微流程
  app/bazi/          # 八字流程
  app/palmistry/     # 手相（相机）
  services/api.ts    # 复用后端 API
```

### 3.3 后端适配

- 添加 JWT 认证中间件
- 考虑 WebSocket 替代 SSE（移动网络更稳定）
- API 版本管理

---

## Phase 4: 商业化

### 4.1 用户系统

- 微信登录（国内主力）+ 邮箱/手机（国际）
- JWT + Refresh Token
- SQLite → PostgreSQL（生产环境）

### 4.2 免费/付费分层

| 功能 | 免费 | 付费 |
|------|------|------|
| 基础分析 | 每日限次 | 无限 |
| 多术数融合 | 不可用 | 可用 |
| 手相分析 | 不可用 | 可用 |
| 报告导出 | 不可用 | PDF/Markdown |
| AI 质量 | DeepSeek | Claude（高质量）|

### 4.3 云部署

```
Nginx → Frontend (CDN) + Backend (ECS:8000) + RAG (ECS:8001)
```
- 阿里云 / 腾讯云（国内优先）
- Docker Compose → Kubernetes
- Redis 缓存 + 限流

---

## 执行顺序

```
Phase 1.0-1.2 (协议/可观测性/评测基线 + Agent 接口 + 紫微封装)
    ↓
Phase 1.3-1.4 (Supervisor + Fusion) ← 可与 Phase 2.1 并行
    ↓
Phase 2.1 (八字) → 2.2 (梅花) → 2.3 (六爻) → 2.4 (奇门) → 2.5 (手相)
    ↓
Phase 3.1 (PWA，可随时开始，不依赖上面)
    ↓
Phase 3.2 (Expo App，验证 PWA 移动端需求后)
    ↓
Phase 4 (商业化，在核心功能稳定后)
```

## 验证方式

- Phase 1：现有紫微功能通过 `/api/chat/stream` 正常工作 + 新的 `/api/v2/analyze` 能路由到紫微
- Phase 2：每个新术数通过独立测试（排盘准确性 + AI 解读质量人工审核）
- Phase 3：PWA 在 iOS Safari 可安装并正常使用
- Phase 4：用户注册 → 免费使用 → 触发限额 → 付费解锁 全流程通畅

## 建议立即开始

**Phase 1.0 + 1.1 + 2.1 并行**：先把协议/可观测性/评测基线立起来，再定义 Agent 接口；同时开始实现八字计算引擎（因为 `lunar-javascript` 已经安装，这是最低风险的起步点）。
