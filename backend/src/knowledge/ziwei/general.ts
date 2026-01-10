/**
 * 综合分析知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 综合知识库数据
 */
export const generalKnowledge: KnowledgeEntry[] = [
  {
    id: 'general-1',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '命盘格局分析',
    content: `分析命盘需要综合考虑多个因素：

【命宫分析】
- 命宫是全盘核心
- 主性格、能力、一生运势
- 命宫主星决定基本格局
- 三方四正影响命运走向

【身宫分析】
- 身宫是后天努力方向
- 反映人生追求重点
- 与命宫配合分析
- 大限流年时重要

【三方四正】
- 命宫、迁移宫、财帛宫、官禄宫
- 形成主要人生格局
- 吉星多主顺遂
- 煁星多需努力

【四化飞星】
- 化禄主机遇、财源
- 化权主权力、地位
- 化科主名声、学业
- 化忌主阻碍、是非`,
    stars: [],
    palaces: ['命宫', '迁移宫', '财帛宫', '官禄宫'],
    keywords: ['格局', '运势', '命运', '人生'],
  },
  {
    id: 'general-2',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '十四主星特点',
    content: `紫微斗数十四主星各具特色：

【紫微星】
- 帝星，主贵气
- 领导能力强
- 自尊心强

【天机星】
- 智慧星，主谋略
- 善于策划
- 反应灵活

【太阳星】
- 贵人星，主光明
- 热心服务
- 有表现欲

【武曲星】
- 财星，主财帛
- 执行力强
- 敢于冒险

【天同星】
- 福星，主福气
- 性格温和
- 享受生活`,
    stars: ['紫微', '天机', '太阳', '武曲', '天同'],
    palaces: ['命宫'],
    keywords: ['主星', '性格', '特点', '格局'],
  },
  {
    id: 'general-3',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '人生发展阶段',
    content: `人生运势随大限流年变化：

【大限运势】
- 每十年一个阶段
- 大限宫位吉凶定十年
- 把握机遇期
- 谨慎困难期

【流年运势】
- 一年一变化
- 流年宫位影响当年
- 注意流年四化
- 配合大限看

【关键年龄】
- 虚岁逢本命年
- 大限交接年
- 流年逢化忌
- 需特别注意`,
    stars: [],
    palaces: [],
    keywords: ['运势', '大限', '流年', '时机'],
  },
  {
    id: 'general-4',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '化忌化解',
    content: `四化中的化忌需要化解：

【化忌的含义】
- 代表阻碍、不顺
- 是磨练而非灾难
- 需要更多努力
- 可以提前预防

【化解方法】
- 保持低调谨慎
- 多做善事积德
- 学习提升自己
- 寻求贵人帮助
- 稳扎稳打前进

【化忌入宫】
- 命宫：自我磨炼
- 财帛宫：理财谨慎
- 官禄宫：事业多波折
- 夫妻宫：感情需经营`,
    stars: [],
    palaces: ['命宫', '财帛宫', '官禄宫', '夫妻宫'],
    keywords: ['化忌', '化解', '运势', '阻碍'],
  },
  {
    id: 'general-5',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '人生建议',
    content: `综合命盘给出人生建议：

【发挥优势】
- 利用命宫吉星
- 把握有利时机
- 发挥自己特长

【改善不足】
- 了解自己弱点
- 持续学习提升
- 寻求他人帮助

【人生规划】
- 短期目标
- 中期规划
- 长期愿景

【保持心态】
- 积极正面
- 不骄不躁
- 知足常乐`,
    stars: [],
    palaces: ['命宫'],
    keywords: ['人生', '建议', '规划', '发展'],
  },
];

/**
 * 综合专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return generalKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return generalKnowledge.filter(entry =>
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
    '命宫', '迁移宫', '财帛宫', '官禄宫', '夫妻宫',
    '格局', '运势', '命运', '人生', '大限', '流年',
    '化忌', '化解', '规划', '发展',
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
export const entries = generalKnowledge;
