# Destiny 命理分析系统 — 质量优化计划

## Context

**已完成**：Multi-Agent 架构骨架（Phase 1）+ 八字基础计算引擎（Phase 2.1 骨架）。

**当前问题**：用户要求提升分析质量，具体体现在三个维度：
1. **AI 解读更准确深入** — LLM 缺乏每类别的分析引导，输出泛泛
2. **计算结果更准确** — BaziService 存在已知 Bug（大运、喜用神、格局判断）
3. **回答更有个性化** — 当前年份/流年/当前年龄未传入 LLM，无法做"今年"分析

**架构哲学确认**（用户和 Claude 共识）：
- 规则工具（iztro、lunar-javascript、自研算法）负责**计算**
- 静态知识库负责**专业知识背景**
- LLM 只负责**文字整合与推理**，不做规则计算

**本计划范围**：优先完善八字和紫微的分析质量，不扩展新术数。

---

## 质量优化 — 三条主线

---

### 主线 A：修复 BaziService 计算精度

#### A1. 修复大运（大运 Gan/Zhi）计算
**文件**：`backend/src/services/baziService.ts`，`calcDayun()` 方法（约第 285-334 行）

**问题**：代码调用了 `baziObj.getYun()` 获取起运年份，但随后完全抛弃了库提供的大运干支，改用手写循环从月柱重新推算。`lunar-javascript` 已提供正确的 `getDaYun()` 列表，应直接使用。

**修复方案**：
```typescript
// 直接使用 lunar-javascript 提供的大运列表
const daYunList = yun.getDaYun(); // DaYun[]
return daYunList.map(dy => ({
  startAge: dy.getStartAge(),
  endAge: dy.getEndAge(),
  gan: dy.getGan(),
  zhi: dy.getZhi(),
  ganWuxing: WUXING_MAP[dy.getGan()] || '',
  zhiWuxing: WUXING_MAP[dy.getZhi()] || '',
  tenGod: getTenGod(rigan, dy.getGan()),
}));
```
**注**：需先验证 `lunar-javascript` 的 `DaYun` 类实际提供哪些方法（通过运行时调试）。

#### A2. 修复喜用神推断——加入地支藏干通根判断
**文件**：`backend/src/services/baziService.ts`，`inferYongshen()` 和 `countWuxing()`

**问题**：目前 `countWuxing()` 只统计天干和地支表面五行（8 个字），忽略了地支藏干。日主的实际强弱必须看**通根**（日主天干是否出现在地支藏干中）。

**修复方案**：
1. 扩展 `countWuxing()` 加入地支藏干计数（藏干权重设为 0.5）
2. `inferYongshen()` 增加**调候**逻辑：
   - 生于子丑亥月（冬）→ 喜丙丁火调候
   - 生于午未巳月（夏）→ 喜壬癸水调候
3. 输出结构化数据（喜用神五行数组），而非纯字符串

#### A3. 修复格局推断——改用月支月令
**文件**：`backend/src/services/baziService.ts`，`inferGeju()`

**问题**：目前用月干十神取格（月干为正官 → 正官格），但标准取格法应用**月支（月令）的藏干透出**来定格。

**修复方案**：
1. 检查月支藏干（`DIZHI_HIDDEN_GAN[monthZhi]`），找出透干的十神
2. 加入基础从格检测：日主五行占比 < 12.5%（总量 1/8）且无印比帮扶 → 提示"疑似从格"
3. 不做完整从格判断（复杂度极高），改为在格式化文本中标注"从格可能性"供 LLM 进一步判断

#### A4. 补充合冲刑 + 当前流年到 formatSummary
**文件**：`backend/src/services/baziService.ts`，`formatSummary()`

新增输出段落：
```
【当前年份信息】
当前年份：2026年（丙午年）/ 流年天干：丙 / 流年地支：午
命主当前年龄：XX岁
当前大运：壬子（偏印）运，XX岁至XX岁

【四柱关系】
主要合：年支亥 + 月支子 = 亥子水局（半合）
主要冲：日支午 冲 年支子
```

实现：在 `formatSummary()` 末尾追加，计算当前公历年对应天干地支（60 甲子表）。

---

### 主线 B：提升 Prompt 深度与个性化

#### B1. 为 ZiweiPromptBuilder 加入分类引导
**文件**：`backend/src/prompts/ziwei.ts`

参考 `BaziPromptBuilder` 的 `BAZI_CATEGORY_GUIDANCE`，为紫微每个子类别添加：

| 子类别 | 分析引导重点 |
|--------|-------------|
| career | 官禄宫主星 + 四化入官 + 命宫对官 + 迁移宫 |
| wealth | 财帛宫主星 + 化禄化忌到财帛 + 田宅宫 |
| relationship | 夫妻宫 + 化禄化忌到夫妻 + 命宫对夫妻 |
| health | 疾厄宫 + 四化入疾厄 + 所属五行 |
| family | 父母宫/兄弟宫/子女宫各自主星 |
| general | 命宫主星 + 五行局 + 大限概况 |
| ziweigeju | 格局类型（紫府同宫、日月并明等） |
| dashun | 当前大限宫位 + 大限四化 + 对宫 |

#### B2. 两个 PromptBuilder 都注入当前年龄和流年
**文件**：`backend/src/prompts/ziwei.ts` 和 `backend/src/prompts/others.ts`

在 `buildPrompt()` 接收到 `chartText` 时，从中解析或在系统提示中直接追加：
```
【个性化信息】
当前年份：2026年（丙午年），流年天干：丙，地支：午
建议结合命主当前运势进行分析
```

（注：更完整的做法是在 Agent 的 `analyze()` 时注入，而不是在 PromptBuilder 里计算）

**实现位置**：在 `SubAgentInput` 中新增 `currentYear?: number`，在 `supervisorAgent.ts` 的 `dispatchAnalyze()` 里注入 `new Date().getFullYear()`，在 `BaziService.formatSummary()` 已有计算逻辑基础上扩展。

---

### 主线 C：充实八字知识库（career/wealth/relationship/health/family）

**文件**：`backend/src/knowledge/bazi/career.ts`（当前只有 1 条骨架条目，其他文件已在上次创建）

**发现**：`wealth.ts`、`relationship.ts`、`health.ts`、`family.ts` 在上次 Phase 2.1 中已有实质内容（各 3 条）。主要缺口是 `career.ts` 仍是单条骨架。

**需补充**：
- `career.ts`：加入十神与职业、格局与事业方向、大运对事业影响（至少 3 条实质内容）

---

## 文件修改清单

| 文件 | 操作 | 内容 |
|------|------|------|
| `backend/src/services/baziService.ts` | **修改** | 修复大运计算、加藏干通根、修格局取法、加流年/合冲刑到输出 |
| `backend/src/prompts/ziwei.ts` | **修改** | 加入 `ZIWEI_CATEGORY_GUIDANCE` 分类引导 |
| `backend/src/prompts/others.ts` | **修改**（小） | 向 prompt 注入当前年份信息 |
| `backend/src/knowledge/bazi/career.ts` | **修改** | 补充实质性知识条目 |
| `backend/src/agents/types.ts` | **修改**（小） | SubAgentInput 加 `currentYear?: number` |
| `backend/src/agents/supervisorAgent.ts` | **修改**（小） | dispatchAnalyze 注入 currentYear |

---

## 验证方式

1. **大运计算**：用已知命盘（如 1990-01-15 男）验证大运起运年龄和干支是否与专业命理软件一致
2. **喜用神**：同一命盘，对比修改前后的喜用神输出是否更合理
3. **Prompt 个性化**：调用 `/api/v2/analyze` 问"我今年事业怎么样"，检查 AI 是否能说出"2026年"具体分析
4. **Ziwei 分类引导**：分别问官禄宫和夫妻宫相关问题，检查 AI 是否聚焦对应宫位

---

## 执行顺序

```
主线 A（计算修复，优先）
  A1 大运修复 → A4 流年注入（可并行 A2 A3）

主线 B（Prompt 改进，次之）
  B1 Ziwei 分类引导 → B2 流年个性化注入

主线 C（知识库，最轻量）
  career.ts 补充实质内容
```

---

## 历史规划（已完成部分）

---

## Phase 1: Multi-Agent 架构升级（已完成）

> 把单一 LangGraph 状态机演进为 Supervisor + Sub-Agent 协作模式

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
- 并行分发给对应 Sub-Agent
- 新 API：`POST /api/v2/analyze`，现有端点不动

### 1.4 创建 Fusion Agent

创建 `backend/src/agents/fusionAgent.ts`：
- 综合多个 Sub-Agent 结果
- 识别一致性、互补性、矛盾点
- 输出统一叙述

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

---

## Phase 3: iOS App

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
Phase 1.1-1.2 (Agent 接口 + 紫微封装)
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

**Phase 1.1 + 2.1 并行**：定义 Agent 接口的同时，开始实现八字计算引擎（因为 `lunar-javascript` 已经安装，这是最低风险的起步点）。
