/**
 * 八字命理 - 感情婚姻知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const relationshipKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-rel-1',
    destinyType: 'bazi',
    subCategory: 'relationship',
    title: '八字婚姻星分析（男命）',
    content: `【男命看财星为妻】
正财为妻（有情之妻），偏财为情人或妾。
财星旺且日主有力：感情顺利，妻贤且有助力。
财星弱被克：感情挫折，或妻子体弱、婚姻不稳。
财多身弱：异性缘好但难以专一，感情消耗精力。

【男命日支看配偶宫】
日支为配偶宫，其中藏干代表配偶特质：
日支阳刃（午、子、卯、酉）：配偶个性独立、刚强，婚姻需磨合。
日支财星：配偶贤淑，物质条件好。
日支官杀：配偶有地位或才干，但也可能控制欲强。

【特殊情况】
财星入墓（辰戌丑未）：感情深藏，晚婚或感情含蓄。
比劫争财：兄弟姐妹或朋友影响感情，第三者风险。
财官相生：感情与事业相辅相成，得贤妻助力。`,
    pillars: ['日柱', '月柱', '年柱', '时柱'],
    shishen: ['正财', '偏财', '正官', '七杀', '比肩', '劫财'],
    keywords: ['婚姻', '感情', '男命', '妻星', '财星', '配偶', '日支', '恋爱'],
  },
  {
    id: 'bazi-rel-2',
    destinyType: 'bazi',
    subCategory: 'relationship',
    title: '八字婚姻星分析（女命）',
    content: `【女命看官杀为夫】
正官为夫（正式配偶），七杀为情人或同居者。
官星旺且日主有力：婚姻稳定，丈夫有能力。
官杀混杂：感情复杂，易有多段感情或婚姻不稳。
官星弱被克：丈夫能力偏弱，或感情缘分浅薄。

【女命日支看配偶宫】
日支官星：丈夫有地位、有能力，婚姻主动权在对方。
日支食伤：本人独立自主，对感情有自己的想法，易晚婚。
日支比劫：与配偶平起平坐，感情平等但容易因自我而冲突。

【特殊情况】
伤官见官：女命伤官旺，官星受克，感情波折，婚姻不稳。
食神制杀：七杀被食神制化，婚姻反而稳定（化凶为吉）。
官星入库：感情含蓄深沉，晚婚或婚后生活较平淡。
官杀混杂不制：感情复杂，易有婚外情或多次婚姻。`,
    pillars: ['日柱', '月柱'],
    shishen: ['正官', '七杀', '食神', '伤官', '正印', '偏印'],
    keywords: ['婚姻', '感情', '女命', '夫星', '官星', '配偶', '日支', '官杀混杂'],
  },
  {
    id: 'bazi-rel-3',
    destinyType: 'bazi',
    subCategory: 'relationship',
    title: '感情大运流年分析',
    content: `【感情大运规律】
行财运（男）/ 行官运（女）：感情机缘大运，适合恋爱结婚。
行印运：心思内敛，偏重自我成长，感情机缘次之。
行比劫运：竞争激烈，感情出现第三者风险，已婚者需注意。
行食伤运（女）：对婚姻约束有抵触，离婚率较高。

【结婚时机判断】
命中财/官星旺的流年：感情运最旺的年份。
天干合：命中财/官星在流年被合，感情"动"起来。
地支合：日支与流年地支相合，婚姻感情有重要变化。
冲日支：感情、婚姻出现大变动（可能结婚也可能离婚）。

【离婚信号】
官杀混杂年：女命异性缘复杂。
比劫夺财年（男）：第三者出现。
伤官年（女命伤官旺）：对婚姻失望，分离倾向。
刑冲日支：配偶宫受到冲击，婚姻动荡。`,
    pillars: ['日柱', '年柱', '月柱'],
    shishen: ['正财', '偏财', '正官', '七杀', '比肩', '劫财', '食神', '伤官'],
    keywords: ['大运', '流年', '婚姻', '结婚', '离婚', '感情', '恋爱', '第三者', '时机'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return relationshipKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = relationshipKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '婚姻', '感情', '男命', '女命', '妻星', '夫星', '官星', '财星',
    '配偶', '恋爱', '结婚', '离婚', '大运', '流年',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
