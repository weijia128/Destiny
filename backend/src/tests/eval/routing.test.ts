/**
 * 路由评测基线
 * 验证 buildDispatch() 路由函数的准确性，不需要真实 AI 调用
 * 防止后续 Agent 增加导致路由退步
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildDispatch } from '../../agents/supervisorAgent.js';
import { agentRegistry } from '../../agents/registry.js';
import { ZiweiAgent } from '../../agents/ziweiAgent.js';
import { BaziAgent } from '../../agents/baziAgent.js';
import { MeihuaAgent } from '../../agents/meihuaAgent.js';
import type { BirthInfo } from '../../types/index.js';

const birthInfo: BirthInfo = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  gender: 'male',
  isLunar: false,
};

describe('路由评测基线（10 条黄金用例）', () => {
  beforeEach(() => {
    (agentRegistry as any).agents.clear();
    agentRegistry.register(new ZiweiAgent());
    agentRegistry.register(new BaziAgent());
    agentRegistry.register(new MeihuaAgent());
  });

  it('用例1：通用问题默认路由到紫微', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '我今年事业发展如何',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('ziwei');
    expect(dispatch.targetAgents).toContain('ziwei');
  });

  it('用例2：八字关键词路由到 bazi', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '帮我分析八字格局',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('bazi');
    expect(dispatch.targetAgents).toContain('bazi');
  });

  it('用例3：梅花易数关键词路由到 meihua', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '用梅花易数算一下我的感情',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('meihua');
    expect(dispatch.targetAgents).toContain('meihua');
  });

  it('用例4：紫微专词路由到紫微', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '紫微命盘官禄宫主星怎么看',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('ziwei');
    expect(dispatch.targetAgents).toContain('ziwei');
  });

  it('用例5：四柱天干地支路由到 bazi', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '四柱天干地支日主如何',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('bazi');
    expect(dispatch.targetAgents).toContain('bazi');
  });

  it('用例6：梅花起卦路由到 meihua', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '梅花起卦问今年财运',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('meihua');
    expect(dispatch.targetAgents).toContain('meihua');
  });

  it('用例7：通用运势词默认 fallback 紫微', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '请给我分析一下今年运势',
      history: [],
    });
    // 未检测到特定关键词时，fallback 到 ziwei
    expect(dispatch.primaryAgent).toBe('ziwei');
  });

  it('用例8：比较八字和紫微 → 多 Agent 且 shouldFuse 为 true', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '比较八字和紫微的分析',
      history: [],
    });
    expect(dispatch.targetAgents).toContain('bazi');
    expect(dispatch.targetAgents).toContain('ziwei');
    expect(dispatch.shouldFuse).toBe(true);
  });

  it('用例9：用神喜用神路由到 bazi', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '用神和喜用神怎么看',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('bazi');
    expect(dispatch.targetAgents).toContain('bazi');
  });

  it('用例10：大限四化紫微专词路由到 ziwei', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '大限四化入命宫怎么解读',
      history: [],
    });
    expect(dispatch.primaryAgent).toBe('ziwei');
    expect(dispatch.targetAgents).toContain('ziwei');
  });

  it('preferredTypes 可强制路由', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '随便什么问题',
      history: [],
      preferredTypes: ['meihua'],
    });
    expect(dispatch.primaryAgent).toBe('meihua');
    expect(dispatch.targetAgents).toEqual(['meihua']);
    expect(dispatch.shouldFuse).toBe(false);
  });

  it('多 Agent 时 shouldFuse 为 true', () => {
    const dispatch = buildDispatch({
      birthInfo,
      userMessage: '随便',
      history: [],
      preferredTypes: ['ziwei', 'bazi'],
    });
    expect(dispatch.shouldFuse).toBe(true);
    expect(dispatch.targetAgents.length).toBe(2);
  });
});
