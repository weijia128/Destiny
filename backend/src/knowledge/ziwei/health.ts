/**
 * 健康运势知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 健康知识库数据
 */
export const healthKnowledge: KnowledgeEntry[] = [
  {
    id: 'health-1',
    destinyType: 'ziwei',
    subCategory: 'health',
    title: '疾厄宫主星分析',
    content: `疾厄宫主管健康状况，需要重点关注。

【太阳星在疾厄宫】
- 注意眼睛、心脏问题
- 容易上火，需清淡饮食
- 男性尤其注意
- 建议定期体检

【太阴星在疾厄宫】
- 女性注意妇科问题
- 注意情绪影响健康
- 肾脏、泌尿系统需关注
- 适合静养调理

【巨门星在疾厄宫】
- 注意肠胃消化问题
- 口腔、咽喉需注意
- 压力影响消化
- 建议规律饮食

【天同星在疾厄宫】
- 整体健康较好
- 注意饮食节制
- 避免过度安逸`,
    stars: ['太阳', '太阴', '巨门', '天同'],
    palaces: ['疾厄宫'],
    keywords: ['健康', '疾病', '养生', '体检'],
  },
  {
    id: 'health-2',
    destinyType: 'ziwei',
    subCategory: 'health',
    title: '五行局与体质',
    content: `五行局影响先天体质特点：

【水二局】
- 体质偏寒，注意保暖
- 肾脏、泌尿系统需关注
- 适合温补调理
- 避免生冷食物

【木三局】
- 肝胆系统需注意
- 容易情志不畅
- 适合疏肝解郁
- 多运动舒展

【金四局】
- 呼吸系统需关注
- 皮肤容易敏感
- 注意肺部保养
- 避免烟尘环境

【土五局】
- 脾胃功能需注意
- 消化系统容易问题
- 适合健脾养胃
- 规律饮食重要

【火六局】
- 心血管需关注
- 容易上火急躁
- 注意清心降火
- 保持情绪平和`,
    stars: [],
    palaces: ['疾厄宫', '命宫'],
    keywords: ['五行局', '体质', '养生'],
  },
  {
    id: 'health-3',
    destinyType: 'ziwei',
    subCategory: 'health',
    title: '健康养生建议',
    content: `根据命盘特点的养生建议：

【养肝护胆】
- 木三局、天机在疾厄宫
- 少熬夜，多休息
- 绿色食物有益
- 保持心情舒畅

【健脾养胃】
- 土五局、天同在疾厄宫
- 规律三餐
- 温热食物为主
- 避免生冷油腻

【养心护心】
- 火六局、太阳在疾厄宫
- 避免过度激动
- 清淡饮食
- 适量运动

【养肺润燥】
- 金四局、天府在疾厄宫
- 避免烟尘
- 多吃白色食物
- 注意呼吸系统保养`,
    stars: [],
    palaces: ['疾厄宫'],
    keywords: ['养生', '健康', '饮食', '运动'],
  },
  {
    id: 'health-4',
    destinyType: 'ziwei',
    subCategory: 'health',
    title: '心理健康',
    content: `心理健康同样重要：

【情绪管理】
- 巨门在疾厄宫易思虑过多
- 学习放松技巧
- 保持社交活动
- 寻求专业帮助

【压力缓解】
- 七杀、破军在命宫压力大
- 培养兴趣爱好
- 规律作息
- 适度运动

【睡眠质量】
- 铃星在疾厄宫影响睡眠
- 建立睡眠习惯
- 睡前放松
- 避免过度兴奋`,
    stars: [],
    palaces: ['疾厄宫', '命宫'],
    keywords: ['心理', '健康', '情绪', '睡眠'],
  },
  {
    id: 'health-5',
    destinyType: 'ziwei',
    subCategory: 'health',
    title: '健康检查建议',
    content: `定期健康检查很重要：

【基础检查】
- 每年一次体检
- 血压、血糖监测
- 肝肾功能检查

【专项检查】
- 根据五行局特点
- 对应系统重点检查
- 早发现早治疗

【女性专项】
- 妇科检查
- 乳腺检查
- 太阴在疾厄宫需重视

【男性专项】
- 前列腺检查
- 太阳在疾厄宫注意心脏`,
    stars: [],
    palaces: ['疾厄宫'],
    keywords: ['体检', '检查', '健康', '预防'],
  },
];

/**
 * 健康专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return healthKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return healthKnowledge.filter(entry =>
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
    '太阳', '太阴', '巨门', '天同', '天机', '天府',
    '疾厄宫', '命宫',
    '健康', '疾病', '养生', '体质', '体检',
    '心理', '情绪', '睡眠', '压力',
    '肝', '心', '脾', '肺', '肾',
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
export const entries = healthKnowledge;
