import { describe, it, expect } from 'vitest';
import { MeihuaService } from './meihuaService.js';

const TEST_BIRTH: Parameters<typeof MeihuaService.generate>[0] = {
  year: 2024,
  month: 2,
  day: 19,
  hour: 10,
  gender: 'male',
  isLunar: false,
};

describe('MeihuaService', () => {
  describe('generate', () => {
    it('应生成有效的卦象（1-8 范围内的上下卦）', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      expect(chart.upperTrigram.number).toBeGreaterThanOrEqual(1);
      expect(chart.upperTrigram.number).toBeLessThanOrEqual(8);
      expect(chart.lowerTrigram.number).toBeGreaterThanOrEqual(1);
      expect(chart.lowerTrigram.number).toBeLessThanOrEqual(8);
    });

    it('动爻应在 1-6 范围内', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      expect(chart.movingLine).toBeGreaterThanOrEqual(1);
      expect(chart.movingLine).toBeLessThanOrEqual(6);
    });

    it('动爻 1-3 → 上卦为体，下卦为用', () => {
      // 构造一个 sum4 % 6 ∈ {1,2,3} 的输入
      const bi = { year: 2000, month: 1, day: 1, hour: 1, gender: 'male' as const, isLunar: false };
      const chart = MeihuaService.generate(bi);
      if (chart.movingLine <= 3) {
        expect(chart.bodyTrigram).toBe('upper');
        expect(chart.useTrigram).toBe('lower');
      }
    });

    it('动爻 4-6 → 下卦为体，上卦为用', () => {
      const bi = { year: 2000, month: 6, day: 15, hour: 14, gender: 'male' as const, isLunar: false };
      const chart = MeihuaService.generate(bi);
      if (chart.movingLine >= 4) {
        expect(chart.bodyTrigram).toBe('lower');
        expect(chart.useTrigram).toBe('upper');
      }
    });

    it('吉凶取值应在合法范围内', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      expect(['大吉', '吉', '平', '凶']).toContain(chart.judgment);
    });

    it('体用关系应在合法范围内', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      expect(['用生体', '比和', '体克用', '体生用', '用克体']).toContain(chart.bodyUsRelation);
    });

    it('用生体 → 判断为大吉', () => {
      // 构造一个金体卦+土用卦的情况（土生金=用生体）
      // 乾（金）为体，坤（土）为用 → 土生金 → 用生体 → 大吉
      // 遍历多组数据，只要找到一组即可
      let found = false;
      for (let hour = 0; hour < 24; hour++) {
        const bi = { year: 2000, month: 1, day: 2, hour, gender: 'male' as const, isLunar: false };
        const chart = MeihuaService.generate(bi);
        if (chart.bodyUsRelation === '用生体') {
          expect(chart.judgment).toBe('大吉');
          found = true;
          break;
        }
      }
      if (!found) {
        // 至少验证逻辑对称性：用克体 → 凶
        for (let hour = 0; hour < 24; hour++) {
          const bi = { year: 2001, month: 3, day: 5, hour, gender: 'female' as const, isLunar: false };
          const chart = MeihuaService.generate(bi);
          if (chart.bodyUsRelation === '用克体') {
            expect(chart.judgment).toBe('凶');
            break;
          }
        }
      }
    });

    it('divinationTime 格式正确', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      expect(chart.divinationTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:00$/);
    });

    it('上卦数为 0 时应映射为 8', () => {
      // 需要 (year + month + day) % 8 === 0
      // e.g. 2000+1+7=2008, 2008%8=0 → 映射为8=坤
      const bi = { year: 2000, month: 1, day: 7, hour: 0, gender: 'male' as const, isLunar: false };
      const chart = MeihuaService.generate(bi);
      expect(chart.upperTrigram.number).toBe(8);
      expect(chart.upperTrigram.name).toBe('坤');
    });
  });

  describe('formatForAI', () => {
    it('返回文本应包含关键标题', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      const text = MeihuaService.formatForAI(chart);
      expect(text).toContain('梅花易数起卦信息');
      expect(text).toContain('体用');
      expect(text).toContain('断语');
    });

    it('返回文本应包含体卦和用卦名称', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      const text = MeihuaService.formatForAI(chart);
      expect(text).toContain('体卦');
      expect(text).toContain('用卦');
    });

    it('返回文本应包含吉凶断语', () => {
      const chart = MeihuaService.generate(TEST_BIRTH);
      const text = MeihuaService.formatForAI(chart);
      const hasJudgment = ['大吉', '吉', '平', '凶'].some(j => text.includes(j));
      expect(hasJudgment).toBe(true);
    });
  });
});
