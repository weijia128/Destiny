/**
 * 紫微斗数 - 事业运势知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 事业知识库数据
 */
export const careerKnowledge: KnowledgeEntry[] = [
  {
    id: 'career-1',
    destinyType: 'ziwei',
    subCategory: 'career',
    title: '官禄宫主星分析',
    content: `官禄宫是紫微斗数中主管事业发展、工作运势的关键宫位。

【紫微星在官禄宫】
- 主贵显，适合公职、管理岗位
- 具有领导才能，能够统御下属
- 事业发展稳定，有贵人提携
- 适合大型企业或政府机关

【武曲星在官禄宫】
- 主财星入官禄，财官双美
- 适合金融、财务、业务工作
- 做事果断，执行力强
- 适合需要魄力的行业

【天机星在官禄宫】
- 主智慧，善于策划
- 适合研究、策划、顾问工作
- 头脑灵活，创意十足
- 适合需要动脑的行业`,
    stars: ['紫微', '武曲', '天机'],
    palaces: ['官禄宫'],
    keywords: ['事业', '工作', '职业', '发展'],
  },
  {
    id: 'career-2',
    destinyType: 'ziwei',
    subCategory: 'career',
    title: '四化与事业运',
    content: `四化飞星对事业发展有重要影响：

【化禄入官禄宫】
- 事业机遇多，贵人运旺
- 工作顺遂，收入增加
- 适合拓展新领域

【化权入官禄宫】
- 掌握权力，有升迁机会
- 工作能力被认可
- 适合担任管理职位

【化科入官禄宫】
- 获得好名声，专业被肯定
- 适合学术、技术领域
- 有机会成为专家

【化忌入官禄宫】
- 事业有阻碍，需多努力
- 可能遇到小人是非
- 建议稳扎稳打`,
    stars: [],
    palaces: ['官禄宫'],
    keywords: ['四化', '化禄', '化权', '化科', '化忌'],
  },
  {
    id: 'career-3',
    destinyType: 'ziwei',
    subCategory: 'career',
    title: '命宫主星与职业选择',
    content: `命宫主星影响个人职业性格和能力：

【紫微星命宫】
- 天生领导者，适合管理层
- 有远大抱负，不满足于平庸
- 适合创业、担任高管

【天机星命宫】
- 聪明睿智，善于规划
- 适合咨询、策划、教育
- 需要发挥创意的工作

【太阳星命宫】
- 热心服务，适合公众事业
- 有表现欲，适合媒体、演艺
- 适合需要人脉的行业

【武曲星命宫】
- 执行力强，适合实务工作
- 敢于冒险，适合业务、金融
- 适合创业或独立经营`,
    stars: ['紫微', '天机', '太阳', '武曲'],
    palaces: ['命宫'],
    keywords: ['职业', '工作', '选择', '发展'],
  },
  {
    id: 'career-4',
    destinyType: 'ziwei',
    subCategory: 'career',
    title: '迁移宫与外出发展',
    content: `迁移宫主管外出运势、异地发展：

【迁移宫吉星】
- 适合外出发展，外地有财
- 出外贵人多，机遇佳
- 适合外贸、旅游行业

【迁移宫煞星】
- 不宜外出，本地发展为宜
- 出外易遇阻碍
- 适合本地稳定工作

【命迁同宫】
- 内外运势皆佳
- 可兼顾本地与外地发展`,
    stars: [],
    palaces: ['迁移宫'],
    keywords: ['外出', '发展', '迁移', '异地'],
  },
  {
    id: 'career-5',
    destinyType: 'ziwei',
    subCategory: 'career',
    title: '事业运势综合分析',
    content: `综合判断事业运势需要考虑：

【三合官禄宫】
- 命宫、官禄宫、财帛宫形成三合
- 三宫吉星多，事业大吉
- 财官双美，富贵可期

【事业最佳时期】
- 大限吉星入官禄宫
- 流年化禄入事业宫
- 贵人运旺，机遇多

【事业注意事项】
- 化忌冲官禄宫需谨慎
- 煬星入官禄宫需努力
- 保持低调，积攒实力`,
    stars: [],
    palaces: ['命宫', '官禄宫', '财帛宫'],
    keywords: ['事业', '运势', '综合', '发展'],
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
    '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
    '天府', '太阴', '贪狼', '巨门', '天相', '天梁',
    '七杀', '破军',
    '官禄宫', '命宫', '迁移宫', '财帛宫',
    '事业', '工作', '职业', '发展', '四化',
    '化禄', '化权', '化科', '化忌',
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
export const entries = careerKnowledge;
