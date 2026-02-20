import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZiweiAgent } from './ziweiAgent.js';
import { ChartService } from '../services/chartService.js';
import type { BirthInfo } from '../types/index.js';

const birthInfo: BirthInfo = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  gender: 'male',
  isLunar: false,
};

describe('ZiweiAgent chart cache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('相同出生信息应复用命盘缓存，避免重复排盘', async () => {
    const generateSpy = vi.spyOn(ChartService, 'generate').mockReturnValue({} as any);
    const formatSpy = vi.spyOn(ChartService, 'formatForAI').mockReturnValue('cached-chart-text');

    const agent = new ZiweiAgent();

    const first = await agent.generateChart(birthInfo);
    const second = await agent.generateChart({ ...birthInfo });

    expect(first).toBe('cached-chart-text');
    expect(second).toBe('cached-chart-text');
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(formatSpy).toHaveBeenCalledTimes(1);
  });
});
