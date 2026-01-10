/**
 * 感情姻缘知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 感情知识库数据
 */
export const relationshipKnowledge: KnowledgeEntry[] = [
  {
    id: 'relationship-1',
    destinyType: 'ziwei',
    subCategory: 'relationship',
    title: '夫妻宫主星分析',
    content: `夫妻宫主管婚姻感情，是分析感情运的核心宫位。

【天府星在夫妻宫】
- 感情稳定，婚姻和谐
- 配偶性格温和，善于持家
- 婚后生活富足
- 适合晚婚

【天相星在夫妻宫】
- 配偶有才华，相貌端正
- 感情发展顺利
- 婚姻中有贵人相助
- 夫妻互相扶持

【贪狼星在夫妻宫】
- 桃花运旺，异性缘佳
- 感情经历丰富
- 需要注意感情忠诚
- 适合晚婚或相差年龄婚配

【太阴星在夫妻宫】
- 配偶温柔体贴，重视家庭
- 感情细腻，注重精神交流
- 女命婚姻美满
- 男命得贤内助`,
    stars: ['天府', '天相', '贪狼', '太阴'],
    palaces: ['夫妻宫'],
    keywords: ['感情', '婚姻', '配偶', '桃花'],
  },
  {
    id: 'relationship-2',
    destinyType: 'ziwei',
    subCategory: 'relationship',
    title: '桃花星分析',
    content: `紫微斗数中的桃花星影响异性缘和感情运：

【主桃花星】
- 红鸾：主结婚运
- 天喜：主喜庆、怀孕
- 廉贞：主感情纠葛
- 贪狼：主桃花旺盛

【次桃花星】
- 天姚：主异性缘
- 咸池：主桃花外遇
- 沐浴：主桃花欲望

【桃花星吉凶】
- 桃花星逢吉星：良缘美眷
- 桃花星逢煞星：感情波折
- 桃花星化忌：感情困扰

【提升感情运建议】
- 培养良好气质
- 扩大社交圈
- 把握好时机`,
    stars: ['红鸾', '天喜', '廉贞', '贪狼', '天姚', '咸池'],
    palaces: ['夫妻宫', '命宫', '迁移宫'],
    keywords: ['桃花', '异性缘', '恋爱'],
  },
  {
    id: 'relationship-3',
    destinyType: 'ziwei',
    subCategory: 'relationship',
    title: '婚姻配对',
    content: `紫微斗数看婚姻配对：

【命宫主星配对】
- 紫微配天府：天生一对
- 天机配天梁：智慧互补
- 太阳配太阴：阴阳调和
- 武曲配贪狼：财色双收

【五行局配对】
- 水二局配金四局：金生水
- 木三局配水二局：水生木
- 火六局配木三局：木生火
- 土五局配火六局：火生土
- 金四局配土五局：土生金

【生肖配对】
- 三合：最吉
- 六合：次吉
- 相冲：不宜
- 相害：需谨慎`,
    stars: [],
    palaces: ['命宫', '夫妻宫'],
    keywords: ['配对', '婚姻', '八字', '合婚'],
  },
  {
    id: 'relationship-4',
    destinyType: 'ziwei',
    subCategory: 'relationship',
    title: '感情发展时机',
    content: `把握感情发展的最佳时机：

【恋爱时机】
- 红鸾星入命宫或夫妻宫
- 流年逢天喜
- 桃花运旺年份

【结婚时机】
- 天喜入夫妻宫
- 化禄入夫妻宫
- 大限夫妻宫吉星

【感情需谨慎期】
- 化忌入夫妻宫
- 煬星入夫妻宫
- 桃花化忌

【感情建议】
- 顺势而为，不强求
- 感情需要经营
- 保持真诚和包容`,
    stars: [],
    palaces: ['夫妻宫', '命宫'],
    keywords: ['时机', '恋爱', '结婚', '桃花'],
  },
  {
    id: 'relationship-5',
    destinyType: 'ziwei',
    subCategory: 'relationship',
    title: '感情问题化解',
    content: `常见感情问题的化解方法：

【感情不顺】
- 检查夫妻宫是否有煞星
- 注意沟通方式
- 多给对方空间

【桃花太旺】
- 保持专一
- 避免暧昧关系
- 专注正缘

【第三者干扰】
- 坚守原则
- 加强夫妻感情
- 可通过风水化解

【感情冷淡】
- 增加浪漫
- 共同兴趣
- 及时沟通`,
    stars: [],
    palaces: ['夫妻宫'],
    keywords: ['感情', '问题', '化解', '桃花'],
  },
];

/**
 * 感情专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return relationshipKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return relationshipKnowledge.filter(entry =>
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
    '天府', '天相', '贪狼', '太阴', '天同',
    '红鸾', '天喜', '廉贞', '天姚', '咸池',
    '夫妻宫', '命宫', '迁移宫',
    '感情', '婚姻', '恋爱', '配偶', '桃花',
    '异性缘', '配对', '结婚',
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
    entry.stars?.includes(kw) ||
    entry.palaces?.includes(kw) ||
    entry.content.includes(kw)
  );
}

// 导出数据供外部使用
export const entries = relationshipKnowledge;
