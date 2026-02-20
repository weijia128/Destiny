# Destiny 命理分析系统 — Agent 架构优化计划

> 更新时间：2026-02-19
> 范围：后端 Multi-Agent 主链路（`/api/v2/analyze`、`/api/v2/analyze/stream`）

---

## 1. 文档目标

在不打断现有业务能力的前提下，把当前 Multi-Agent 从“可用”升级到“稳定、可观测、可评估、可演进”的工程化架构。

---

## 2. 当前状态（结论）

### 已完成
- 已具备 Supervisor + Sub-Agent + Fusion 的基本骨架。
- 已有 `ziwei/bazi/meihua` 三个 Agent，支持 v2 非流式分析。
- 已引入 `traceId` 透传与基础日志。
- 已有路由基线测试与部分服务单元测试。

### 主要缺口（框架必需）
1. **事件协议不统一**：流式链路存在不同输出语义，前后端解析复杂且易错。
2. **流式并行编排未闭环**：当前 v2 stream 仅 primary agent 流式，未完成多 Agent fan-out/fan-in。
3. **缓存一致性不足**：v2 缓存键未纳入路由/模型上下文，可能误命中。
4. **可靠性策略不足**：缺少统一超时、重试、熔断、并发控制策略。
5. **观测指标不完整**：缺少 token/cost/model/retry/tool-call 统一埋点。
6. **评测门禁不足**：仅有路由测试，缺少融合质量与流式契约回放。

---

## 3. 优化原则

1. **协议先行**：先统一事件协议，再扩功能。
2. **最小侵入**：保持 v1 接口不动，优先收口 v2。
3. **可回滚**：每一阶段可独立开关/降级。
4. **测试护栏**：每个阶段都补对应契约测试。

---

## 4. 分阶段实施计划

## P0（必须完成，框架可用门槛）

### P0-1 统一流式事件协议（阻塞项）
**目标**：定义统一 SSE 事件模型，所有 Agent/融合链路一致输出。

**统一事件类型建议**：
- `dispatch`
- `agent_start`
- `token`
- `agent_done`
- `fusion`
- `final`
- `error`

**核心改造文件**：
- `backend/src/services/interpretationService.ts`
- `backend/src/agents/supervisorAgent.ts`
- `backend/src/index.ts`

**验收**：
- 前端只需按一个事件协议解析即可完成展示。
- 流式全链路不再依赖“正则匹配 data: 内容片段”来拼接缓存。

---

### P0-2 实现多 Agent 流式 fan-out / fan-in（阻塞项）
**目标**：`/api/v2/analyze/stream` 真正支持多 Agent 并行，并可融合输出。

**核心改造**：
- `dispatchStream()` 从“仅 primary”升级为并行调度器。
- 非 primary agent 在后台并发运行并推送阶段性事件。
- 接入 `fusion` 流式输出（增量或尾部融合）。

**核心改造文件**：
- `backend/src/agents/supervisorAgent.ts`
- `backend/src/agents/fusionAgent.ts`
- `backend/src/index.ts`

**验收**：
- 多 Agent 请求时可看到多个 `agent_start/agent_done`。
- stream 结束前必有 `final`，异常必有 `error`。

---

### P0-3 修复缓存键一致性（阻塞项）
**目标**：消除跨路由/跨模型误缓存命中。

**缓存键至少纳入**：
- `birthInfo`
- `userMessage`
- `subCategory`
- `preferredTypes`
- `dispatch.targetAgents`
- `streamMode`
- `provider/model`（可选但建议）

**核心改造文件**：
- `backend/src/index.ts`

**验收**：
- 相同问题但不同 `preferredTypes` 不会命中同一缓存。

---

### P0-4 增加统一可靠性策略（阻塞项）
**目标**：单 Agent 失败不拖垮整体，接口可预期退化。

**建议策略**：
- 每 Agent 超时（如 12s）
- 有限重试（如 1 次）
- `Promise.allSettled` 聚合
- 失败 Agent 标记并继续融合
- 并发上限（防雪崩）

**核心改造文件**：
- `backend/src/agents/supervisorAgent.ts`
- `backend/src/agents/types.ts`（可增加错误元信息）

**验收**：
- 任一 Agent 超时/失败时，仍返回可解释结果。

---

### P0-5 建立流式契约测试与回放测试（阻塞项）
**目标**：给协议和编排上护栏，防止后续回归。

**新增测试方向**：
- 事件顺序与完整性测试
- 多 Agent 并发行为测试
- 降级路径测试
- 缓存键正确性测试

**建议文件**：
- `backend/src/tests/eval/stream-contract.test.ts`
- `backend/src/tests/eval/cache-key.test.ts`
- `backend/src/tests/eval/fusion-regression.test.ts`

---

## P1（高优先，工程化完善）

### P1-1 完整可观测性
**目标**：形成可运营的调用画像与成本画像。

**统一日志字段**：
- `traceId`
- `agent`
- `provider`
- `model`
- `latencyMs`
- `tokenIn/tokenOut`
- `cost`
- `retryCount`
- `toolCalls`

**核心改造文件**：
- `backend/src/agents/*.ts`
- `backend/src/services/interpretationService.ts`
- `backend/src/index.ts`

---

### P1-2 评测门禁（CI）
**目标**：把“质量”变成可度量指标。

**建议指标**：
- 路由准确率
- 融合一致性命中率
- 流式协议通过率
- 失败率/超时率

**核心改造文件**：
- `backend/src/tests/eval/*`
- CI 配置（如 GitHub Actions）

---

## P2（中优先，治理与演进）

### P2-1 安全与治理
- 高风险问题接入 HITL（人工确认开关）。
- 审计字段补齐（请求来源、策略版本）。

### P2-2 路由策略升级
- 从纯正则升级为“规则 + 置信度 + 回退策略”。

---

## 5. 里程碑与工期建议

- **M1（2~3 天）**：完成 P0-1 ~ P0-3（协议统一 + 多 Agent 流式 + 缓存键）
- **M2（1~2 天）**：完成 P0-4 ~ P0-5（可靠性 + 测试护栏）
- **M3（2~3 天）**：完成 P1（观测 + CI 门禁）

> 总计：约 5~8 个工作日可完成“框架层闭环”。

---

## 6. 验收标准（Definition of Done）

1. `/api/v2/analyze/stream` 在多 Agent 场景下可稳定输出统一事件序列。
2. 单 Agent 失败不会导致整条请求失败，且返回包含可解释降级信息。
3. 缓存键不会出现跨路由误命中。
4. 测试覆盖协议、编排、缓存一致性与降级路径。
5. 日志可按 `traceId` 还原一次请求的全链路行为与耗时。

---

## 7. 回滚策略

1. 保留开关：`MULTI_AGENT_STREAM_V2=true/false`，可一键回退到当前 primary-only 流式。
2. 缓存键升级使用新前缀（如 `v2s_`），避免与旧缓存相互污染。
3. 若融合流不稳定，降级为“多 Agent 并行 + 最终一次性融合文本”。

---

## 8. 建议下一步（立即执行）

按顺序落地：
1. **先做 P0-1（协议统一）**
2. **再做 P0-2（流式并行编排）**
3. **随后 P0-3（缓存一致性）**

这三步完成后，再推进可靠性与评测门禁。
