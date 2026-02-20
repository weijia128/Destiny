import { Tool } from './types.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { RetrievalService } from '../services/retrievalService.js';
import type { DestinyType, SubCategory } from '../types/index.js';

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
- destinyType/subCategory/query: 新版检索参数（推荐）
- category/keywords: 旧版兼容参数
- chartText: 命盘文本（可选，用于相关性排序）`,

  parameters: [
    {
      name: 'destinyType',
      type: 'string',
      description: '命理大类（ziwei/bazi/meihua）',
      required: false,
    },
    {
      name: 'subCategory',
      type: 'string',
      description: '子分类（career/wealth/...）',
      required: false,
    },
    {
      name: 'query',
      type: 'string',
      description: '检索查询语句（推荐）',
      required: false,
    },
    {
      name: 'category',
      type: 'string',
      description: '分析类别（旧版兼容）',
      required: false,
    },
    {
      name: 'keywords',
      type: 'array',
      description: '搜索关键词数组（旧版兼容）',
      required: false,
    },
    {
      name: 'chartText',
      type: 'string',
      description: '命盘文本（可选，用于提升相关性排序）',
      required: false,
    },
    {
      name: 'maxItems',
      type: 'number',
      description: '返回条目上限（默认 5）',
      required: false,
    },
  ],

  category: 'knowledge',

  handler: async (params) => {
    const startTime = Date.now();

    try {
      const {
        destinyType,
        subCategory,
        query,
        category,
        keywords,
        chartText,
        maxItems = 5,
      } = params as {
        destinyType?: DestinyType;
        subCategory?: SubCategory;
        query?: string;
        category?: string;
        keywords?: string[];
        chartText?: string;
        maxItems?: number;
      };

      // 新版：按术数 + 子分类统一检索
      if (destinyType && subCategory) {
        const retrieval = await RetrievalService.retrieve({
          destinyType,
          subCategory,
          chartText: chartText || '',
          userMessage: query || keywords?.join(' ') || '',
        });

        const limit = Number.isInteger(maxItems) ? Math.max(1, Math.min(10, maxItems)) : 5;
        const slicedItems = retrieval.items.slice(0, limit);
        const slicedEntries = slicedItems.map(item => item.entry);

        return {
          success: true,
          data: {
            entries: slicedEntries,
            formatted: KnowledgeService.formatForAI(slicedEntries),
            count: slicedEntries.length,
            retrieval: retrieval.debug,
          },
          toolName: 'knowledge_search',
          executionTime: Date.now() - startTime,
        };
      }

      // 旧版兼容：category + keywords
      const normalizedCategory = (category || 'general') as SubCategory;
      const normalizedKeywords = Array.isArray(keywords) ? keywords : [];
      const fallbackQuery = query || normalizedKeywords.join(' ');

      const fallbackRetrieval = await RetrievalService.retrieve({
        destinyType: 'ziwei',
        subCategory: normalizedCategory,
        chartText: chartText || '',
        userMessage: fallbackQuery,
      });

      const limit = Number.isInteger(maxItems) ? Math.max(1, Math.min(10, maxItems)) : 5;
      const fallbackEntries = fallbackRetrieval.items
        .slice(0, limit)
        .map(item => item.entry);

      return {
        success: true,
        data: {
          entries: fallbackEntries,
          formatted: KnowledgeService.formatForAI(fallbackEntries),
          count: fallbackEntries.length,
          retrieval: fallbackRetrieval.debug,
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
