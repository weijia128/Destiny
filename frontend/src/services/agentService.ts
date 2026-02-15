import type { AgentState, AgentNode, ChatMessage, AnalysisCategory, ZiweiChart } from '@/types';
import { promptBuilderFactory, ZiweiPromptBuilder } from './prompts';
import type { PromptBuildResult, FormattedData } from './prompts';

/**
 * LangGraph 风格的状态机
 * 管理命理分析 Agent 的状态流转
 */

// 状态转换图
const stateTransitions: Record<AgentNode, AgentNode[]> = {
  idle: ['collecting_birth_info'],
  collecting_birth_info: ['generating_chart', 'error'],
  generating_chart: ['selecting_category', 'error'],
  selecting_category: ['retrieving_knowledge', 'responding'],
  retrieving_knowledge: ['analyzing'],
  analyzing: ['responding'],
  responding: ['selecting_category', 'idle'],
  error: ['idle'],
};

// 检查状态转换是否有效
export function canTransition(from: AgentNode, to: AgentNode): boolean {
  return stateTransitions[from]?.includes(to) ?? false;
}

// 状态机类
export class DestinyAgentStateMachine {
  private state: AgentState;
  private onStateChange?: (state: AgentState) => void;

  constructor(initialState?: Partial<AgentState>) {
    this.state = {
      currentNode: 'idle',
      messages: [],
      ...initialState,
    };
  }

  // 设置状态变更回调
  setOnStateChange(callback: (state: AgentState) => void) {
    this.onStateChange = callback;
  }

  // 获取当前状态
  getState(): AgentState {
    return { ...this.state };
  }

  // 更新状态
  private updateState(updates: Partial<AgentState>) {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
  }

  // 转换到新节点
  transition(to: AgentNode) {
    if (!canTransition(this.state.currentNode, to)) {
      console.warn(`Invalid transition: ${this.state.currentNode} -> ${to}`);
      return false;
    }
    this.updateState({ currentNode: to, error: undefined });
    return true;
  }

  // 设置命盘
  setChart(chart: ZiweiChart) {
    this.updateState({ chart });
  }

  // 设置分析类别
  setCategory(category: AnalysisCategory) {
    this.updateState({ category });
  }

  // 设置检索上下文
  setRetrievedContext(context: string) {
    this.updateState({ retrievedContext: context });
  }

  // 添加消息
  addMessage(message: ChatMessage) {
    this.updateState({
      messages: [...this.state.messages, message],
    });
  }

  // 更新最后一条消息
  updateLastMessage(content: string) {
    const messages = [...this.state.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content,
        isStreaming: false,
      };
      this.updateState({ messages });
    }
  }

  // 设置错误
  setError(error: string) {
    this.updateState({
      currentNode: 'error',
      error,
    });
  }

  // 重置状态
  reset() {
    this.updateState({
      currentNode: 'idle',
      messages: [],
      chart: undefined,
      category: undefined,
      retrievedContext: undefined,
      error: undefined,
    });
  }
}

/**
 * 知识库检索（使用新的 Prompt 构建系统）
 * @param category - 分析类别
 * @param chart - 命盘数据
 * @returns 知识库内容
 */
export async function retrieveKnowledge(
  category: AnalysisCategory,
  _chart: ZiweiChart
): Promise<string> {
  // 使用 Prompt 构建器获取知识库
  const builder = promptBuilderFactory.getBuilderByCategory(category);
  const knowledge = builder.getKnowledge(category);

  // 模拟延迟（保持原有行为）
  await new Promise(resolve => setTimeout(resolve, 500));

  return knowledge;
}

// 构建分析 Prompt（使用新的 Prompt 构建系统）
export function buildAnalysisPrompt(
  chart: ZiweiChart,
  category: AnalysisCategory,
  userQuestion: string,
  retrievedContext: string
): string {
  // 使用 Prompt 构建器格式化命盘数据
  const formattedData: FormattedData = ZiweiPromptBuilder.formatChart(chart);

  // 获取对应的 Prompt 构建器
  const builder = promptBuilderFactory.getBuilderByCategory(category);

  // 获取知识库
  const knowledge = builder.getKnowledge(category);

  // 构建完整的 prompt
  const result: PromptBuildResult = builder.buildPrompt(
    category,
    formattedData,
    retrievedContext || knowledge,
    userQuestion,
    []
  );

  // 返回完整的 prompt（包含命盘信息、知识库、用户问题）
  return `${result.systemPrompt}

【用户问题】
${userQuestion}`;
}

// 获取类别名称（使用新的 Prompt 构建系统）
export function getCategoryName(category: AnalysisCategory): string {
  const builder = promptBuilderFactory.getBuilderByCategory(category);
  return builder.getCategoryName(category);
}

// 创建默认状态机实例
export const defaultStateMachine = new DestinyAgentStateMachine();
