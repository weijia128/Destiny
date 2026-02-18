/**
 * 八字命理 - 事业运势知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const careerKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-career-1',
    destinyType: 'bazi',
    subCategory: 'career',
    title: '十神结构与职业路径',
    content: `【官杀主秩序与责任】
正官旺且身强：适合组织型路径（体制、管理、合规、法务），重流程与稳定晋升。
七杀旺且有制：适合高压岗位（项目攻坚、销售前线、军警安保、运营一线），要求执行力和决断力。
官杀混杂不清：职位角色容易摇摆，宜先定赛道与职责边界再谈跳槽。

【食伤主输出与专业影响力】
食神旺：适合长期主义专业岗（研究、咨询、教学、技术沉淀）。
伤官旺：适合创意与表达岗（产品、品牌、内容、商业谈判），但需规则意识避免与上级冲突。
伤官配印：既有表达也有体系化能力，适合“专业+管理”复合型岗位。

【财星与事业变现】
正财旺：适合流程化、可复用、可沉淀的业务（经营管理、财务、供应链）。
偏财旺：适合资源整合、市场拓展、商务合作，但需风控防止短期激进。
财多身弱：机会多但承载不足，先补能力与团队再扩张。`,
    shishen: ['正官', '七杀', '食神', '伤官', '正财', '偏财', '正印', '偏印'],
    keywords: ['事业', '职业', '十神', '升职', '管理', '跳槽', '创业', '执行力'],
  },
  {
    id: 'bazi-career-2',
    destinyType: 'bazi',
    subCategory: 'career',
    title: '格局成败点与职业选择',
    content: `【常见事业格局的用法】
正官格：靠专业资质、组织信用、长期履历积累，忌频繁跨行。
七杀格：适合打硬仗与结果导向岗位，关键在“印化杀”或“食神制杀”来稳住风险。
食神格：适合输出能力与长期口碑行业，重持续产出与复利。
伤官格：适合高表达和创新岗位，但要控制情绪化表达与规则冲突成本。
财格：适合经营、销售、交易和资源配置岗位，重现金流与回款纪律。

【职业选择三步法】
第一步：先看月令主气定主赛道（管理/技术/市场/经营）。
第二步：看天干透出定工作方式（执行/输出/统筹/资源整合）。
第三步：看日主强弱与通根，评估是否“能扛得住岗位压力”。

【常见误区】
只看“哪个十神好”不看组合，容易选错岗位。
只看短期高薪不看命局承载力，易出现高开低走。
忽略岁运阶段差异，同一职业在不同运程结果可能完全不同。`,
    shishen: ['正官', '七杀', '食神', '伤官', '正财', '偏财', '正印'],
    keywords: ['格局', '事业格局', '职业选择', '正官格', '七杀格', '食神格', '伤官格', '财格'],
  },
  {
    id: 'bazi-career-3',
    destinyType: 'bazi',
    subCategory: 'career',
    title: '大运流年下的事业决策窗口',
    content: `【大运判断主节奏（10年）】
行印比运：适合补能力、拿证书、打底层体系，不宜盲目扩张。
行食伤运：适合打造作品和个人品牌，利跳槽和职业转型。
行财运：利业绩兑现与商业化，但必须强化合同、回款与现金流管理。
行官杀运：利职位上升与权责扩大，前提是抗压与协作能力匹配。

【流年判断主时点（1年）】
流年合命局用神：适合推进关键动作（晋升申请、核心项目、业务拓展）。
流年冲克日主或官星：组织关系易波动，优先稳岗位与边界管理。
流年见比劫夺财：合伙和资源分配矛盾增多，避免高杠杆承诺。

【实操建议】
重大决策前先做“命局结构 + 当前大运 + 当年流年”三层校验。
若命局提示“承载不足”，先做半年能力建设，再做职位跃迁。
对创业盘，重点看食伤生财链条是否通畅，避免只靠资源短冲。`,
    shishen: ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
    keywords: ['大运', '流年', '事业决策', '晋升', '跳槽', '转型', '创业', '职业窗口'],
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
    '事业', '工作', '职业', '发展', '升职', '跳槽', '转型', '创业',
    '年柱', '月柱', '日柱', '时柱',
    '十神', '格局', '正官', '七杀', '食神', '伤官', '正财', '偏财',
    '大运', '流年',
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
