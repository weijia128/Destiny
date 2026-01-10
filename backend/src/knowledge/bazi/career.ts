/**
 * 八字命理 - 事业运势知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 八字事业知识库数据（示例框架）
 */
export const careerKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-career-1',
    destinyType: 'bazi',
    subCategory: 'career',
    title: '八字事业运势基础',
    content: `八字事业运势分析框架：

【年柱与事业】
- 年柱代表早年事业基础
- 祖荫与早期机遇

【月柱与事业】
- 月柱代表中年事业发展
- 事业黄金期

【日柱与事业】
- 日柱代表个人事业成就
- 核心能力体现

【时柱与事业】
- 时柱代表晚年事业
- 事业传承与收获`,
    pillars: ['年柱', '月柱', '日柱', '时柱'],
    keywords: ['事业', '八字', '四柱', '发展'],
  },
];

/**
 * 事业专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return careerKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return careerKnowledge.filter(entry =>
    keywords.some(kw =>
      entry.title.includes(kw) ||
      entry.keywords.some(k => k.includes(kw))
    )
  );
}

/**
 * 关键词提取
 */
function extractKeywords(text: string): string[] {
  const patterns = [
    '事业', '工作', '职业', '发展',
    '年柱', '月柱', '日柱', '时柱',
    '十神', '正官', '七杀', '正财',
  ];

  return patterns.filter(p => text.includes(p));
}

/**
 * 关键词匹配
 */
function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;

  return keywords.some(kw =>
    entry.keywords.includes(kw) ||
    entry.pillars?.includes(kw) ||
    entry.content.includes(kw)
  );
}

// 导出数据供外部使用
export const entries = careerKnowledge;
