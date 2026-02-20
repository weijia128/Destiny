import { describe, it, expect } from 'vitest';
import { RetrievalService } from '../../services/retrievalService.js';
import type { DestinyType, SubCategory } from '../../types/index.js';

interface RetrievalGoldenCase {
  readonly destinyType: DestinyType;
  readonly subCategory: SubCategory;
  readonly chartText: string;
  readonly userMessage: string;
  readonly expectedTitleKeywords: ReadonlyArray<string>;
}

const goldenCases: ReadonlyArray<RetrievalGoldenCase> = [
  {
    destinyType: 'ziwei',
    subCategory: 'career',
    chartText: '命宫与官禄宫同看，紫微坐守官禄宫',
    userMessage: '今年事业发展机会如何',
    expectedTitleKeywords: ['官禄宫', '事业'],
  },
  {
    destinyType: 'bazi',
    subCategory: 'yongshen',
    chartText: '日主偏弱，喜印比扶身',
    userMessage: '请结合用神和调候给建议',
    expectedTitleKeywords: ['用神', '调候'],
  },
  {
    destinyType: 'meihua',
    subCategory: 'general',
    chartText: '动爻在五爻，体卦用卦待判',
    userMessage: '体用生克怎么看吉凶',
    expectedTitleKeywords: ['梅花', '体用'],
  },
];

describe('检索精度基线（3 条黄金用例）', () => {
  goldenCases.forEach((testCase, index) => {
    it(`用例${index + 1}：${testCase.destinyType}/${testCase.subCategory}`, async () => {
      const result = await RetrievalService.retrieve({
        destinyType: testCase.destinyType,
        subCategory: testCase.subCategory,
        chartText: testCase.chartText,
        userMessage: testCase.userMessage,
      });

      const topTitle = result.titles[0] ?? '';

      expect(result.debug.selectedCount).toBeGreaterThan(0);
      expect(topTitle.length).toBeGreaterThan(0);
      expect(
        testCase.expectedTitleKeywords.some(keyword => topTitle.includes(keyword))
      ).toBe(true);
    });
  });
});
