import { describe, it, expect } from 'vitest';
import { KnowledgeService } from './knowledgeService.js';
import type { KnowledgeEntry } from '../types/index.js';

describe('KnowledgeService', () => {
  describe('extractKeywords', () => {
    it('应该提取主星关键词', () => {
      const text = '命宫有紫微星坐守，太阳星在官禄宫';
      const keywords = KnowledgeService.extractKeywords(text);

      expect(keywords).toContain('紫微');
      expect(keywords).toContain('太阳');
      expect(keywords).toContain('命宫');
      expect(keywords).toContain('官禄宫');
    });

    it('应该提取四化关键词', () => {
      const text = '今年武曲化禄，天机化权，太阳化科，文昌化忌';
      const keywords = KnowledgeService.extractKeywords(text);

      expect(keywords).toContain('武曲');
      expect(keywords).toContain('化禄');
      expect(keywords).toContain('化权');
      expect(keywords).toContain('化科');
      expect(keywords).toContain('化忌');
    });

    it('应该提取领域关键词', () => {
      const text = '想问问我的事业和财运如何，感情方面有桃花吗？';
      const keywords = KnowledgeService.extractKeywords(text);

      expect(keywords).toContain('事业');
      expect(keywords).toContain('财运');
      expect(keywords).toContain('感情');
      expect(keywords).toContain('桃花');
    });

    it('不匹配时应返回空数组', () => {
      const text = '这段文本不包含任何关键词';
      const keywords = KnowledgeService.extractKeywords(text);

      expect(keywords.length).toBe(0);
    });
  });

  describe('calculateRelevance (通过 rank 测试)', () => {
    const mockEntries: KnowledgeEntry[] = [
      {
        id: '1',
        destinyType: 'ziwei',
        subCategory: 'career',
        title: '紫微星事业分析',
        content: '紫微星在官禄宫...',
        keywords: ['事业', '工作', '紫微'],
        stars: ['紫微'],
        palaces: ['官禄宫'],
      },
      {
        id: '2',
        destinyType: 'ziwei',
        subCategory: 'career',
        title: '武曲星财运分析',
        content: '武曲星主财...',
        keywords: ['财运', '投资', '武曲'],
        stars: ['武曲'],
        palaces: ['财帛宫'],
      },
      {
        id: '3',
        destinyType: 'ziwei',
        subCategory: 'career',
        title: '事业运势总论',
        content: '事业运势看官禄宫...',
        keywords: ['事业', '运势', '官禄'],
        palaces: ['官禄宫'],
      },
    ];

    it('应该根据标题匹配度排序', () => {
      const query = '紫微星事业';
      const ranked = KnowledgeService.rank(mockEntries, query);

      expect(ranked[0].id).toBe('1'); // 标题包含"紫微星事业"
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('应该根据关键词匹配度排序', () => {
      const query = '我想问事业工作';
      const ranked = KnowledgeService.rank(mockEntries, query);

      // ID 1 和 3 都有"事业"关键词
      expect(['1', '3']).toContain(ranked[0].id);
    });

    it('应该根据星曜匹配度排序', () => {
      const query = '命宫有紫微';
      const ranked = KnowledgeService.rank(mockEntries, query);

      expect(ranked[0].id).toBe('1'); // 包含紫微星
    });

    it('应该限制返回数量为 5 条', () => {
      const manyEntries: KnowledgeEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        destinyType: 'ziwei',
        subCategory: 'career',
        title: `条目 ${i}`,
        content: `内容 ${i}`,
        keywords: ['测试'],
      }));

      const ranked = KnowledgeService.rank(manyEntries, '测试');
      expect(ranked.length).toBeLessThanOrEqual(5);
    });

    it('应该支持自定义返回数量', () => {
      const manyEntries: KnowledgeEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        destinyType: 'ziwei',
        subCategory: 'career',
        title: `条目 ${i}`,
        content: `内容 ${i}`,
        keywords: ['测试'],
      }));

      const ranked = KnowledgeService.rank(manyEntries, '测试', 3);
      expect(ranked.length).toBe(3);
    });

    it('空数组应返回空结果', () => {
      const ranked = KnowledgeService.rank([], '测试');
      expect(ranked.length).toBe(0);
    });
  });

  describe('formatForAI', () => {
    it('应该格式化知识条目为 AI 可读文本', () => {
      const entries: KnowledgeEntry[] = [
        {
          id: '1',
          destinyType: 'ziwei',
          subCategory: 'career',
          title: '紫微星事业',
          content: '紫微星在官禄宫，事业运势佳',
          keywords: ['事业'],
        },
        {
          id: '2',
          destinyType: 'ziwei',
          subCategory: 'wealth',
          title: '武曲星财运',
          content: '武曲星主财，财运通达',
          keywords: ['财运'],
        },
      ];

      const formatted = KnowledgeService.formatForAI(entries);

      expect(formatted).toContain('【紫微星事业】');
      expect(formatted).toContain('紫微星在官禄宫，事业运势佳');
      expect(formatted).toContain('【武曲星财运】');
      expect(formatted).toContain('武曲星主财，财运通达');
      expect(formatted).toContain('---');
    });

    it('空数组应返回未找到消息', () => {
      const formatted = KnowledgeService.formatForAI([]);
      expect(formatted).toBe('未找到相关知识库内容');
    });
  });

  describe('getAvailableCategories', () => {
    it('应该返回所有可用类别', () => {
      const categories = KnowledgeService.getAvailableCategories();

      expect(categories).toContain('career');
      expect(categories).toContain('wealth');
      expect(categories).toContain('relationship');
      expect(categories).toContain('health');
      expect(categories).toContain('family');
      expect(categories).toContain('general');
      expect(categories.length).toBe(6);
    });
  });

  describe('getAvailableSubCategories', () => {
    it('应该返回紫微斗数的所有子类别', () => {
      const categories = KnowledgeService.getAvailableSubCategories('ziwei');

      // 通用类别
      expect(categories).toContain('career');
      expect(categories).toContain('wealth');

      // 紫微专属
      expect(categories).toContain('ziweigeju');
      expect(categories).toContain('sixi');
      expect(categories).toContain('dashun');

      expect(categories.length).toBe(9);
    });

    it('应该返回八字的所有子类别', () => {
      const categories = KnowledgeService.getAvailableSubCategories('bazi');

      // 通用类别
      expect(categories).toContain('career');

      // 八字专属
      expect(categories).toContain('geju');
      expect(categories).toContain('yongshen');
      expect(categories).toContain('shishen');
      expect(categories).toContain('dayun');

      expect(categories.length).toBe(10);
    });

    it('应该返回奇门遁甲的所有子类别', () => {
      const categories = KnowledgeService.getAvailableSubCategories('qimen');

      expect(categories).toContain('jushi');
      expect(categories).toContain('men');
      expect(categories).toContain('xing');
      expect(categories).toContain('shen');
    });

    it('应该返回六爻的所有子类别', () => {
      const categories = KnowledgeService.getAvailableSubCategories('liuyao');

      expect(categories).toContain('gua');
      expect(categories).toContain('liuyaoyin');
      expect(categories).toContain('shiyin');
    });

    it('应该返回手相的所有子类别', () => {
      const categories = KnowledgeService.getAvailableSubCategories('shouxiang');

      expect(categories).toContain('xian');
      expect(categories).toContain('qiu');
      expect(categories).toContain('zhi');
      expect(categories).toContain('wen');
    });
  });
});
