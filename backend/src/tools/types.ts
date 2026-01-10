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
