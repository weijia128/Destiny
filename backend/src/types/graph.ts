/**
 * LangGraph 状态类型定义
 * 用于紫微斗数分析图状态机
 */

import type {
  BirthInfo,
  ZiweiChart,
  AnalysisCategory,
  ChatMessage,
} from './index.js';
import { Annotation } from '@langchain/langgraph';
import type { ToolCallRequest, ToolCallResponse } from '../tools/types.js';

/**
 * AI 提示词数据结构
 */
export interface PromptData {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * LangGraph 状态通道定义
 * 使用 Annotation 定义可变状态
 */
export const StateAnnotation = Annotation.Root({
  // ===== 现有字段 =====
  birthInfo: Annotation<BirthInfo>,
  category: Annotation<AnalysisCategory>,
  history: Annotation<ChatMessage[]>({
    reducer: (existing, newValue) => newValue ?? existing,
    default: () => [],
  }),
  chart: Annotation<ZiweiChart | undefined>,
  chartText: Annotation<string | undefined>,
  retrievedContext: Annotation<string | undefined>,
  promptData: Annotation<PromptData | undefined>,
  nextNode: Annotation<string | undefined>,
  metadata: Annotation<Record<string, any> | undefined>({
    reducer: (existing, newValue) => newValue ?? existing,
    default: () => ({}),
  }),
  response: Annotation<string | undefined>,
  error: Annotation<string | undefined>,

  // ===== 新增 ReAct 相关字段 =====

  // ReAct 模式开关
  useReAct: Annotation<boolean>({
    reducer: (existing, newValue) => newValue ?? existing,
    default: () => false
  }),

  // AI 思考过程（后台记录，不向用户展示）
  reasoning: Annotation<string[]>({
    reducer: (existing = [], newValue = []) => [...existing, ...newValue],
    default: () => []
  }),

  // 工具调用历史
  toolCalls: Annotation<ToolCallRequest[]>({
    reducer: (existing = [], newValue = []) => [...existing, ...newValue],
    default: () => []
  }),

  // 工具执行结果
  toolResults: Annotation<ToolCallResponse[]>({
    reducer: (existing = [], newValue = []) => [...existing, ...newValue],
    default: () => []
  }),

  // ReAct 循环控制
  maxToolCalls: Annotation<number>({
    reducer: (existing, newValue) => newValue ?? existing,
    default: () => 5
  }), // 最大工具调用次数
  toolCallCount: Annotation<number>({
    reducer: (existing, newValue) => newValue ?? existing,
    default: () => 0
  }), // 当前工具调用次数

  // ReAct 状态
  reactPhase: Annotation<'thought' | 'action' | 'observation' | 'final' | 'error' | undefined>,

  // 最终答案
  finalAnswer: Annotation<string | undefined>,
});

/**
 * 从 StateAnnotation 提取状态类型
 */
export type GraphState = typeof StateAnnotation.State;

/**
 * 从 StateAnnotation 提取更新类型
 */
export type GraphStateUpdate = typeof StateAnnotation.Update;
