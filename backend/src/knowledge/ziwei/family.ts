/**
 * 家庭亲缘知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 家庭知识库数据
 */
export const familyKnowledge: KnowledgeEntry[] = [
  {
    id: 'family-1',
    destinyType: 'ziwei',
    subCategory: 'family',
    title: '六亲宫位分析',
    content: `六亲宫位决定家庭关系：

【父母宫】
- 主与父母长辈关系
- 影响家庭背景
- 反映孝道缘分
- 父母健康状况

【兄弟宫】
- 主兄弟姐妹关系
- 朋友、同事缘分
- 合作伙伴运势
- 手足情谊深浅

【子女宫】
- 主子女缘分
- 子女成就高低
- 教育子女方式
- 子女数量暗示

【田宅宫】
- 主家庭环境
- 不动产运势
- 祖业继承
- 居住环境`,
    stars: [],
    palaces: ['父母宫', '兄弟宫', '子女宫', '田宅宫'],
    keywords: ['家庭', '父母', '子女', '兄弟'],
  },
  {
    id: 'family-2',
    destinyType: 'ziwei',
    subCategory: 'family',
    title: '亲子关系',
    content: `从子女宫看亲子关系：

【子女宫吉星】
- 子女孝顺有成
- 亲子关系和谐
- 子女聪明健康

【子女宫煞星】
- 子女缘分较薄
- 教育需要耐心
- 多沟通理解

【提升亲子关系】
- 尊重子女个性
- 有效沟通
- 适当放手
- 以身作则`,
    stars: [],
    palaces: ['子女宫'],
    keywords: ['子女', '亲子', '教育', '关系'],
  },
  {
    id: 'family-3',
    destinyType: 'ziwei',
    subCategory: 'family',
    title: '婆媳关系',
    content: `婆媳关系是家庭和谐的关键：

【父母宫看婆媳】
- 吉星：关系和谐
- 煁星：容易摩擦

【化解方法】
- 保持距离
- 互相尊重
- 丈夫调解
- 降低期望`,
    stars: [],
    palaces: ['父母宫', '夫妻宫'],
    keywords: ['婆媳', '家庭', '关系', '和谐'],
  },
  {
    id: 'family-4',
    destinyType: 'ziwei',
    subCategory: 'family',
    title: '祖业继承',
    content: `从田宅宫看祖业继承：

【田宅宫吉星】
- 有祖业可继承
- 不动产运佳
- 家底丰厚

【田宅宫煞星】
- 需白手起家
- 住房不稳定
- 晚年置产

【置业建议】
- 根据大限时机
- 化禄入田宅宫好时机
- 稳健投资房产`,
    stars: [],
    palaces: ['田宅宫'],
    keywords: ['祖业', '房产', '继承', '置业'],
  },
  {
    id: 'family-5',
    destinyType: 'ziwei',
    subCategory: 'family',
    title: '家庭和睦之道',
    content: `营造和谐家庭关系：

【夫妻关系】
- 互相尊重信任
- 共同承担责任
- 保持沟通

【子女教育】
- 因材施教
- 榜样力量
- 惩罚有度

【婆媳相处】
- 保持距离
- 互相体谅
- 避免干涉

【家庭聚会】
- 定期团聚
- 增进感情
- 传承文化`,
    stars: [],
    palaces: ['夫妻宫', '子女宫', '父母宫', '田宅宫'],
    keywords: ['家庭', '和睦', '关系', '和谐'],
  },
];

/**
 * 家庭专有检索逻辑
 */
export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const combinedText = chartText + ' ' + query;
  const keywords = extractKeywords(combinedText);

  return familyKnowledge
    .filter(entry => matchKeywords(entry, keywords))
    .slice(0, 5);
}

/**
 * 按关键词搜索
 */
export function searchByKeywords(keywords: string[]): KnowledgeEntry[] {
  return familyKnowledge.filter(entry =>
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
    '父母宫', '兄弟宫', '子女宫', '田宅宫', '夫妻宫',
    '家庭', '父母', '子女', '兄弟', '婆媳',
    '祖业', '房产', '继承', '置业',
    '亲子', '教育', '关系', '和谐',
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
export const entries = familyKnowledge;
