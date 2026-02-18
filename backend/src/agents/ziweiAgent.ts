/**
 * 紫微斗数 Sub-Agent
 * 封装现有 iztro 排盘 + 知识检索 + prompt 构建逻辑
 */

import type { SubAgent, SubAgentInput, SubAgentOutput, SubAgentMetadata } from './types.js';
import type { BirthInfo, DestinyType, SubCategory } from '../types/index.js';
import { ChartService } from '../services/chartService.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { InterpretationService } from '../services/interpretationService.js';
import { promptBuilderFactory } from '../prompts/index.js';

const ZIWEI_CATEGORIES: ReadonlyArray<SubCategory> = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'ziweigeju', 'sixi', 'dashun',
];

export class ZiweiAgent implements SubAgent {
  readonly name = '紫微斗数分析师';
  readonly destinyType: DestinyType = 'ziwei';
  readonly description = '基于紫微斗数命盘进行深度命理分析，包含格局、四化、大运等';

  getSupportedCategories(): ReadonlyArray<SubCategory> {
    return ZIWEI_CATEGORIES;
  }

  canHandle(input: SubAgentInput): boolean {
    return ZIWEI_CATEGORIES.includes(input.subCategory);
  }

  /**
   * 根据出生信息生成紫微命盘文本
   */
  async generateChart(birthInfo: BirthInfo): Promise<string> {
    const chart = ChartService.generate(birthInfo);
    return ChartService.formatForAI(chart);
  }

  /**
   * 非流式分析
   */
  async analyze(input: SubAgentInput): Promise<SubAgentOutput> {
    const startTime = Date.now();

    // 知识检索
    const knowledgeContext = await this.retrieveKnowledge(input);

    // 构建 prompt
    const builder = promptBuilderFactory.getBuilder('ziwei')!;
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
      confidence: 0.85,
      metadata,
    };
  }

  /**
   * 流式分析
   */
  async *analyzeStream(input: SubAgentInput): AsyncGenerator<string> {
    const knowledgeContext = await this.retrieveKnowledge(input);

    const builder = promptBuilderFactory.getBuilder('ziwei')!;
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
   * 知识检索
   */
  private async retrieveKnowledge(input: SubAgentInput): Promise<{ text: string; titles: string[] }> {
    try {
      const entries = await KnowledgeService.retrieveByCategory(
        'ziwei',
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
