import { describe, it, expect } from 'vitest';
import { RetrievalService } from './retrievalService.js';

describe('RetrievalService', () => {
  it('应使用 meihua/general 的子分类策略', async () => {
    const result = await RetrievalService.retrieve({
      destinyType: 'meihua',
      subCategory: 'general',
      chartText: '本卦：乾上坤下，动爻在三爻',
      userMessage: '体用生克如何判断',
    });

    expect(result.debug.policyId).toBe('meihua-general-focus');
    expect(result.debug.queryMode).toBe('message_only');
    expect(result.debug.rankingQuery).toBe('体用生克如何判断');
    expect(result.debug.selectedCount).toBeLessThanOrEqual(4);
    expect(result.titles.length).toBe(result.debug.selectedCount);
  });

  it('应同时召回共享知识和专属知识', async () => {
    const result = await RetrievalService.retrieve({
      destinyType: 'bazi',
      subCategory: 'career',
      chartText: '日主偏旺，官杀透干',
      userMessage: '我适合创业还是职场管理',
    });

    expect(result.debug.sharedCount).toBeGreaterThan(0);
    expect(result.debug.specificCount).toBeGreaterThan(0);
    expect(result.debug.candidateCount).toBeGreaterThanOrEqual(result.debug.specificCount);
    expect(result.debug.selectedCount).toBeGreaterThan(0);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('分类文件缺失时应回退到大类 general 知识', async () => {
    const result = await RetrievalService.retrieve({
      destinyType: 'bazi',
      subCategory: 'dayun',
      chartText: '当前行运冲命局',
      userMessage: '请分析未来十年大运节奏',
    });

    expect(result.debug.specificCount).toBeGreaterThan(0);
    expect(result.debug.selectedCount).toBeGreaterThan(0);
    expect(result.titles.length).toBeGreaterThan(0);
  });
});
