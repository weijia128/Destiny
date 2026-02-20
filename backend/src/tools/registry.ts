import { Tool, type ToolCallRequest, type ToolCallResponse, type ToolParameter } from './types.js';
import { knowledgeSearchTool } from './knowledgeSearchTool.js';
import { calendarTool } from './calendarTool.js';
import { ToolNotFoundError, ToolParameterError } from '../errors/AppError.js';

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
   * 注销工具（主要用于测试）
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
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
   * 统一执行工具：包含查找、参数校验、异常封装
   */
  async execute(request: ToolCallRequest): Promise<ToolCallResponse> {
    const tool = this.get(request.toolName);
    if (!tool) {
      throw new ToolNotFoundError(request.toolName);
    }

    this.validateParameters(tool.name, tool.parameters, request.parameters);

    const result = await tool.handler(request.parameters);
    return {
      toolName: request.toolName,
      result,
      observation: result.success
        ? this.formatObservation(result.data)
        : `工具执行失败: ${result.error ?? 'unknown error'}`,
    };
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

  private validateParameters(
    toolName: string,
    specs: ToolParameter[],
    params: Record<string, unknown>
  ): void {
    specs.forEach(spec => {
      if (spec.required && !(spec.name in params)) {
        throw new ToolParameterError(toolName, spec.name, 'missing required parameter');
      }
      if (!(spec.name in params)) {
        return;
      }
      const value = params[spec.name];
      if (!this.matchesType(value, spec.type)) {
        throw new ToolParameterError(
          toolName,
          spec.name,
          `expected ${spec.type}, got ${Array.isArray(value) ? 'array' : typeof value}`
        );
      }
    });
  }

  private matchesType(value: unknown, expected: ToolParameter['type']): boolean {
    if (expected === 'array') {
      return Array.isArray(value);
    }
    if (expected === 'object') {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    return typeof value === expected;
  }

  private formatObservation(data: unknown): string {
    if (typeof data === 'object' && data !== null && 'formatted' in data) {
      const formatted = (data as { formatted?: unknown }).formatted;
      if (typeof formatted === 'string') {
        return formatted;
      }
    }
    return JSON.stringify(data ?? {}, null, 2);
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry();
