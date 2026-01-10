/**
 * 财运分析知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 财运知识库数据
 */
export const wealthKnowledge: KnowledgeEntry[] = [
  {
    id: 'wealth-1',
    destinyType: 'ziwei',
    subCategory: 'wealth',
    title: '财帛宫主星分析',
    content: `财帛宫主管正财、偏财，是分析财运的核心宫位。

【武曲星在财帛宫】
- 财星入位，主财运亨通
- 赚钱能力强，善于理财
- 适合投资、业务工作
- 有横财运，但需注意风险

【天府星在财帛宫】
- 库星入位，主积蓄丰厚
- 财运稳定，善于守财
- 适合长期投资
- 晚年财运更佳

【贪狼星在财帛宫】
- 主偏财、横财
- 有投机运，但起伏大
- 需要注意理性投资
- 可能有意外收入`,
    stars: ['武曲', '天府', '贪狼'],
    palaces: ['财帛宫'],
    keywords: ['财运', '财富', '投资', '理财'],
  },
  {
    id: 'wealth-2',
    destinyType: 'ziwei',
    subCategory: 'wealth',
    title: '禄存与财运',
    content: `禄存星是紫微斗数中重要的财禄之星：

【禄存星特点】
- 主稳定收入，正财运
- 不是横财，是劳动所得
- 有禄存必有擎羊、陀罗夹护
- 财来财去需注意理财

【禄存入不同宫位】
- 入命宫：一生有稳定财源
- 入财帛宫：正财运旺
- 入田宅宫：有不动产运
- 入福德宫：精神富足

【禄存与四化】
- 禄存遇化禄：双禄夹，财运大旺
- 禄存遇化忌：财来财去，需节俭`,
    stars: ['禄存'],
    palaces: ['财帛宫', '命宫', '田宅宫', '福德宫'],
    keywords: ['禄存', '正财', '稳定收入'],
  },
  {
    id: 'wealth-3',
    destinyType: 'ziwei',
    subCategory: 'wealth',
    title: '化禄与财运',
    content: `化禄星是财禄之星，入不同宫位影响财运：

【化禄入命宫】
- 一生财运顺遂
- 容易获得财富
- 贵人运旺

【化禄入财帛宫】
- 正财运极佳
- 收入稳定增长
- 理财有方

【化禄入官禄宫】
- 事业带来财富
- 升职加薪机会多
- 财官双美

【化禄入田宅宫】
- 不动产运佳
- 房产增值
- 家底丰厚`,
    stars: [],
    palaces: ['命宫', '财帛宫', '官禄宫', '田宅宫'],
    keywords: ['化禄', '财运', '财富'],
  },
  {
    id: 'wealth-4',
    destinyType: 'ziwei',
    subCategory: 'wealth',
    title: '投资理财建议',
    content: `根据命盘特点给出投资建议：

【稳健型投资者】
- 天府、太阴在财帛宫
- 适合储蓄、债券、基金
- 不宜高风险投资
- 长期持有最稳健

【积极型投资者】
- 贪狼、武曲在财帛宫
- 可适当参与股票、基金
- 注意分散风险
- 设止盈止损点

【不宜投机者】
- 化忌在财帛宫
- 避免高风险投资
- 以保本为主
- 储蓄、保险最适宜`,
    stars: ['天府', '太阴', '贪狼', '武曲'],
    palaces: ['财帛宫'],
    keywords: ['投资', '理财', '基金', '股票'],
  },
  {
    id: 'wealth-5',
    destinyType: 'ziwei',
    subCategory: 'wealth',
    title: '财运时运分析',
    content: `财运随时间变化：

【大限财运】
- 大限逢吉星入财帛宫
- 这十年财运上升
- 把握投资机会

【流年财运】
- 流年化禄入财帛宫
- 当年财运最佳
- 可适当积极投资

【财运低迷期】
- 化忌冲财帛宫
- 宜保守理财
- 避免大额投资
- 积蓄实力为主`,
    stars: [],
    palaces: ['财帛宫'],
    keywords: ['财运', '运势', '时机', '投资'],
  },
];

/**
 * 财运专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return wealthKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return wealthKnowledge.filter(entry =>
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
    '武曲', '天府', '贪狼', '太阴',
    '禄存', '化禄', '化忌',
    '财帛宫', '命宫', '田宅宫', '官禄宫',
    '财运', '财富', '投资', '理财', '股票', '基金',
    '正财', '偏财', '横财',
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
export const entries = wealthKnowledge;
