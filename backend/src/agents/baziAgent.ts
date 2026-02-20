/**
 * 八字命理 Sub-Agent
 * 封装 BaziService 计算 + 知识检索 + BaziPromptBuilder
 */

import { randomUUID } from 'crypto';
import type { SubAgent, SubAgentInput, SubAgentOutput, SubAgentMetadata } from './types.js';
import type { BirthInfo, DestinyType, SubCategory } from '../types/index.js';
import type { RetrievalResult } from '../types/retrieval.js';
import { BaziService } from '../services/baziService.js';
import { InterpretationService } from '../services/interpretationService.js';
import { RetrievalService } from '../services/retrievalService.js';
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
    const traceId = input.traceId ?? randomUUID();
    process.stdout.write(JSON.stringify({ traceId, agent: this.name, event: 'analyze_start', subCategory: input.subCategory }) + '\n');

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

    // 调用 AI（支持 function-calling 循环）
    const aiResult = await InterpretationService.callAIWithFunctionLoop(promptData, {
      config: input.functionCalling,
      toolContext: {
        traceId,
        destinyType: this.destinyType,
        subCategory: input.subCategory,
        chartText: input.chartText,
        userMessage: input.userMessage,
      },
    });
    const analysis = aiResult.answer;

    const executionTimeMs = Date.now() - startTime;

    const metadata: SubAgentMetadata = {
      chartSummary: input.chartText.slice(0, 200),
      knowledgeUsed: knowledgeContext.titles,
      executionTimeMs,
      retrieval: knowledgeContext.debug,
      functionCalling: aiResult.trace,
    };

    process.stdout.write(JSON.stringify({ traceId, agent: this.name, event: 'analyze_done', subCategory: input.subCategory, latencyMs: executionTimeMs }) + '\n');

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
    const traceId = input.traceId ?? randomUUID();
    const startTime = Date.now();
    process.stdout.write(JSON.stringify({ traceId, agent: this.name, event: 'stream_start', subCategory: input.subCategory }) + '\n');

    try {
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
    } finally {
      process.stdout.write(JSON.stringify({ traceId, agent: this.name, event: 'stream_done', subCategory: input.subCategory, latencyMs: Date.now() - startTime }) + '\n');
    }
  }

  /**
   * 知识检索（八字知识库）
   */
  private async retrieveKnowledge(input: SubAgentInput): Promise<RetrievalResult> {
    return RetrievalService.retrieve({
      destinyType: 'bazi',
      subCategory: input.subCategory,
      chartText: input.chartText,
      userMessage: input.userMessage,
      traceId: input.traceId,
    });
  }
}
