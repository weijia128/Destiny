import { describe, it, expect, beforeEach } from 'vitest';
import { promptBuilderFactory } from './index.js';
import type { SubCategory } from '../types/index.js';

describe('PromptBuilderFactory', () => {
  describe('getBuilderByCategory', () => {
    it('应该为紫微斗数专属类别返回紫微构建器', () => {
      const categories: SubCategory[] = ['ziweigeju', 'sixi', 'dashun'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('ziwei');
      });
    });

    it('应该为八字专属类别返回八字构建器', () => {
      const categories: SubCategory[] = ['geju', 'yongshen', 'shishen', 'dayun'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('bazi');
      });
    });

    it('应该为奇门遁甲专属类别返回奇门构建器', () => {
      const categories: SubCategory[] = ['jushi', 'men', 'xing', 'shen'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('qimen');
      });
    });

    it('应该为六爻专属类别返回六爻构建器', () => {
      const categories: SubCategory[] = ['gua', 'liuyaoyin', 'shiyin'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('liuyao');
      });
    });

    it('应该为手相专属类别返回手相构建器', () => {
      const categories: SubCategory[] = ['xian', 'qiu', 'zhi', 'wen'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('palmistry');
      });
    });

    it('应该为通用类别返回紫微构建器（默认）', () => {
      const categories: SubCategory[] = ['career', 'wealth', 'relationship', 'health', 'family', 'general'];

      categories.forEach(category => {
        const builder = promptBuilderFactory.getBuilderByCategory(category);
        expect(builder.getType()).toBe('ziwei');
      });
    });
  });

  describe('getRegisteredTypes', () => {
    it('应该返回所有已注册的构建器类型', () => {
      const types = promptBuilderFactory.getRegisteredTypes();

      expect(types).toContain('ziwei');
      expect(types).toContain('bazi');
      expect(types).toContain('qimen');
      expect(types).toContain('liuyao');
      expect(types).toContain('palmistry');
      expect(types.length).toBe(5);
    });
  });

  describe('buildPrompt', () => {
    it('应该成功构建紫微斗数的 prompt', () => {
      const builder = promptBuilderFactory.getBuilderByCategory('career');
      const result = builder.buildPrompt(
        '命盘文本',
        'career',
        '知识库内容',
        '我的事业运势如何？',
        []
      );

      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('categoryName');
      expect(result.system).toContain('天机大师');
      expect(result.categoryName).toBeTruthy();
    });

    it('应该包含历史对话', () => {
      const builder = promptBuilderFactory.getBuilderByCategory('career');
      const history = [
        { role: 'user' as const, content: '你好' },
        { role: 'assistant' as const, content: '您好' },
      ];

      const result = builder.buildPrompt(
        '命盘文本',
        'career',
        '知识库内容',
        '我的财运如何？',
        history
      );

      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('getCategoryName', () => {
    it('应该返回正确的类别名称', () => {
      const builder = promptBuilderFactory.getBuilderByCategory('career');

      expect(builder.getCategoryName('career')).toBe('事业运势');
      expect(builder.getCategoryName('wealth')).toBe('财运分析');
      expect(builder.getCategoryName('relationship')).toBe('感情姻缘'); // 修正为正确的名称
    });
  });

  describe('getSupportedCategories', () => {
    it('紫微构建器应该支持通用类别和紫微专属类别', () => {
      const builder = promptBuilderFactory.getBuilderByCategory('career');
      const categories = builder.getSupportedCategories();

      expect(categories).toContain('career');
      expect(categories).toContain('ziweigeju');
      expect(categories).toContain('sixi');
      expect(categories).toContain('dashun');
    });
  });
});
