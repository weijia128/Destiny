/**
 * 八字命理 - 财运知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const wealthKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-wealth-1',
    destinyType: 'bazi',
    subCategory: 'wealth',
    title: '八字财星分析总论',
    content: `【正财与偏财】
正财（异性相克）：性格保守稳健，理财能力强，适合积累型致富。
偏财（同性相克）：偏财是横财、意外之财，也代表父亲和应酬。偏财旺者善于投机，但财来财去不易守。

【财星入命的判断】
财星在月支最有力（月令主事），其次年支，再次日支、时支。
财星透干（尤其月干）为财星明透，主财气外显、收入稳定。
财星坐库（辰丑戌未）为财入库，主财富积累好，晚年富裕。

【日主与财的关系】
日主旺：能驾驭财星，财多主富。
日主弱：财多身弱，有财无命享，劳碌奔波。
食伤生财：食神、伤官生财星，为生财有道，收入来源自劳力或才华。

【特殊格局】
财官双美格：财星、官星俱旺，且不克日主，主事业财运双丰收。
伤官生财格：伤官旺生财星，常见于做生意、创业者。
财旺生官格：财星生正官，主靠财力获得地位，适合经商后从政。`,
    pillars: ['月柱', '年柱', '日柱', '时柱'],
    shishen: ['正财', '偏财', '食神', '伤官', '正官'],
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['财运', '正财', '偏财', '财星', '致富', '理财', '收入', '财富'],
  },
  {
    id: 'bazi-wealth-2',
    destinyType: 'bazi',
    subCategory: 'wealth',
    title: '五行与财运对应',
    content: `【日主木】
  偏财为土，正财为土（阴阳异）。
  木克土，木旺土弱时钱财较难积累；木弱财星旺时，劳而不获。
  喜用神为金（印）或水（印）时，行金水大运财运亨通。

【日主火】
  偏财为金，正财为金。
  火旺克金（财星），易财来财去；火弱时行水运（官杀）亦能带财。
  食伤（土）生财（金）为火命人生财的最佳方式。

【日主土】
  偏财为水，正财为水。
  土多克水，财星受克则财运受阻；需木（官）疏土，财方可流通。
  贵在水旺又不被土完全克制，方能发财。

【日主金】
  偏财为木，正财为木。
  金克木，金旺时财星受克，理财宜保守；行火运（官杀）可泄金生水，间接助财。

【日主水】
  偏财为火，正财为火。
  水旺时火（财星）熄灭，财缘较薄；喜土（官）克水，财方能显现。
  行木（食伤）运，木生火，有生财机缘。`,
    pillars: ['日柱'],
    shishen: ['正财', '偏财'],
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['五行', '财运', '日主', '大运', '木命', '火命', '土命', '金命', '水命'],
  },
  {
    id: 'bazi-wealth-3',
    destinyType: 'bazi',
    subCategory: 'wealth',
    title: '大运流年财运判断',
    content: `【大运与财运】
行财星大运：财运主旺，收入增加，适合投资或开创新业。
行食伤大运：间接生财，才华变现期，创业或副业收入增加。
行印星大运：财星受克（印克食伤），收入可能下降，宜保守理财。
行官杀大运：需视日主强弱，日主强者可驾驭，日主弱者压力大财运受阻。

【流年影响】
财星流年：当年收入或横财机会。
合财：流年天干合住命中财星，财运突出但需防财被合去（财不自由）。
冲财：流年冲财星，财运波动，防破财、投资失利。

【注意事项】
财星太多（财多身弱）：表面收入高但支出也大，实际积累有限。
财星入墓（辰戌丑未）：财富入库，适合理财储蓄，不宜激进投资。
劫财夺财：比劫旺运年，竞争激烈，防合伙人或兄弟姐妹因财起纷争。`,
    pillars: ['年柱', '月柱'],
    shishen: ['正财', '偏财', '比肩', '劫财', '正印', '偏印'],
    keywords: ['大运', '流年', '财运', '投资', '理财', '破财', '横财'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return wealthKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = wealthKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '财运', '正财', '偏财', '财星', '大运', '流年', '致富', '理财',
    '收入', '投资', '破财', '横财', '五行',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
