/**
 * DestinyGraph - LangGraph 状态机
 * 紫微斗数分析的核心图状态机
 *
 * 状态流转:
 * __start__ -> router -> retrieve{Category} -> analyze -> respond -> __end__
 */

import { StateGraph } from '@langchain/langgraph';
import type { GraphState } from '../types/graph.js';
import { StateAnnotation } from '../types/graph.js';
import * as nodes from './nodes.js';
import { createReactGraph } from './reactGraph.js';
import { agentRegistry } from '../agents/registry.js';
import type { SubAgentInput } from '../agents/types.js';

/**
 * ReAct 流程包装节点
 * 将 ReAct 图作为节点集成到主图中
 */
async function reactFlowNode(state: any): Promise<any> {
  console.log('🧠 Entering ReAct flow...');

  try {
    // 创建 ReAct 图
    const reactGraph = createReactGraph();

    // 构建 ReAct 初始状态
    const reactInitialState = {
      birthInfo: state.birthInfo,
      category: state.category,
      chartText: state.chartText,
      history: state.history,
      useReAct: true,
      maxToolCalls: state.maxToolCalls || 5,
      toolCallCount: 0,
      reasoning: [],
      toolCalls: [],
      toolResults: [],
      reactPhase: 'thought' as const,
    };

    // 执行 ReAct 图
    const reactResult = await reactGraph.invoke(reactInitialState);

    // 将 ReAct 结果转换为标准格式
    return {
      response: reactResult.finalAnswer || reactResult.response,
      finalAnswer: reactResult.finalAnswer,
      reasoning: reactResult.reasoning,
      toolCalls: reactResult.toolCalls,
      toolResults: reactResult.toolResults,
      reactPhase: reactResult.reactPhase,
      // 标记为已处理，直接结束流程
      nextNode: null,
    };
  } catch (error) {
    console.error('ReAct flow error:', error);
    // 如果 ReAct 出错，返回错误信息并继续正常流程
    return {
      response: `ReAct 分析出错: ${error instanceof Error ? error.message : 'Unknown error'}。正在切换到标准分析模式...`,
      error: error instanceof Error ? error.message : 'ReAct failed',
      nextNode: 'retrieveGeneral', // 降级到标准流程
    };
  }
}

/**
 * 创建紫微斗数分析图
 */
export function createDestinyGraph() {
  // 1. 创建状态图
  const workflow = new StateGraph({ stateSchema: StateAnnotation });

  // 2. 设置入口点 (必须在添加节点之前)
  (workflow as any).setEntryPoint('router');

  // 3. 添加所有节点
  workflow.addNode('router', nodes.routerNode);

  // ReAct 流程节点
  workflow.addNode('reactFlow', reactFlowNode);

  // 知识检索节点
  workflow.addNode('retrieveCareer', nodes.retrieveCareerNode);
  workflow.addNode('retrieveWealth', nodes.retrieveWealthNode);
  workflow.addNode('retrieveRelationship', nodes.retrieveRelationshipNode);
  workflow.addNode('retrieveHealth', nodes.retrieveHealthNode);
  workflow.addNode('retrieveFamily', nodes.retrieveFamilyNode);
  workflow.addNode('retrieveGeneral', nodes.retrieveGeneralNode);

  // RAG 知识检索节点 (新增)
  workflow.addNode('retrieveRAG', nodes.retrieveRAGNode);

  // 分析和响应节点
  workflow.addNode('analyze', nodes.analyzeNode);
  workflow.addNode('respond', nodes.respondNode);

  // 4. 添加条件边 (路由器 -> 知识检索节点)
  (workflow as any).addConditionalEdges(
    'router',
    (state: GraphState) => {
      // 如果是 ReAct 流程，检查 nextNode
      if (state.nextNode === 'reactFlow') {
        return 'reactFlow';
      }
      return state.nextNode || 'retrieveGeneral';
    },
    {
      reactFlow: 'reactFlow',
      retrieveCareer: 'retrieveCareer',
      retrieveWealth: 'retrieveWealth',
      retrieveRelationship: 'retrieveRelationship',
      retrieveHealth: 'retrieveHealth',
      retrieveFamily: 'retrieveFamily',
      retrieveGeneral: 'retrieveGeneral',
      retrieveRAG: 'retrieveRAG',  // 新增 RAG 节点
    }
  );

  // 5. 添加固定边
  for (const node of ['retrieveCareer', 'retrieveWealth', 'retrieveRelationship', 'retrieveHealth', 'retrieveFamily', 'retrieveGeneral', 'retrieveRAG']) {
    (workflow as any).addEdge(node, 'analyze');
  }

  (workflow as any).addEdge('analyze', 'respond');

  // ReAct 流程的特殊处理：如果 reactFlow 返回了 response，直接结束
  // 如果返回了 nextNode，继续正常流程
  (workflow as any).addConditionalEdges(
    'reactFlow',
    (state: any) => {
      if (state.response && !state.nextNode) {
        return '__end__'; // ReAct 完成，直接结束
      }
      return state.nextNode || '__end__'; // 默认结束或继续流程
    },
    {
      '__end__': '__end__',
      retrieveGeneral: 'retrieveGeneral',
      retrieveCareer: 'retrieveCareer',
      // 可以根据需要添加更多回退选项
    }
  );

  // 6. 编译图
  console.log('🔨 Compiling DestinyGraph...');
  const graph = workflow.compile();
  console.log('✅ DestinyGraph compiled successfully');

  return graph;
}

/**
 * 单例图实例
 */
let _destinyGraph: ReturnType<typeof createDestinyGraph> | null = null;

/**
 * 获取 DestinyGraph 单例
 */
export function getDestinyGraph() {
  if (!_destinyGraph) {
    _destinyGraph = createDestinyGraph();
  }
  return _destinyGraph;
}

/**
 * 便捷函数：执行分析（非流式）
 */
export async function analyzeDestiny(
  birthInfo: GraphState['birthInfo'],
  category: GraphState['category'],
  chartText: string,
  history: GraphState['history']
): Promise<string> {
  const graph = getDestinyGraph();

  const initialState: Partial<GraphState> = {
    birthInfo,
    category,
    chartText,
    history,
  };

  const result = await graph.invoke(initialState as any);
  return result.response || '分析失败，未生成响应';
}

/**
 * 便捷函数：流式执行分析
 *
 * 主路径: 委托给 ZiweiAgent.analyzeStream()，复用 Multi-Agent 的 prompt 和知识检索逻辑。
 * 降级路径: 如果 ZiweiAgent 不可用，降级到原 LangGraph 图逻辑。
 *
 * 注意: v1 调用约定 — history 最后一项为当前用户消息，其余为对话历史。
 */
export async function* streamAnalyzeDestiny(
  birthInfo: GraphState['birthInfo'],
  category: GraphState['category'],
  chartText: string,
  history: GraphState['history']
): AsyncGenerator<string> {
  // v1 convention: fullHistory = [...conversationHistory, currentPrompt]
  const userMessage = history[history.length - 1]?.content ?? '';
  const conversationHistory = history.slice(0, -1);

  const ziweiAgent = agentRegistry.get('ziwei');
  if (ziweiAgent) {
    const currentYear = new Date().getFullYear();
    const currentAge = birthInfo.year > 0 ? currentYear - birthInfo.year : undefined;

    const input: SubAgentInput = {
      birthInfo,
      subCategory: category,
      chartText,
      userMessage,
      history: conversationHistory,
      currentYear,
      currentAge,
    };

    yield* ziweiAgent.analyzeStream(input);
    return;
  }

  // 降级路径：ZiweiAgent 不可用时使用原 LangGraph 图
  process.stdout.write(JSON.stringify({ event: 'ziwei_agent_unavailable_fallback' }) + '\n');
  const { InterpretationService } = await import('../services/interpretationService.js');
  const graph = getDestinyGraph();

  const initialState: Partial<GraphState> = {
    birthInfo,
    category,
    chartText,
    history,
  };

  const result = await graph.invoke(initialState as any);

  if (result.response) {
    yield result.response;
  } else if (result.promptData) {
    yield* InterpretationService.stream(result.promptData as any);
  } else {
    throw new Error('分析失败：未生成 promptData 或 response');
  }
}

// 导出单例
export const destinyGraph = getDestinyGraph();
