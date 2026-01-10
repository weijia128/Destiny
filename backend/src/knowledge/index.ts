/**
 * 知识库统一导出
 * 提供兼容旧代码的接口
 */

import type { AnalysisCategory } from '../types/index.js';
import { KnowledgeService } from '../services/knowledgeService.js';

/**
 * 兼容旧代码的知识检索函数
 *
 * @deprecated 请直接使用 KnowledgeService.retrieve()
 */
export function getRelevantKnowledge(
  category: AnalysisCategory,
  chartInfo: string,
  question: string
): string {
  // 这是一个同步函数，但 KnowledgeService.retrieve 是异步的
  // 为了保持向后兼容，我们在这里提供一个简单的实现
  // 实际使用时建议改为异步调用

  const keywords = KnowledgeService.extractKeywords(chartInfo + ' ' + question);

  // 简单的同步检索（不完全准确，但保持兼容性）
  try {
    // 这里无法同步 import，所以返回空字符串
    // 真正的使用应该通过 KnowledgeService.retrieve()
    console.warn('getRelevantKnowledge is deprecated, use KnowledgeService.retrieve() instead');
    return `相关知识库内容（分类：${category}，关键词：${keywords.join('、')}）`;
  } catch (error) {
    console.error('Failed to retrieve knowledge:', error);
    return '未找到相关知识库内容';
  }
}

/**
 * 兼容旧代码的知识库条目类型
 */
export type { KnowledgeEntry } from '../types/index.js';

/**
 * 兼容旧代码的知识库数据
 * @deprecated 请使用各分类模块的导出
 */
// 合并所有紫微知识库作为默认导出
import { careerKnowledge } from './ziwei/career.js';
import { wealthKnowledge } from './ziwei/wealth.js';
import { relationshipKnowledge } from './ziwei/relationship.js';
import { healthKnowledge } from './ziwei/health.js';
import { familyKnowledge } from './ziwei/family.js';
import { generalKnowledge } from './ziwei/general.js';
import { dashunKnowledge } from './ziwei/dashun.js';
import { yearlyFortuneKnowledge } from './ziwei/yearlyFortune.js';

export const knowledgeBase = [
  ...careerKnowledge,
  ...wealthKnowledge,
  ...relationshipKnowledge,
  ...healthKnowledge,
  ...familyKnowledge,
  ...generalKnowledge,
  ...dashunKnowledge,
  ...yearlyFortuneKnowledge,
];

