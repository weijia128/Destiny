/**
 * 紫微斗数知识库 - 统一导出
 */

// 导出所有紫微斗数知识库模块
export { careerKnowledge, retrieve as retrieveCareer } from './career.js';
export { wealthKnowledge, retrieve as retrieveWealth } from './wealth.js';
export { relationshipKnowledge, retrieve as retrieveRelationship } from './relationship.js';
export { healthKnowledge, retrieve as retrieveHealth } from './health.js';
export { familyKnowledge, retrieve as retrieveFamily } from './family.js';
export { generalKnowledge, retrieve as retrieveGeneral } from './general.js';
export { dashunKnowledge } from './dashun.js';
export { yearlyFortuneKnowledge } from './yearlyFortune.js';

// 导出可用的子分类列表
export const ZIWEI_SUBCATEGORIES = [
  'career',
  'wealth',
  'relationship',
  'health',
  'family',
  'general',
  'ziweigeju',  // 专属：紫微格局
  'sixi',       // 专属：四化飞星
  'dashun',     // 专属：大运分析
] as const;
