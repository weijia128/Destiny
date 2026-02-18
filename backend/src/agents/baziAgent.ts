/**
 * 八字命理 Sub-Agent
 * 封装 BaziService 计算 + 知识检索 + BaziPromptBuilder
 */

import type { SubAgent, SubAgentInput, SubAgentOutput, SubAgentMetadata } from './types.js';
import type { BirthInfo, DestinyType, SubCategory } from '../types/index.js';
import { BaziService } from '../services/baziService.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { InterpretationService } from '../services/interpretationService.js';
import { promptBuilderFactory } from '../prompts/index.js';

const BAZI_CATEGORIES: ReadonlyArray<SubCategory> = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'geju', 'yongshen', 'shishen', 'dayun',
];

export class BaziAgent implements SubAgent {
  readonly name = '八字命理分析师';
  readonly destinyType: DestinyType = 'bazi';
  readonly description = '基于四柱八字进行命理分析，包含格局、用神、十神、大运流年等';

  getSupportedCategories(): ReadonlyArray<SubCategory> {
    return BAZI_CATEGORIES;
  }

  canHandle(input: SubAgentInput): boolean {
    return BAZI_CATEGORIES.includes(input.subCategory);
  }

  /**
   * 根据出生信息生成八字命盘文本
   */
  async generateChart(birthInfo: BirthInfo): Promise<string> {
    const chart = BaziService.generate(birthInfo);
    return BaziService.formatForAI(chart, birthInfo);
  }

  /**
   * 非流式分析
   */
  async analyze(input: SubAgentInput): Promise<SubAgentOutput> {
    const startTime = Date.now();

    // 知识检索
    const knowledgeContext = await this.retrieveKnowledge(input);

    // 构建 prompt
    const builder = promptBuilderFactory.getBuilder('bazi')!;
    const promptData = builder.buildPrompt(
      input.chartText,
      input.subCategory,
      knowledgeContext.text,
      input.userMessage,
      [...input.history],
      {
        currentYear: input.currentYear,
        currentAge: input.currentAge,
      },
    );

    // 调用 AI
    const analysis = await InterpretationService.callAI(promptData);

    const executionTimeMs = Date.now() - startTime;

    const metadata: SubAgentMetadata = {
      chartSummary: input.chartText.slice(0, 200),
      knowledgeUsed: knowledgeContext.titles,
      executionTimeMs,
    };

    return {
      destinyType: this.destinyType,
      subCategory: input.subCategory,
      analysis,
      confidence: 0.82,
      metadata,
    };
  }

  /**
   * 流式分析
   */
  async *analyzeStream(input: SubAgentInput): AsyncGenerator<string> {
    const knowledgeContext = await this.retrieveKnowledge(input);

    const builder = promptBuilderFactory.getBuilder('bazi')!;
    const promptData = builder.buildPrompt(
      input.chartText,
      input.subCategory,
      knowledgeContext.text,
      input.userMessage,
      [...input.history],
      {
        currentYear: input.currentYear,
        currentAge: input.currentAge,
      },
    );

    yield* InterpretationService.stream(promptData);
  }

  /**
   * 知识检索（八字知识库）
   */
  private async retrieveKnowledge(input: SubAgentInput): Promise<{ text: string; titles: string[] }> {
    try {
      const entries = await KnowledgeService.retrieveByCategory(
        'bazi',
        input.subCategory,
        input.chartText,
        input.userMessage,
      );
      const ranked = KnowledgeService.rank(entries, input.userMessage);
      return {
        text: KnowledgeService.formatForAI(ranked),
        titles: ranked.slice(0, 5).map(e => e.title),
      };
    } catch {
      return { text: '', titles: [] };
    }
  }
}
