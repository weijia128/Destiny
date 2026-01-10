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
