import { Tool } from './types.js';
import { KnowledgeService } from '../services/knowledgeService.js';

/**
 * 知识库搜索工具
 * 允许 AI 动态搜索命理知识库
 */
export const knowledgeSearchTool: Tool = {
  name: 'knowledge_search',
  description: `搜索命理知识库，获取相关的命理知识条目。

使用场景：
- 当用户询问特定的星曜、宫位、格局的含义时
- 当需要查找命理专业术语的解释时
- 当需要补充专业知识以支持分析时

参数说明：
- category: 分析类别（career/wealth/relationship/health/family/general）
- keywords: 搜索关键词数组
- chartText: 命盘文本（可选，用于相关性排序）`,

  parameters: [
    {
      name: 'category',
      type: 'string',
      description: '分析类别',
      required: true,
    },
    {
      name: 'keywords',
      type: 'array',
      description: '搜索关键词数组，如 ["紫微", "事业", "命宫"]',
      required: true,
    },
    {
      name: 'chartText',
      type: 'string',
      description: '命盘文本（可选，用于提升相关性排序）',
      required: false,
    },
  ],

  category: 'knowledge',

  handler: async (params) => {
    const startTime = Date.now();

    try {
      const { category, keywords, chartText } = params as {
        category: string;
        keywords: string[];
        chartText?: string;
      };

      // 调用知识服务
      const entries = await KnowledgeService.search(
        category as any,
        keywords
      );

      // 如果提供了 chartText，进行相关性排序
      const rankedEntries = chartText
        ? KnowledgeService.rank(entries, chartText)
        : entries;

      // 格式化结果
      const formattedResult = KnowledgeService.formatForAI(rankedEntries);

      return {
        success: true,
        data: {
          entries: rankedEntries,
          formatted: formattedResult,
          count: rankedEntries.length,
        },
        toolName: 'knowledge_search',
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: 'knowledge_search',
        executionTime: Date.now() - startTime,
      };
    }
  },
};
