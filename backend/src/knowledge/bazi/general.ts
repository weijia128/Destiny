/**
 * 八字命理 - 综合分析知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const generalKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-general-1',
    destinyType: 'bazi',
    subCategory: 'general',
    title: '八字综合命局判断方法',
    content: `【命局强弱判断步骤】
1. 看月令：月令是否有力生扶日主？月令是日主最主要的根基。
2. 看年时：年柱时柱是否有印比帮扶日主？
3. 统计五行：日主五行在八字中共出现几次？
4. 综合判断：强命、弱命、从格（从旺、从强、从财、从杀）

【命局类型】
普通格：日主有一定根气，五行较均衡，走中庸之路。
强命（旺格）：日主极旺，喜泄克，行食伤财官运佳。
弱命（弱格）：日主极弱，喜印比，行印比运方能发挥。
从格：日主完全无根，只能顺从最旺的五行，形成从格。
从财格：四柱财多无印比，完全从财，行财运反而大吉。
从杀格：四柱官杀旺无印，弃命从杀，行官杀运大贵。

【命好命坏的衡量标准】
用神有力：命中用神强旺，运途顺遂。
格局清纯：格局明确不杂乱，发展方向清晰。
大运配合：大运辅佐用神，每10年都有进步。
流年吉凶：流年引发用神还是忌神？`,
    shishen: ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['综合', '命局', '强弱', '格局', '用神', '大运', '五行', '从格', '旺格'],
  },
  {
    id: 'bazi-general-2',
    destinyType: 'bazi',
    subCategory: 'general',
    title: '八字人生阶段分析',
    content: `【四柱对应人生阶段】
年柱（0-15岁）：早年、家庭背景、祖辈影响。
月柱（16-30岁）：青壮年、学业、求职、父母影响。
日柱（31-45岁）：中年、婚姻、自身成就核心期。
时柱（46岁以后）：晚年、子女、晚年事业。

【人生高峰期判断】
行用神大运：最顺遂的10年，事业、感情、财运齐旺。
用神旺的流年：年度内最顺利的时期，把握机会。
纳音五行配合用神：运途加成，好上加好。

【人生低谷期识别】
行忌神大运：阻碍重重，宜守不宜攻，低调行事。
岁运并临忌神：双重不利，保守理财，避免大决策。
岁运冲日柱：自身动荡，健康或感情有变化。

【整体命格评估】
天干通透（干支同五行）：聪明通透，思路清晰。
地支合局（三合、六合）：稳定性强，贵人多助。
刑冲克害多：人生多波折，转折较多，但未必是坏事。`,
    shishen: ['正财', '偏财', '正官', '七杀', '正印', '偏印', '食神', '伤官'],
    pillars: ['年柱', '月柱', '日柱', '时柱'],
    keywords: ['综合', '人生', '阶段', '四柱', '高峰', '低谷', '大运', '流年', '整体'],
  },
  {
    id: 'bazi-general-3',
    destinyType: 'bazi',
    subCategory: 'general',
    title: '八字性格与天赋特质',
    content: `【天干十神与性格】
比肩旺：独立自主，不服输，竞争意识强，处事有原则。
劫财旺：投机取巧，交际广，有赌性，义气但也有自私一面。
食神旺：随和享受，有才艺，口才好，贵人多，乐观知足。
伤官旺：聪明反应快，有创意，口才辩才一流，但叛逆。
正财旺：踏实理财，节俭，重原则，事业稳健，感情专一。
偏财旺：八面玲珑，交际好，慷慨大方，善于应酬。
正官旺：守法循规，责任感强，重名誉，适合仕途。
七杀旺：魄力十足，执行力强，但脾气急，压力大易走极端。
正印旺：善良博爱，重学问，有深度，保守稳重，但可能懒散。
偏印旺：思维独特，才艺多，有灵性，但心思重，易钻牛角尖。

【五行性格特质】
木旺：仁慈宽厚，有上进心，但固执。
火旺：热情开朗，创造力强，但情绪化。
土旺：务实稳重，可靠诚信，但守旧。
金旺：刚正果断，执行力强，但孤傲。
水旺：机智灵活，记忆力好，但多虑。`,
    shishen: ['比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['性格', '天赋', '特质', '十神', '五行', '才华', '能力', '适合', '综合'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return generalKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = generalKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '综合', '命局', '格局', '性格', '天赋', '五行', '大运', '流年',
    '人生', '阶段', '强弱', '用神', '整体', '特质', '能力',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
