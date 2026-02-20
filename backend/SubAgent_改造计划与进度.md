# SubAgent 改造计划与进度（含已完成/待优化）

更新时间：2026-02-19

## 1. 改造目标与范围

- 目标：把 `ziwei / bazi / meihua` 三个 SubAgent 从“单次 LLM 调用”升级为“可控的 Function-calling 循环执行”。
- 范围：仅覆盖 SubAgent 主链路（`/api/v2/analyze` 非流式优先），兼容现有 ReAct 与流式路径。

## 2. 计划拆解（执行视角）

### P0（已完成）

1. 统一检索编排层（RetrievalService + 策略配置）。  
2. 三个 SubAgent 接入统一检索与检索元数据。  
3. 补齐检索精度与路由基线测试。  

### P1（已完成）

1. 设计 Function-calling 类型契约与运行时配置归一化。  
2. 实现 Function-calling Loop（决策→工具→观察→终答/回退）。  
3. 工具执行统一收口（参数校验、错误封装、观察文本标准化）。  
4. 三个 SubAgent 非流式 `analyze` 全量切换到 Loop。  
5. `/api/v2/analyze` 与 `/api/v2/analyze/stream` 增加 function-calling 配置透传。  

### P2（待做）

1. 流式 `analyzeStream` 接入 Function-calling（边工具边输出策略）。  
2. 长期记忆/会话记忆模块接入 SubAgent。  
3. 术数级工具策略（按 destinyType/subCategory 动态白名单）。  
4. 线上可观测性增强（trace 展示、工具耗时/失败率指标）。  

## 3. 已完善内容（当前状态）

## 3.1 Function-calling 核心能力

- 新增 Function-calling 协议与追踪结构：`src/types/functionCalling.ts`。  
- 新增配置归一化：`src/config/functionCalling.ts`。  
- 新增统一循环服务：`src/services/functionCallingService.ts`。  
- AI 服务新增入口：`InterpretationService.callAIWithFunctionLoop`。  

## 3.2 工具体系增强

- 工具注册中心新增统一 `execute`（查找/校验/执行/封装）：`src/tools/registry.ts`。  
- ReAct 工具节点改为复用统一执行入口：`src/graph/reactNodes.ts`。  
- `knowledge_search` 支持新版参数：`destinyType + subCategory + query`，并兼容旧参数。  

## 3.3 SubAgent 主链路升级

- `ZiweiAgent/BaziAgent/MeihuaAgent` 的非流式 `analyze` 已接入 Loop。  
- `SubAgentMetadata` 已补充 `functionCalling` 轨迹字段。  
- `Supervisor` 已注入 `functionCalling` 配置到 `SubAgentInput`。  

## 3.4 API 与配置透传

- `V2AnalyzeRequest` 新增：  
  - `enableFunctionCalling`  
  - `maxFunctionIterations`  
  - `maxToolCalls`  
  - `allowedTools`  
- `/api/v2/analyze`、`/api/v2/analyze/stream` 均已透传上述参数。  

## 3.5 测试与构建

- 新增测试：
  - `src/services/functionCallingService.test.ts`
  - `src/tools/knowledgeSearchTool.test.ts`
- 扩展测试：
  - `src/agents/supervisorAgent.test.ts`
- 全量验证：
  - `npm test` 通过（88/88）
  - `npm run build` 通过

## 4. 还需要优化的内容（按优先级）

### 优先级 A（建议下一步）

1. **流式 Function-calling**：`analyzeStream` 仍是单次流式输出，未进入工具循环。  
2. **动作解析稳健性**：当前 JSON 解析为轻量策略，建议升级为严格 schema 校验。  
3. **工具调用治理**：增加单工具超时、重试与熔断，防止链路抖动放大。  

### 优先级 B

1. **会话记忆层**：为 SubAgent 增加短期摘要记忆和跨轮状态复用。  
2. **术数知识策略细分**：按术数/子类做 tool allowlist 与检索策略联动。  
3. **观测面板化**：沉淀每轮 loop 的原因、工具命中、失败类型、耗时分布。  

### 优先级 C

1. **评测体系扩展**：增加 function-calling 成功率、平均工具步数、终答一致性评分。  
2. **安全与合规**：工具参数脱敏、审计日志结构化输出。  

## 5. 回滚与兜底策略

1. 请求级回滚：设置 `enableFunctionCalling=false`，立即退回单次 `callAI`。  
2. 配置级回滚：将 `maxToolCalls=0`，保留新结构但停用工具执行。  
3. 代码级回滚：SubAgent `analyze` 改回 `InterpretationService.callAI(promptData)` 即可。  

## 6. 建议的下一执行项

- 建议先做：**A1 流式 Function-calling Loop**（影响面最小、收益最大）。  
- 验收标准：  
  - 工具调用事件可流式输出（SSE 分片可见）。  
  - 终答正确收敛且不中断流。  
  - `npm test` 与 `npm run build` 全通过。  
