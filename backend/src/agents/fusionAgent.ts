/**
 * Fusion Agent
 * 综合多个 Sub-Agent 的结果，识别一致性、互补性、矛盾点，输出统一叙述
 */

import type { FusionInput, FusionOutput, SubAgentOutput } from './types.js';
import { InterpretationService } from '../services/interpretationService.js';

function getDestinyTypeLabel(destinyType: SubAgentOutput['destinyType']): string {
  switch (destinyType) {
    case 'ziwei':
      return '紫微斗数';
    case 'bazi':
      return '八字命理';
    case 'meihua':
      return '梅花易数';
    case 'qimen':
      return '奇门遁甲';
    case 'liuyao':
      return '六爻预测';
    case 'shouxiang':
      return '手相面相';
    default:
      return String(destinyType);
  }
}

/**
 * 构建融合分析的系统提示
 */
function buildFusionPrompt(input: FusionInput): string {
  const resultsText = input.agentResults
    .map((r, i) => `【${getDestinyTypeLabel(r.destinyType)}分析结果 ${i + 1}】\n${r.analysis}`)
    .join('\n\n---\n\n');

  return `你是一位贯通各类术数的综合命理大师。现在有多种术数的独立分析结果，请你进行融合解读。

【用户问题】
${input.userMessage}

【各术数独立分析】
${resultsText}

【融合分析要求】
1. 一致性：指出各术数分析中相互印证的结论（如紫微和八字都显示事业运旺）
2. 互补性：指出各术数从不同角度补充的信息
3. 矛盾点：如有明显分歧，客观呈现并给出合理解释
4. 综合结论：给出最终综合性的分析建议

请以"综合命理分析"的格式，给出完整的融合报告。`;
}

/**
 * 从多 Agent 结果中提取一致点
 */
function extractConsistency(results: ReadonlyArray<SubAgentOutput>): string[] {
  if (results.length < 2) return [];

  const consistencyPatterns = [
    { pattern: /事业.{0,10}旺|事业运.{0,5}好/, label: '事业运势向好' },
    { pattern: /财运.{0,10}旺|财运.{0,5}好/, label: '财运状态良好' },
    { pattern: /感情.{0,10}稳|婚姻.{0,5}稳/, label: '感情婚姻稳定' },
    { pattern: /健康.{0,5}注意|身体.{0,5}保养/, label: '健康需关注' },
    { pattern: /大运.{0,10}好|运势.{0,5}上升/, label: '大运整体向好' },
  ];

  return consistencyPatterns
    .filter(({ pattern }) => results.every(r => pattern.test(r.analysis)))
    .map(({ label }) => label);
}

/**
 * 提取互补信息
 */
function extractComplementary(results: ReadonlyArray<SubAgentOutput>): string[] {
  return results.map(r => {
    const typeLabel = getDestinyTypeLabel(r.destinyType);
    return `${typeLabel}视角：${r.analysis.slice(0, 100)}...`;
  });
}

/**
 * Fusion Agent 主函数（非流式）
 */
export async function fuseResults(input: FusionInput): Promise<FusionOutput> {
  const { agentResults } = input;

  if (agentResults.length === 0) {
    return {
      narrative: '暂无分析结果',
      consistency: [],
      complementary: [],
      contradictions: [],
      sources: [],
    };
  }

  // 只有一个 Agent 结果时直接返回
  if (agentResults.length === 1) {
    return {
      narrative: agentResults[0].analysis,
      consistency: [],
      complementary: [],
      contradictions: [],
      sources: [agentResults[0].destinyType],
    };
  }

  // 多 Agent 融合
  const consistency = extractConsistency(agentResults);
  const complementary = extractComplementary(agentResults);

  const fusionPromptData = {
    system: buildFusionPrompt(input),
    messages: [{ role: 'user' as const, content: '请综合以上各术数分析，给出融合报告。' }],
    categoryName: '综合融合分析',
  };

  let narrative: string;
  try {
    narrative = await InterpretationService.callAI(fusionPromptData);
  } catch {
    // 融合失败时，直接拼接各 Agent 结果
    narrative = agentResults
      .map(r => `【${getDestinyTypeLabel(r.destinyType)}】\n${r.analysis}`)
      .join('\n\n---\n\n');
  }

  return {
    narrative,
    consistency,
    complementary,
    contradictions: [],
    sources: agentResults.map(r => r.destinyType),
  };
}

/**
 * Fusion Agent 流式版本
 */
export async function *fuseResultsStream(input: FusionInput): AsyncGenerator<string> {
  if (input.agentResults.length <= 1) {
    const text = input.agentResults[0]?.analysis || '暂无分析结果';
    yield `data: ${JSON.stringify({ type: 'token', content: text })}\n\n`;
    yield 'data: [DONE]\n\n';
    return;
  }

  const fusionPromptData = {
    system: buildFusionPrompt(input),
    messages: [{ role: 'user' as const, content: '请综合以上各术数分析，给出融合报告。' }],
    categoryName: '综合融合分析',
  };

  yield* InterpretationService.stream(fusionPromptData);
}
