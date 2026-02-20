/**
 * 紫微斗数 Sub-Agent
 * 封装现有 iztro 排盘 + 知识检索 + prompt 构建逻辑
 */

import { randomUUID } from 'crypto';
import type { SubAgent, SubAgentInput, SubAgentOutput, SubAgentMetadata } from './types.js';
import type { BirthInfo, DestinyType, SubCategory } from '../types/index.js';
import type { RetrievalResult } from '../types/retrieval.js';
import { ChartService } from '../services/chartService.js';
import { InterpretationService } from '../services/interpretationService.js';
import { RetrievalService } from '../services/retrievalService.js';
import { promptBuilderFactory } from '../prompts/index.js';

const ZIWEI_CATEGORIES: ReadonlyArray<SubCategory> = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'ziweigeju', 'sixi', 'dashun',
];

export class ZiweiAgent implements SubAgent {
  private static readonly chartCache = new Map<string, string>();
  private static readonly MAX_CHART_CACHE_SIZE = 500;

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
    const cacheKey = this.buildChartCacheKey(birthInfo);
    const cached = ZiweiAgent.chartCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const chart = ChartService.generate(birthInfo);
    const formatted = ChartService.formatForAI(chart);
    this.setChartCache(cacheKey, formatted);
    return formatted;
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
      confidence: 0.85,
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
    } finally {
      process.stdout.write(JSON.stringify({ traceId, agent: this.name, event: 'stream_done', subCategory: input.subCategory, latencyMs: Date.now() - startTime }) + '\n');
    }
  }

  /**
   * 知识检索
   */
  private async retrieveKnowledge(input: SubAgentInput): Promise<RetrievalResult> {
    return RetrievalService.retrieve({
      destinyType: 'ziwei',
      subCategory: input.subCategory,
      chartText: input.chartText,
      userMessage: input.userMessage,
      traceId: input.traceId,
    });
  }

  private buildChartCacheKey(birthInfo: BirthInfo): string {
    return [
      birthInfo.year,
      birthInfo.month,
      birthInfo.day,
      birthInfo.hour,
      birthInfo.gender,
      birthInfo.isLunar ? 'lunar' : 'solar',
      birthInfo.leapMonth ? 'leap' : 'normal',
    ].join('|');
  }

  private setChartCache(cacheKey: string, value: string): void {
    ZiweiAgent.chartCache.set(cacheKey, value);

    if (ZiweiAgent.chartCache.size <= ZiweiAgent.MAX_CHART_CACHE_SIZE) {
      return;
    }

    const oldestKey = ZiweiAgent.chartCache.keys().next().value;
    if (oldestKey) {
      ZiweiAgent.chartCache.delete(oldestKey);
    }
  }
}
