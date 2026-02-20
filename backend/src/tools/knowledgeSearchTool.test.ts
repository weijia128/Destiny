import { describe, it, expect } from 'vitest';
import { knowledgeSearchTool } from './knowledgeSearchTool.js';

describe('knowledgeSearchTool', () => {
  it('应支持新版 destinyType/subCategory/query 参数', async () => {
    const result = await knowledgeSearchTool.handler({
      destinyType: 'ziwei',
      subCategory: 'career',
      query: '官禄宫主星如何影响事业',
      chartText: '命宫紫微，官禄宫武曲',
    });

    expect(result.success).toBe(true);
    const data = result.data as { count: number; retrieval?: unknown };
    expect(data.count).toBeGreaterThan(0);
    expect(data.retrieval).toBeTruthy();
  });

  it('应兼容旧版 category/keywords 参数', async () => {
    const result = await knowledgeSearchTool.handler({
      category: 'wealth',
      keywords: ['财运', '武曲'],
      chartText: '财帛宫见武曲',
    });

    expect(result.success).toBe(true);
    const data = result.data as { count: number; formatted: string };
    expect(data.count).toBeGreaterThan(0);
    expect(data.formatted.length).toBeGreaterThan(0);
  });
});
