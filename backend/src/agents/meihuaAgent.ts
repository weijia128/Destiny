/**
 * 梅花易数 Sub-Agent（占位实现）
 * 先提供最小可用能力：v2 analyze 可路由到 meihua 并返回结果
 */

import type { SubAgent, SubAgentInput, SubAgentMetadata, SubAgentOutput } from './types.js';
import type { BirthInfo, DestinyType, SubCategory } from '../types/index.js';
import { InterpretationService } from '../services/interpretationService.js';
import { MeihuaService } from '../services/meihuaService.js';

const MEIHUA_CATEGORIES: ReadonlyArray<SubCategory> = [
  'career',
  'wealth',
  'relationship',
  'health',
  'family',
  'general',
];

function hasAnyLikelyApiKey(): boolean {
  const keys = [process.env.DEEPSEEK_API_KEY, process.env.MINIMAX_API_KEY, process.env.ANTHROPIC_API_KEY];
  return keys.some(k => typeof k === 'string' && k.trim().length > 0 && !/your_api_key_here|your-key-here|example|dummy|test/i.test(k));
}

export class MeihuaAgent implements SubAgent {
  readonly name = '梅花易数分析师';
  readonly destinyType: DestinyType = 'meihua';
  readonly description = '基于梅花易数起卦与体用生克进行占测（占位实现，链路打通优先）';

  getSupportedCategories(): ReadonlyArray<SubCategory> {
    return MEIHUA_CATEGORIES;
  }

  canHandle(input: SubAgentInput): boolean {
    return MEIHUA_CATEGORIES.includes(input.subCategory);
  }

  async generateChart(birthInfo: BirthInfo): Promise<string> {
    const chart = MeihuaService.generate(birthInfo);
    return MeihuaService.formatForAI(chart);
  }

  async analyze(input: SubAgentInput): Promise<SubAgentOutput> {
    const startTime = Date.now();

    const system = `你是一位精通梅花易数的老师。现在用户提出问题，你需要给出简洁、可执行的占测建议。

【重要说明】
- 当前版本为“链路占位”阶段：允许给出合理的概括性建议，但不要编造具体卦象细节（如上下卦、动爻、体用等）。
- 若信息不足，请先向用户提出 1-2 个澄清问题（例如：想占测的时间范围/可选选项/行动约束）。

【占测信息】
${input.chartText || '（暂无）'}
`;

    const promptData = {
      system,
      messages: [
        ...input.history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: input.userMessage },
      ],
    };

    let analysis: string;
    if (hasAnyLikelyApiKey()) {
      analysis = await InterpretationService.callAI(promptData as any);
    } else {
      analysis = [
        '【梅花易数（占位版）】',
        `问题：${input.userMessage}`,
        '',
        '当前版本已跑通前后端链路，卦象算法与细节解读后续补齐。',
      ].join('\n');
    }

    const executionTimeMs = Date.now() - startTime;
    const metadata: SubAgentMetadata = {
      chartSummary: (input.chartText || '').slice(0, 200),
      knowledgeUsed: [],
      executionTimeMs,
      modelUsed: InterpretationService.getProvider?.() ?? undefined,
    };

    return {
      destinyType: this.destinyType,
      subCategory: input.subCategory,
      analysis,
      confidence: 0.5,
      metadata,
    };
  }

  async *analyzeStream(input: SubAgentInput): AsyncGenerator<string> {
    if (!hasAnyLikelyApiKey()) {
      yield [
        '【梅花易数（占位版）】',
        `问题：${input.userMessage}`,
        '',
        '当前版本已跑通前后端链路，卦象算法与细节解读后续补齐。',
      ].join('\n');
      return;
    }

    const system = `你是一位精通梅花易数的老师。现在用户提出问题，你需要给出简洁、可执行的占测建议。

【重要说明】
- 当前版本为“链路占位”阶段：允许给出合理的概括性建议，但不要编造具体卦象细节（如上下卦、动爻、体用等）。
- 若信息不足，请先向用户提出 1-2 个澄清问题（例如：想占测的时间范围/可选选项/行动约束）。

【占测信息】
${input.chartText || '（暂无）'}
`;

    const promptData = {
      system,
      messages: [
        ...input.history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: input.userMessage },
      ],
    };

    yield* InterpretationService.stream(promptData as any);
  }
}

