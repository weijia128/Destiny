import { StateGraph, START, END } from '@langchain/langgraph';
import { StateAnnotation } from '../types/graph.js';
import { reactReasoningNode, reactToolCallNode, reactFinalAnswerNode } from './reactNodes.js';

/**
 * 创建 ReAct 状态机图
 * 实现 ReAct 模式的状态流转
 */
export function createReactGraph() {
  // 创建状态图
  const workflow = new StateGraph({ stateSchema: StateAnnotation });

  // 设置入口点 (必须在添加节点之前)
  (workflow as any).setEntryPoint('reactReasoning');

  // 添加 ReAct 节点
  workflow.addNode('reactReasoning', reactReasoningNode);
  workflow.addNode('reactToolCall', reactToolCallNode);
  workflow.addNode('reactFinalAnswer', reactFinalAnswerNode);

  // 添加状态流转边
  (workflow as any).addConditionalEdges(
    'reactReasoning',
    (state: any) => {
      // 根据 AI 决策决定下一步
      if (state.reactPhase === 'action') {
        return 'reactToolCall';
      } else if (state.reactPhase === 'final') {
        return 'reactFinalAnswer';
      } else if (state.reactPhase === 'error') {
        return 'reactFinalAnswer'; // 即使出错也生成最终答案
      } else {
        return 'reactReasoning'; // 默认继续推理
      }
    },
    {
      reactToolCall: 'reactToolCall',
      reactFinalAnswer: 'reactFinalAnswer',
      reactReasoning: 'reactReasoning',
    }
  );

  // 工具调用后回到思考节点
  (workflow as any).addEdge('reactToolCall', 'reactReasoning');

  // 设置结束点
  (workflow as any).setFinishPoint('reactFinalAnswer');

  return workflow.compile();
}

/**
 * 使用 ReAct 模式分析（流式执行）
 */
export async function streamAnalyzeWithReAct(
  birthInfo: any,
  category: string,
  chartText: string,
  history: any[],
  options: {
    enableKnowledge?: boolean;
    enableExternal?: boolean;
    maxToolCalls?: number;
  } = {}
) {
  const graph = createReactGraph();

  // 构建初始状态
  const initialState = {
    birthInfo,
    category: category as any, // 类型断言以兼容 LangGraph
    chartText,
    history,
    useReAct: true,
    maxToolCalls: options.maxToolCalls || 5,
    toolCallCount: 0,
    reasoning: [],
    toolCalls: [],
    toolResults: [],
    reactPhase: 'thought' as const,
  };

  // 配置工具可用性（可选）
  // 这里可以根据 options 控制是否启用特定类型的工具
  // 目前所有工具都默认启用

  try {
    // 执行状态机
    const finalState = await graph.invoke(initialState);

    return {
      success: true,
      finalAnswer: finalState.finalAnswer,
      reasoning: finalState.reasoning,
      toolCalls: finalState.toolCalls,
      toolResults: finalState.toolResults,
      reactPhase: finalState.reactPhase,
    };
  } catch (error) {
    console.error('ReAct analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ReAct analysis failed',
      reactPhase: 'error',
    };
  }
}

/**
 * 使用 ReAct 模式分析（非流式执行）
 */
export async function analyzeWithReAct(
  birthInfo: any,
  category: string,
  chartText: string,
  history: any[],
  options: {
    enableKnowledge?: boolean;
    enableExternal?: boolean;
    maxToolCalls?: number;
  } = {}
) {
  return streamAnalyzeWithReAct(birthInfo, category, chartText, history, options);
}

/**
 * 获取 ReAct 执行统计信息
 */
export function getReactStats(toolResults: any[]) {
  const stats = {
    totalToolCalls: toolResults.length,
    successfulCalls: 0,
    failedCalls: 0,
    executionTime: 0,
    toolsUsed: new Set<string>(),
  };

  toolResults.forEach((result) => {
    if (result.result?.success) {
      stats.successfulCalls++;
    } else {
      stats.failedCalls++;
    }
    stats.executionTime += result.result?.executionTime || 0;
    stats.toolsUsed.add(result.toolName);
  });

  return {
    ...stats,
    toolsUsed: Array.from(stats.toolsUsed),
    averageExecutionTime: stats.totalToolCalls > 0 ? stats.executionTime / stats.totalToolCalls : 0,
  };
}

/**
 * 验证 ReAct 配置
 */
export function validateReactConfig(config: {
  enableKnowledge?: boolean;
  enableExternal?: boolean;
  maxToolCalls?: number;
}) {
  const errors: string[] = [];

  if (config.maxToolCalls !== undefined) {
    if (config.maxToolCalls < 1 || config.maxToolCalls > 10) {
      errors.push('maxToolCalls must be between 1 and 10');
    }
  }

  if (config.enableKnowledge === false && config.enableExternal === false) {
    errors.push('At least one tool category must be enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
