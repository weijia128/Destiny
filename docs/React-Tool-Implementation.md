# ReAct 模式和工具调用能力实现方案

## 概述

为紫微斗数命理分析系统添加 ReAct (Reasoning + Acting) 模式和工具调用能力，使 AI agent 能够：
- 主动决定是否需要调用工具
- 执行知识库搜索
- 调用外部 API（如日历/黄历）
- 支持多轮工具调用（工具链）

## 目录

- [架构设计](#架构设计)
- [工具定义层](#工具定义层)
- [ReAct 节点设计](#react-节点设计)
- [状态机集成](#状态机集成)
- [实现步骤](#实现步骤)
- [API 集成](#api-集成)
- [代码示例](#代码示例)

---

## 架构设计

### 当前架构分析

**现有状态机流程：**
```
__start__ → router → retrieve{Category} → analyze → respond → __end__
```

**核心组件：**
- **LangGraph 状态机**: `@langchain/langgraph` ^1.0.7
- **状态定义**: `StateAnnotation` (Annotation.Root pattern)
- **AI 提供者**: DeepSeek (默认), MiniMax, Anthropic Claude
- **知识服务**: `KnowledgeService` - 基于关键词匹配的检索

### 新增 ReAct 流程

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

### 文件结构

```
backend/src/
├── tools/                          # 新增：工具目录
│   ├── types.ts                    # 工具接口定义
│   ├── knowledgeSearchTool.ts      # 知识库搜索工具
│   ├── calendarTool.ts             # 日历/黄历工具
│   └── registry.ts                 # 工具注册表
├── graph/
│   ├── reactNodes.ts               # 新增：ReAct 节点
│   ├── reactGraph.ts               # 新增：ReAct 状态机
│   ├── destinyGraph.ts             # 修改：集成 ReAct
│   └── nodes.ts                    # 现有节点
├── types/
│   └── graph.ts                    # 修改：扩展状态定义
├── services/
│   └── interpretationService.ts    # 修改：ReAct 提示词
├── utils/
│   └── calendar.ts                 # 新增：日历工具函数
└── index.ts                        # 修改：新增 API 端点
```

---

## 工具定义层

### 工具接口定义

**文件**: `backend/src/tools/types.ts`

```typescript
/**
 * 工具定义接口
 */
export interface Tool {
  name: string;                    // 工具名称（唯一标识）
  description: string;             // 工具描述（给 AI 看）
  parameters: ToolParameter[];     // 参数定义
  handler: ToolHandler;            // 工具处理器
  category: 'knowledge' | 'external'; // 工具类别
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

/**
 * 工具处理器函数签名
 */
export type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolName: string;
  executionTime?: number; // 执行时间（毫秒）
}

/**
 * AI 工具调用请求
 */
export interface ToolCallRequest {
  toolName: string;
  parameters: Record<string, unknown>;
  reasoning?: string; // AI 的推理过程（后台记录）
}

/**
 * AI 工具调用响应
 */
export interface ToolCallResponse {
  toolName: string;
  result: ToolResult;
  observation: string; // 格式化的观察结果（给 AI 看）
}
```

### 知识库搜索工具

**文件**: `backend/src/tools/knowledgeSearchTool.ts`

```typescript
import { Tool } from './types.js';
import { KnowledgeService } from '../services/knowledgeService.js';

/**
 * 知识库搜索工具
 * 允许 AI 动态搜索命理知识库
 */
export const knowledgeSearchTool: Tool = {
  name: 'knowledge_search',
  description: `搜索命理知识库，获取相关的命理知识条目。

使用场景：
- 当用户询问特定的星曜、宫位、格局的含义时
- 当需要查找命理专业术语的解释时
- 当需要补充专业知识以支持分析时

参数说明：
- category: 分析类别（career/wealth/relationship/health/family/general）
- keywords: 搜索关键词数组
- chartText: 命盘文本（可选，用于相关性排序）`,

  parameters: [
    {
      name: 'category',
      type: 'string',
      description: '分析类别',
      required: true,
    },
    {
      name: 'keywords',
      type: 'array',
      description: '搜索关键词数组，如 ["紫微", "事业", "命宫"]',
      required: true,
    },
    {
      name: 'chartText',
      type: 'string',
      description: '命盘文本（可选，用于提升相关性排序）',
      required: false,
    },
  ],

  category: 'knowledge',

  handler: async (params) => {
    const startTime = Date.now();

    try {
      const { category, keywords, chartText } = params as {
        category: string;
        keywords: string[];
        chartText?: string;
      };

      // 调用知识服务
      const entries = await KnowledgeService.retrieve(
        category as any,
        chartText || '',
        keywords.join(' ')
      );

      // 格式化结果
      const formattedResult = KnowledgeService.formatForAI(entries);

      return {
        success: true,
        data: {
          entries,
          formatted: formattedResult,
          count: entries.length,
        },
        toolName: 'knowledge_search',
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: 'knowledge_search',
        executionTime: Date.now() - startTime,
      };
    }
  },
};
```

### 日历/黄历工具

**文件**: `backend/src/tools/calendarTool.ts`

```typescript
import { Tool } from './types.js';

/**
 * 日历/黄历工具
 * 提供农历转换和黄历信息查询
 */
export const calendarTool: Tool = {
  name: 'calendar_almanac',
  description: `查询日历和黄历信息，包括农历转换、宜忌事项等。

使用场景：
- 当用户询问特定日期的黄历信息时
- 当需要分析特定日期的宜忌时
- 当需要提供日期相关的命理建议时

参数说明：
- date: 公历日期（格式：YYYY-MM-DD）
- detail: 是否返回详细信息（默认：false）`,

  parameters: [
    {
      name: 'date',
      type: 'string',
      description: '公历日期，格式：YYYY-MM-DD',
      required: true,
    },
    {
      name: 'detail',
      type: 'boolean',
      description: '是否返回详细信息',
      required: false,
      default: false,
    },
  ],

  category: 'external',

  handler: async (params) => {
    const startTime = Date.now();

    try {
      const { date, detail = false } = params as {
        date: string;
        detail?: boolean;
      };

      // 解析日期
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }

      // 这里需要实现日历转换逻辑
      // 可以使用库如 'lunar-javascript' 或 'chinese-lunar'
      const result = {
        solar: {
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          weekday: ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()],
        },
        // TODO: 添加农历转换
        lunar: {
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
        },
        almanac: {
          yi: ['嫁娶', '出行', '移徙'],
          ji: ['动土', '破土', '安葬'],
        },
      };

      return {
        success: true,
        data: detail ? result : { formatted: formatAlmanac(result) },
        toolName: 'calendar_almanac',
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: 'calendar_almanac',
        executionTime: Date.now() - startTime,
      };
    }
  },
};

function formatAlmanac(data: any): string {
  return `
【日期信息】
公历：${data.solar.year}年${data.solar.month}月${data.solar.day}日 星期${data.solar.weekday}
农历：${data.lunar.year}年${data.lunar.month}月${data.lunar.day}日

【黄历宜忌】
宜：${data.almanac.yi.join('、')}
忌：${data.almanac.ji.join('、')}
  `.trim();
}
```

### 工具注册表

**文件**: `backend/src/tools/registry.ts`

```typescript
import { Tool } from './types.js';
import { knowledgeSearchTool } from './knowledgeSearchTool.js';
import { calendarTool } from './calendarTool.js';

/**
 * 工具注册表
 * 集中管理所有可用工具
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // 注册默认工具
    this.register(knowledgeSearchTool);
    this.register(calendarTool);
  }

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 按类别获取工具
   */
  getByCategory(category: 'knowledge' | 'external'): Tool[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 格式化工具列表供 AI 使用
   */
  formatForAI(): string {
    return this.getAll()
      .map(tool => {
        const params = tool.parameters
          .map(p => `  - ${p.name}${p.required ? ' (必填)' : ' (可选)'}: ${p.description}`)
          .join('\n');

        return `
【工具名称】${tool.name}
【描述】${tool.description}
【参数】
${params}
`;
      })
      .join('\n---\n\n');
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry();
```

---

## ReAct 节点设计

**文件**: `backend/src/graph/reactNodes.ts`

### 思考节点

```typescript
import type { GraphStateUpdate } from '../types/graph.js';
import { toolRegistry } from '../tools/registry.js';
import { InterpretationService } from '../services/interpretationService.js';

/**
 * ReAct 思考节点
 * 让 AI 决定是否需要调用工具，以及调用哪个工具
 */
export async function reactReasoningNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🧠 ReAct: AI 思考中...');

  const { chartText, category, history, toolResults, reasoning, toolCallCount, maxToolCalls } = state;

  // 构建思考提示词
  const thoughtPrompt = buildThoughtPrompt(chartText, category, history, toolResults, reasoning);

  try {
    // 调用 AI 进行推理
    const aiResponse = await InterpretationService.callAI({
      system: buildReActSystemPrompt(),
      messages: [{ role: 'user', content: thoughtPrompt }],
    });

    // 解析 AI 的决策
    const decision = parseAIDecision(aiResponse);

    console.log(`🧠 ReAct 决策:`, decision);

    // 记录思考过程
    const newReasoning = [
      ...(reasoning || []),
      `思考: ${decision.thought}`,
    ];

    // 检查是否需要调用工具
    if (decision.needsTool && toolCallCount! < maxToolCalls!) {
      return {
        reasoning: newReasoning,
        reactPhase: 'action',
        toolCalls: [
          ...(state.toolCalls || []),
          {
            toolName: decision.toolName!,
            parameters: decision.parameters!,
            reasoning: decision.thought,
          },
        ],
        toolCallCount: (toolCallCount || 0) + 1,
      };
    } else {
      // 不需要工具或达到最大调用次数，生成最终答案
      return {
        reasoning: newReasoning,
        reactPhase: 'final',
      };
    }
  } catch (error) {
    console.error('ReAct reasoning error:', error);
    return {
      reasoning: [...(reasoning || []), `思考出错: ${error}`],
      reactPhase: 'error',
      error: error instanceof Error ? error.message : 'Reasoning failed',
    };
  }
}

/**
 * 构建 ReAct 系统提示词
 */
function buildReActSystemPrompt(): string {
  const toolsList = toolRegistry.formatForAI();

  return `你是一位精通命理的分析师，具备使用工具的能力。

**工作模式：ReAct (Reasoning + Acting)**

你需要遵循以下思考流程：

1. **理解问题**: 分析用户的问题和命盘信息
2. **检索知识**: 决定是否需要搜索知识库
3. **外部信息**: 决定是否需要查询外部信息（如黄历）
4. **综合分析**: 结合所有信息给出分析

**可用工具：**

${toolsList}

**输出格式：**

如果需要调用工具：
\`\`\`
需要: 是
工具: tool_name
参数: {"param1": "value1", "param2": "value2"}
思考: [你的推理过程]
\`\`\`

如果不需要工具（已有足够信息）：
\`\`\`
需要: 否
思考: [你的推理过程]
最终答案: [直接回答用户]
\`\`\`

**重要约束：**
- 最多调用 5 次工具
- 工具调用应该有明确的目的，不要滥用
- 优先使用已有知识，必要时再调用工具
- 思考过程要清晰、有逻辑`;
}

/**
 * 构建思考提示词
 */
function buildThoughtPrompt(
  chartText: string | undefined,
  category: string | undefined,
  history: any[] | undefined,
  toolResults: any[] | undefined,
  reasoning: string[] | undefined
): string {
  let prompt = '';

  // 添加命盘信息
  if (chartText) {
    prompt += `【命盘信息】\n${chartText}\n\n`;
  }

  // 添加分析类别
  if (category) {
    prompt += `【分析类别】${category}\n\n`;
  }

  // 添加之前的工具调用结果
  if (toolResults && toolResults.length > 0) {
    prompt += '【已获取的信息】\n';
    toolResults.forEach((result, index) => {
      prompt += `\n--- 工具调用 ${index + 1}: ${result.toolName} ---\n`;
      prompt += result.observation;
    });
    prompt += '\n';
  }

  // 添加之前的思考过程
  if (reasoning && reasoning.length > 0) {
    prompt += '【之前的思考】\n';
    reasoning.forEach((thought, index) => {
      prompt += `${index + 1}. ${thought}\n`;
    });
    prompt += '\n';
  }

  // 添加用户问题
  if (history && history.length > 0) {
    const lastMessage = history[history.length - 1];
    prompt += `【用户问题】\n${lastMessage.content}\n`;
  }

  prompt += '\n请根据以上信息，决定下一步行动。';

  return prompt;
}

/**
 * 解析 AI 决策
 */
function parseAIDecision(response: string): {
  needsTool: boolean;
  toolName?: string;
  parameters?: Record<string, unknown>;
  thought: string;
  finalAnswer?: string;
} {
  // 尝试解析结构化输出
  const needsToolMatch = response.match(/需要[：:]\s*(是|否)/i);
  const needsTool = needsToolMatch ? needsToolMatch[1].includes('是') : false;

  const toolNameMatch = response.match(/工具[：:]\s*(\w+)/);
  const toolName = toolNameMatch ? toolNameMatch[1] : undefined;

  const paramsMatch = response.match(/参数[：:]\s*(\{[^}]+\})/s);
  const parameters = paramsMatch ? JSON.parse(paramsMatch[1]) : undefined;

  const thoughtMatch = response.match(/思考[：:]\s*(.+?)(?=\n需要|工具|参数|最终答案|$)/s);
  const thought = thoughtMatch ? thoughtMatch[1].trim() : response;

  const finalAnswerMatch = response.match(/最终答案[：:]\s*(.+)$/s);
  const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : undefined;

  return {
    needsTool,
    toolName,
    parameters,
    thought,
    finalAnswer,
  };
}
```

### 工具调用节点

```typescript
/**
 * ReAct 工具调用节点
 * 执行 AI 决定的工具调用
 */
export async function reactToolCallNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🔧 ReAct: 执行工具调用...');

  const { toolCalls } = state;

  if (!toolCalls || toolCalls.length === 0) {
    return {
      reactPhase: 'error',
      error: 'No tool calls to execute',
    };
  }

  // 获取最新的工具调用请求
  const latestCall = toolCalls[toolCalls.length - 1];

  try {
    // 查找工具
    const tool = toolRegistry.get(latestCall.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${latestCall.toolName}`);
    }

    console.log(`🔧 执行工具: ${latestCall.toolName}`, latestCall.parameters);

    // 执行工具
    const result = await tool.handler(latestCall.parameters);

    // 格式化观察结果
    const observation = formatToolObservation(result);

    console.log(`✅ 工具执行完成: ${latestCall.toolName}`);

    return {
      toolResults: [
        ...(state.toolResults || []),
        {
          toolName: latestCall.toolName,
          result,
          observation,
        },
      ],
      reactPhase: 'observation',
    };
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      toolResults: [
        ...(state.toolResults || []),
        {
          toolName: latestCall.toolName,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Tool execution failed',
            toolName: latestCall.toolName,
          },
          observation: `工具执行出错: ${error}`,
        },
      ],
      reactPhase: 'observation', // 继续循环，让 AI 知道出错
    };
  }
}

/**
 * 格式化工具观察结果
 */
function formatToolObservation(result: any): string {
  if (!result.success) {
    return `工具执行失败: ${result.error}`;
  }

  if (result.data?.formatted) {
    return result.data.formatted;
  }

  return JSON.stringify(result.data, null, 2);
}
```

### 最终答案节点

```typescript
/**
 * ReAct 最终答案节点
 * 基于所有工具调用结果生成最终响应
 */
export async function reactFinalAnswerNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('✍️ ReAct: 生成最终答案...');

  const { chartText, category, history, toolResults, reasoning } = state;

  // 构建最终答案提示词
  const finalPrompt = buildFinalAnswerPrompt(chartText, category, history, toolResults, reasoning);

  try {
    // 调用 AI 生成最终答案
    const finalAnswer = await InterpretationService.callAI({
      system: `你是一位精通命理的分析师。

**任务：** 基于之前获取的所有信息，为用户提供专业、准确的命理分析。

**要求：**
1. 综合所有工具调用结果
2. 结合命盘信息进行深度分析
3. 给出实用、客观的建议
4. 保持专业、严谨的风格`,
      messages: [{ role: 'user', content: finalPrompt }],
    });

    console.log('✅ 最终答案生成完成');

    return {
      finalAnswer,
      response: finalAnswer, // 同时设置 response 字段以兼容现有流程
      reactPhase: 'final',
    };
  } catch (error) {
    console.error('Final answer generation error:', error);
    return {
      finalAnswer: '抱歉，生成最终答案时出错。',
      response: '抱歉，生成最终答案时出错。',
      reactPhase: 'error',
      error: error instanceof Error ? error.message : 'Final answer failed',
    };
  }
}

/**
 * 构建最终答案提示词
 */
function buildFinalAnswerPrompt(
  chartText: string | undefined,
  category: string | undefined,
  history: any[] | undefined,
  toolResults: any[] | undefined,
  reasoning: string[] | undefined
): string {
  let prompt = '基于以下信息，请为用户提供完整的命理分析：\n\n';

  // 添加命盘信息
  if (chartText) {
    prompt += `【命盘信息】\n${chartText}\n\n`;
  }

  // 添加分析类别
  if (category) {
    prompt += `【分析类别】${category}\n\n`;
  }

  // 添加工具调用结果
  if (toolResults && toolResults.length > 0) {
    prompt += '【获取的额外信息】\n';
    toolResults.forEach((result, index) => {
      prompt += `\n--- 信息源 ${index + 1}: ${result.toolName} ---\n`;
      prompt += result.observation;
    });
    prompt += '\n';
  }

  // 添加用户问题
  if (history && history.length > 0) {
    const lastMessage = history[history.length - 1];
    prompt += `【用户问题】\n${lastMessage.content}\n`;
  }

  prompt += '\n请综合以上所有信息，给出详细的分析和建议。';

  return prompt;
}
```

---

## 状态机集成

### 扩展状态定义

**文件**: `backend/src/types/graph.ts`

```typescript
// 在现有 StateAnnotation 基础上添加新字段

import { Annotation } from '@langchain/langgraph';
import type { ToolCallRequest, ToolCallResponse } from '../tools/types.js';

export const StateAnnotation = Annotation.Root({
  // ===== 现有字段 =====
  birthInfo: Annotation<BirthInfo>,
  category: Annotation<AnalysisCategory>,
  history: Annotation<ChatMessage[]>({ reducer: (_, y) => y, default: () => [] }),
  chart: Annotation<ZiweiChart | undefined>,
  chartText: Annotation<string | undefined>,
  retrievedContext: Annotation<string | undefined>,
  promptData: Annotation<PromptData | undefined>,
  nextNode: Annotation<string | undefined>,
  response: Annotation<string | undefined>,
  error: Annotation<string | undefined>,

  // ===== 新增 ReAct 相关字段 =====

  // ReAct 模式开关
  useReAct: Annotation<boolean>({ default: () => false }),

  // AI 思考过程（后台记录，不向用户展示）
  reasoning: Annotation<string[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
    default: () => []
  }),

  // 工具调用历史
  toolCalls: Annotation<ToolCallRequest[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
    default: () => []
  }),

  // 工具执行结果
  toolResults: Annotation<ToolCallResponse[]>({
    reducer: (x, y) => [...(x || []), ...(y || [])],
    default: () => []
  }),

  // ReAct 循环控制
  maxToolCalls: Annotation<number>({ default: () => 5 }), // 最大工具调用次数
  toolCallCount: Annotation<number>({ default: () => 0 }), // 当前工具调用次数

  // ReAct 状态
  reactPhase: Annotation<'thought' | 'action' | 'observation' | 'final' | 'error' | undefined>,

  // 最终答案
  finalAnswer: Annotation<string | undefined>,
});
```

### 创建 ReAct 图

**文件**: `backend/src/graph/reactGraph.ts`

```typescript
import { StateGraph } from '@langchain/langgraph';
import type { GraphState } from '../types/graph.js';
import { StateAnnotation } from '../types/graph.js';
import * as reactNodes from './reactNodes.js';

/**
 * 创建 ReAct 模式图
 * 用于需要工具调用的复杂分析场景
 */
export function createReactGraph() {
  const workflow = new StateGraph({ stateSchema: StateAnnotation });

  // 设置入口点
  (workflow as any).setEntryPoint('reasoning');

  // 添加节点
  workflow.addNode('reasoning', reactNodes.reactReasoningNode);
  workflow.addNode('toolCall', reactNodes.reactToolCallNode);
  workflow.addNode('finalAnswer', reactNodes.reactFinalAnswerNode);

  // 添加条件边：reasoning -> toolCall 或 finalAnswer
  (workflow as any).addConditionalEdges(
    'reasoning',
    (state: GraphState) => {
      if (state.reactPhase === 'action') {
        return 'toolCall';
      } else if (state.reactPhase === 'final') {
        return 'finalAnswer';
      } else {
        return 'finalAnswer'; // 错误时也进入最终答案
      }
    },
    {
      toolCall: 'toolCall',
      finalAnswer: 'finalAnswer',
    }
  );

  // 添加边：toolCall -> reasoning (循环)
  (workflow as any).addEdge('toolCall', 'reasoning');

  // 编译图
  console.log('🔨 Compiling ReAct Graph...');
  const graph = workflow.compile();
  console.log('✅ ReAct Graph compiled successfully');

  return graph;
}

/**
 * 单例 ReAct 图实例
 */
let _reactGraph: ReturnType<typeof createReactGraph> | null = null;

/**
 * 获取 ReAct 图单例
 */
export function getReactGraph() {
  if (!_reactGraph) {
    _reactGraph = createReactGraph();
  }
  return _reactGraph;
}

/**
 * 便捷函数：执行 ReAct 分析（非流式）
 */
export async function analyzeWithReAct(
  birthInfo: GraphState['birthInfo'],
  category: GraphState['category'],
  chartText: string,
  history: GraphState['history']
): Promise<string> {
  const graph = getReactGraph();

  const initialState: Partial<GraphState> = {
    birthInfo,
    category,
    chartText,
    history,
    useReAct: true,
    toolCallCount: 0,
    reasoning: [],
    toolCalls: [],
    toolResults: [],
  };

  const result = await graph.invoke(initialState as any);
  return result.finalAnswer || result.response || '分析失败，未生成响应';
}

/**
 * 便捷函数：流式执行 ReAct 分析
 */
export async function* streamAnalyzeWithReAct(
  birthInfo: GraphState['birthInfo'],
  category: GraphState['category'],
  chartText: string,
  history: GraphState['history']
): AsyncGenerator<string> {
  const graph = getReactGraph();

  const initialState: Partial<GraphState> = {
    birthInfo,
    category,
    chartText,
    history,
    useReAct: true,
    toolCallCount: 0,
    reasoning: [],
    toolCalls: [],
    toolResults: [],
  };

  // 使用 LangGraph 的 stream API
  for await (const event of await graph.stream(initialState as any)) {
    // 当到达 final 答案阶段，返回最终答案
    if (event.reactPhase === 'final' && event.finalAnswer) {
      yield event.finalAnswer;
      break;
    }
  }
}
```

### 集成到主图

**文件**: `backend/src/graph/destinyGraph.ts`

```typescript
import { StateGraph } from '@langchain/langgraph';
import type { GraphState } from '../types/graph.js';
import { StateAnnotation } from '../types/graph.js';
import * as nodes from './nodes.js';

export function createDestinyGraph() {
  const workflow = new StateGraph({ stateSchema: StateAnnotation });

  (workflow as any).setEntryPoint('router');

  workflow.addNode('router', nodes.routerNode);

  // 原有节点
  workflow.addNode('retrieveCareer', nodes.retrieveCareerNode);
  workflow.addNode('retrieveWealth', nodes.retrieveWealthNode);
  workflow.addNode('retrieveRelationship', nodes.retrieveRelationshipNode);
  workflow.addNode('retrieveHealth', nodes.retrieveHealthNode);
  workflow.addNode('retrieveFamily', nodes.retrieveFamilyNode);
  workflow.addNode('retrieveGeneral', nodes.retrieveGeneralNode);

  // 新增：ReAct 模式入口节点
  workflow.addNode('enterReAct', async (state: GraphState) => {
    console.log('🔄 进入 ReAct 模式...');
    return { useReAct: true };
  });

  workflow.addNode('analyze', nodes.analyzeNode);
  workflow.addNode('respond', nodes.respondNode);

  // 更新路由逻辑：支持 ReAct 模式
  (workflow as any).addConditionalEdges(
    'router',
    (state: GraphState) => {
      // 如果启用 ReAct 模式，路由到 ReAct 入口
      if (state.useReAct) {
        return 'enterReAct';
      }
      // 否则使用原有路由
      return state.nextNode || 'retrieveGeneral';
    },
    {
      enterReAct: 'enterReAct',
      retrieveCareer: 'retrieveCareer',
      retrieveWealth: 'retrieveWealth',
      retrieveRelationship: 'retrieveRelationship',
      retrieveHealth: 'retrieveHealth',
      retrieveFamily: 'retrieveFamily',
      retrieveGeneral: 'retrieveGeneral',
    }
  );

  // 原有边
  for (const node of ['retrieveCareer', 'retrieveWealth', 'retrieveRelationship', 'retrieveHealth', 'retrieveFamily', 'retrieveGeneral']) {
    (workflow as any).addEdge(node, 'analyze');
  }

  // enterReAct -> analyze
  (workflow as any).addEdge('enterReAct', 'analyze');

  (workflow as any).addEdge('analyze', 'respond');

  console.log('🔨 Compiling DestinyGraph with ReAct support...');
  const graph = workflow.compile();
  console.log('✅ DestinyGraph compiled successfully');

  return graph;
}
```

---

## 实现步骤

### 阶段 1: 工具基础设施（1-2 天）

- [ ] 创建 `backend/src/tools/types.ts`
- [ ] 创建 `backend/src/tools/registry.ts`
- [ ] 创建 `backend/src/tools/knowledgeSearchTool.ts`
- [ ] 创建 `backend/src/tools/calendarTool.ts`

### 阶段 2: ReAct 节点（2-3 天）

- [ ] 创建 `backend/src/graph/reactNodes.ts`
- [ ] 实现 `reactReasoningNode`
- [ ] 实现 `reactToolCallNode`
- [ ] 实现 `reactFinalAnswerNode`

### 阶段 3: 状态机集成（1-2 天）

- [ ] 修改 `backend/src/types/graph.ts`
- [ ] 创建 `backend/src/graph/reactGraph.ts`
- [ ] 修改 `backend/src/graph/destinyGraph.ts`

### 阶段 4: API 集成（1 天）

- [ ] 修改 `backend/src/index.ts`，添加 ReAct 端点
- [ ] 测试流式响应

### 阶段 5: 测试和优化（2-3 天）

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化

**总计：7-11 天**

---

## API 集成

### 新增 ReAct 模式端点

**文件**: `backend/src/index.ts`

```typescript
import { analyzeWithReAct, streamAnalyzeWithReAct } from './graph/reactGraph.js';

// ReAct 模式聊天接口（流式）
app.post('/api/chat/react', async (req, res) => {
  const { prompt, chart, category, history, enableReAct = true } = req.body;

  if (!prompt || !chart || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: prompt, chart, category',
    });
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    if (enableReAct) {
      // 使用 ReAct 模式
      for await (const chunk of streamAnalyzeWithReAct(
        { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false },
        category,
        chart,
        history || []
      )) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
      }
    } else {
      // 使用原有模式
      for await (const chunk of streamAnalyzeDestiny(...)) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('ReAct chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' })}\n\n`);
    res.end();
  }
});
```

### 前端调用示例

```typescript
// frontend/src/services/api.ts

export async function chatWithReAct(
  prompt: string,
  chart: string,
  category: AnalysisCategory,
  history: ChatMessage[],
  enableReAct: boolean = true
): AsyncGenerator<string> {
  const response = await fetch('/api/chat/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      chart,
      category,
      history,
      enableReAct,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(5));
        if (data.type === 'token' && data.content) {
          yield data.content;
        }
      }
    }
  }
}
```

---

## 代码示例

### 启用 ReAct 模式

```typescript
// 前端调用
const result = await chatWithReAct(
  "我的事业运势如何？",
  chartText,
  'career',
  messages,
  true  // 启用 ReAct
);
```

### 工具调用流程示例

```
用户: "我的事业运势如何？"

↓ AI 思考
"需要了解命盘中事业相关的星曜配置"

↓ 工具调用
tool: knowledge_search
params: {"category": "career", "keywords": ["事业", "命宫", "官禄宫"]}

↓ 工具返回
"官禄宫显示武曲星坐守..."

↓ AI 再次思考
"需要查看当前日期的黄历"

↓ 工具调用
tool: calendar_almanac
params: {"date": "2025-01-04"}

↓ 工具返回
"今日宜：嫁娶、出行、移讼..."

↓ 最终答案
综合命盘信息和今日黄历，您的事业运势...
```

---

## 向后兼容策略

1. **默认禁用 ReAct**：`useReAct` 默认为 `false`
2. **保留原端点**：`/api/chat` 和 `/api/chat/stream` 不受影响
3. **新增端点**：`/api/chat/react` 用于 ReAct 模式
4. **状态兼容**：新字段使用 `default` 选项

---

## 关键文件清单

### 新建文件（6个）
1. `backend/src/tools/types.ts` - 工具类型定义
2. `backend/src/tools/registry.ts` - 工具注册表
3. `backend/src/tools/knowledgeSearchTool.ts` - 知识库搜索工具
4. `backend/src/tools/calendarTool.ts` - 日历/黄历工具
5. `backend/src/graph/reactNodes.ts` - ReAct 节点
6. `backend/src/graph/reactGraph.ts` - ReAct 状态机

### 修改文件（4个）
1. `backend/src/types/graph.ts` - 扩展状态定义
2. `backend/src/graph/destinyGraph.ts` - 集成 ReAct
3. `backend/src/services/interpretationService.ts` - ReAct 提示词
4. `backend/src/index.ts` - 新增 API 端点
