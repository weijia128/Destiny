/**
 * Supervisor Agent
 * 分析用户意图，将请求分发给合适的 Sub-Agent，支持并行执行
 */

import type {
  SupervisorDispatch,
  SubAgentInput,
  SubAgentOutput,
  V2AnalyzeRequest,
} from './types.js';
import type { DestinyType, SubCategory } from '../types/index.js';
import { agentRegistry } from './registry.js';

/**
 * 意图识别 — 根据关键词判断应调用哪些术数
 */
function detectIntentTypes(
  userMessage: string,
  preferredTypes?: ReadonlyArray<DestinyType>,
): DestinyType[] {
  if (preferredTypes && preferredTypes.length > 0) {
    return [...preferredTypes];
  }

  const ziwei = /紫微|斗数|命宫|身宫|大限|四化|星盘|宫位|主星/.test(userMessage);
  const bazi = /八字|四柱|日主|天干|地支|十神|用神|大运|纳音|格局|日柱|月柱|年柱|时柱/.test(userMessage);
  const meihua = /梅花易数|梅花|易数|起卦|卦象/.test(userMessage);

  const detected: DestinyType[] = [];
  if (ziwei) detected.push('ziwei');
  if (bazi) detected.push('bazi');
  if (meihua) detected.push('meihua');

  // 默认返回紫微（主要系统）
  if (detected.length === 0) detected.push('ziwei');

  return detected;
}

/**
 * 子分类推断 — 从用户消息推断分析维度
 */
function detectSubCategory(
  userMessage: string,
  requestedCategory?: SubCategory,
): SubCategory {
  if (requestedCategory) return requestedCategory;

  if (/事业|工作|职业|升职|创业|老板/.test(userMessage)) return 'career';
  if (/财运|财富|钱|投资|赚钱|收入|偏财|正财/.test(userMessage)) return 'wealth';
  if (/感情|婚姻|恋爱|配偶|夫妻|伴侣|对象/.test(userMessage)) return 'relationship';
  if (/健康|身体|疾病|生病|养生/.test(userMessage)) return 'health';
  if (/家庭|父母|子女|兄弟|姐妹|亲人/.test(userMessage)) return 'family';
  if (/格局|命格|八字格局|层次/.test(userMessage)) return 'geju';
  if (/用神|喜用神|忌神/.test(userMessage)) return 'yongshen';
  if (/十神|正官|七杀|食神|伤官|比肩|劫财/.test(userMessage)) return 'shishen';
  if (/大运|流年|运程|运势/.test(userMessage)) return 'dayun';

  return 'general';
}

/**
 * 决定是否需要多 Agent 融合
 */
function shouldFuse(targetTypes: DestinyType[]): boolean {
  return targetTypes.length > 1;
}

/**
 * 生成分发方案
 */
export function buildDispatch(request: V2AnalyzeRequest): SupervisorDispatch {
  const targetTypes = detectIntentTypes(request.userMessage, request.preferredTypes);
  const available = targetTypes.filter(t => agentRegistry.has(t));

  // 如果目标 Agent 都不可用，fallback 到 ziwei
  const finalTypes = available.length > 0 ? available : ['ziwei' as DestinyType];
  const primaryAgent = finalTypes[0];

  return {
    targetAgents: finalTypes,
    primaryAgent,
    reason: finalTypes.length > 1
      ? `检测到用户问题涉及多个术数系统（${finalTypes.join('、')}），将并行分析后融合`
      : `问题主要涉及 ${primaryAgent} 分析`,
    shouldFuse: shouldFuse(finalTypes),
  };
}

/**
 * 并行执行所有目标 Agent 的非流式分析
 */
export async function dispatchAnalyze(
  request: V2AnalyzeRequest,
  dispatch: SupervisorDispatch,
): Promise<SubAgentOutput[]> {
  const subCategory = detectSubCategory(request.userMessage, request.subCategory);
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - request.birthInfo.year;

  const tasks = dispatch.targetAgents.map(async (destinyType) => {
    const agent = agentRegistry.get(destinyType);
    if (!agent) return null;

    // 生成对应术数的命盘文本
    const chartText = await agent.generateChart(request.birthInfo).catch(() => '');

    const input: SubAgentInput = {
      birthInfo: request.birthInfo,
      subCategory,
      chartText,
      userMessage: request.userMessage,
      history: request.history,
      currentYear,
      currentAge,
    };

    try {
      return await agent.analyze(input);
    } catch (error) {
      console.error(`[Supervisor] Agent ${destinyType} failed:`, error);
      return null;
    }
  });

  const results = await Promise.all(tasks);
  return results.filter((r): r is SubAgentOutput => r !== null);
}

/**
 * 流式执行 — 只用 primary agent 流式输出，其余 agent 后台计算后追加
 * 注意：v2 流式场景简化处理，仅对 primaryAgent 做流式
 */
export async function *dispatchStream(
  request: V2AnalyzeRequest,
  dispatch: SupervisorDispatch,
): AsyncGenerator<string> {
  const subCategory = detectSubCategory(request.userMessage, request.subCategory);
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - request.birthInfo.year;
  const primaryAgent = agentRegistry.get(dispatch.primaryAgent);

  if (!primaryAgent) {
    throw new Error(`Primary agent ${dispatch.primaryAgent} not registered`);
  }

  const chartText = await primaryAgent.generateChart(request.birthInfo).catch(() => '');

  const input: SubAgentInput = {
    birthInfo: request.birthInfo,
    subCategory,
    chartText,
    userMessage: request.userMessage,
    history: request.history,
    currentYear,
    currentAge,
  };

  yield* primaryAgent.analyzeStream(input);
}
