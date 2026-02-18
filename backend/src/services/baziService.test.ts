import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Solar } from 'lunar-javascript';
import { BaziService, type BaziPillar, type WuxingCount } from './baziService.js';
import type { BirthInfo } from '../types/index.js';

const birthInfo: BirthInfo = {
  year: 1990,
  month: 1,
  day: 15,
  hour: 10,
  gender: 'male',
  isLunar: false,
};

function mockPillar(gan: string, zhi: string, hiddenGan: string[]): BaziPillar {
  return {
    gan,
    zhi,
    ganWuxing: '',
    zhiWuxing: '',
    nayin: '',
    hiddenGan,
    tenGod: '',
  };
}

describe('BaziService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('A1: 大运应直接映射 lunar-javascript 的 DaYun', () => {
    const chart = BaziService.generate(birthInfo);
    const expected = Solar
      .fromYmdHms(
        birthInfo.year,
        birthInfo.month,
        birthInfo.day,
        birthInfo.hour,
        0,
        0
      )
      .getLunar()
      .getEightChar()
      .getYun(1)
      .getDaYun()
      .map((dy: any) => {
        const ganZhi = String(dy?.getGanZhi?.() || '');
        if (!ganZhi || ganZhi.length < 2) return null;
        return {
          startAge: Number(dy.getStartAge()),
          endAge: Number(dy.getEndAge()),
          gan: ganZhi[0],
          zhi: ganZhi[1],
        };
      })
      .filter((item): item is { startAge: number; endAge: number; gan: string; zhi: string } => item !== null);

    expect(chart.dayunList.length).toBe(expected.length);
    expect(chart.dayunList[0].startAge).toBe(expected[0].startAge);
    expect(chart.dayunList[0].endAge).toBe(expected[0].endAge);
    expect(chart.dayunList[0].gan).toBe(expected[0].gan);
    expect(chart.dayunList[0].zhi).toBe(expected[0].zhi);
  });

  it('A2: 五行统计应计入地支藏干，且喜用神输出结构化结果', () => {
    const chart = BaziService.generate(birthInfo);
    const hiddenCount = [
      chart.yearPillar.hiddenGan.length,
      chart.monthPillar.hiddenGan.length,
      chart.dayPillar.hiddenGan.length,
      chart.hourPillar.hiddenGan.length,
    ].reduce((sum, count) => sum + count, 0);

    const total = Object.values(chart.wuxingCount).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(8 + hiddenCount * 0.5, 5);
    expect(chart.yongshen.yongshenWuxing.length).toBeGreaterThan(0);
    expect(typeof chart.yongshen.description).toBe('string');
  });

  it('A2: 冬月应给出火调候', () => {
    const pillars = [
      mockPillar('庚', '酉', ['辛']),
      mockPillar('辛', '酉', ['辛']),
      mockPillar('甲', '辰', ['戊', '乙', '癸']),
      mockPillar('丁', '午', ['丁', '己']),
    ];
    const wuxing = { 木: 1, 火: 2, 土: 2, 金: 3, 水: 2 } as WuxingCount;

    const result = (BaziService as any).inferYongshen('甲', '木', '子', wuxing, pillars);
    expect(result.seasonAdjust).toContain('火');
    expect(result.yongshenWuxing).toContain('火');
  });

  it('A3: 格局应按月令藏干透出并支持从格提示', () => {
    const pillars = [
      mockPillar('庚', '酉', ['辛']),
      mockPillar('辛', '酉', ['辛']),
      mockPillar('甲', '申', ['庚', '壬', '戊']),
      mockPillar('己', '午', ['丁', '己']),
    ];
    const wuxing = { 木: 0.5, 火: 3, 土: 3, 金: 3, 水: 0 } as WuxingCount;

    const geju = (BaziService as any).inferGeju('甲', '木', pillars[1], wuxing, pillars);
    expect(geju).toContain('月令');
    expect(geju).toContain('疑似从格');
  });

  it('A4: 摘要应包含流年信息与四柱关系', () => {
    const chart = BaziService.generate(birthInfo);

    expect(chart.summary).toContain('【当前年份信息】');
    expect(chart.summary).toContain('当前年份：2026年（丙午年）');
    expect(chart.summary).toContain('命主当前年龄：36岁');
    expect(chart.summary).toContain('【四柱关系】');
    expect(chart.summary).toContain('主要合：');
    expect(chart.summary).toContain('主要冲：');
    expect(chart.summary).toContain('主要刑：');
  });
});
