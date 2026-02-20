import type { PromptData } from './graph.js';
import type { DestinyType, SubCategory } from './index.js';
import type { ToolCallResponse } from '../tools/types.js';

/**
 * Function-calling 循环配置（请求侧可传入）
 */
export interface FunctionCallingConfig {
  readonly enabled?: boolean;
  readonly maxIterations?: number;
  readonly maxToolCalls?: number;
  readonly allowedTools?: ReadonlyArray<string>;
}

/**
 * Function-calling 运行时配置（归一化后）
 */
export interface FunctionCallingRuntimeConfig {
  readonly enabled: boolean;
  readonly maxIterations: number;
  readonly maxToolCalls: number;
  readonly allowedTools: ReadonlyArray<string>;
}

/**
 * 工具执行上下文
 */
export interface FunctionCallingToolContext {
  readonly traceId?: string;
  readonly destinyType?: DestinyType;
  readonly subCategory?: SubCategory;
  readonly chartText?: string;
  readonly userMessage?: string;
}

/**
 * Function-calling 执行输入
 */
export interface FunctionCallingInput {
  readonly promptData: PromptData;
  readonly config: FunctionCallingRuntimeConfig;
  readonly toolContext?: FunctionCallingToolContext;
}

/**
 * 模型单轮动作
 */
export type FunctionCallingAction =
  | {
      readonly action: 'tool';
      readonly toolName: string;
      readonly parameters?: Record<string, unknown>;
      readonly reason?: string;
    }
  | {
      readonly action: 'final';
      readonly answer: string;
      readonly reason?: string;
    };

/**
 * 终止原因
 */
export type FunctionCallingTerminationReason =
  | 'disabled'
  | 'final'
  | 'max_iterations'
  | 'max_tool_calls'
  | 'parse_error'
  | 'error';

/**
 * Function-calling 调试轨迹（写入 SubAgent metadata）
 */
export interface FunctionCallingTrace {
  readonly enabled: boolean;
  readonly iterations: number;
  readonly toolCalls: ReadonlyArray<ToolCallResponse>;
  readonly terminationReason: FunctionCallingTerminationReason;
  readonly fallbackUsed: boolean;
}

/**
 * Function-calling 输出
 */
export interface FunctionCallingResult {
  readonly answer: string;
  readonly trace: FunctionCallingTrace;
}
