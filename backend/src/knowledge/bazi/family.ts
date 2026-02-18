/**
 * 八字命理 - 家庭亲缘知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const familyKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-family-1',
    destinyType: 'bazi',
    subCategory: 'family',
    title: '六亲星看家庭关系',
    content: `【八字六亲对应】
父亲：男命看偏财，女命看偏财（部分学派看正财）
母亲：男命看正印，女命看正印
兄弟：男命看比肩（同性），女命看比肩
姐妹：男命看劫财，女命看劫财
子女：男命看食神（女儿）、伤官（儿子）；女命看食神（女儿）、伤官（儿子）
子孙：时柱为晚年、子孙

【星旺与亲缘】
六亲星旺且有力：与该亲属关系好，对方有助力。
六亲星弱被克：与该亲属缘分浅薄，或该亲属身体较弱。
六亲星入墓：与该亲属关系深沉内敛，或对方早离（辰戌丑未）。

【父母宫与兄弟宫】
年柱代表祖辈与早年家庭背景。
月柱代表父母（尤其父母宫）、兄弟姐妹。
月令财星旺：父亲富裕，家庭物质条件好。
月令印星旺：母亲贤慧，早年读书运佳，家庭教育好。`,
    shishen: ['正印', '偏印', '比肩', '劫财', '食神', '伤官', '正财', '偏财'],
    pillars: ['年柱', '月柱', '时柱'],
    keywords: ['家庭', '父亲', '母亲', '兄弟', '姐妹', '子女', '六亲', '亲缘', '父母'],
  },
  {
    id: 'bazi-family-2',
    destinyType: 'bazi',
    subCategory: 'family',
    title: '子女星与子嗣分析',
    content: `【子女星的判断】
男命：食神为女儿，伤官为儿子。
女命：食神为女儿，伤官为儿子。子女星是食伤，也代表女命的才华表达。

【子女缘深浅】
食伤旺且有力：子女缘深，子女聪明有出息。
食伤弱被克（印旺克食伤）：子女缘薄，晚育或子女较难带。
时柱藏食伤：晚年有子女陪伴，晚运较好。
食伤入墓：子女性格内敛，缘分含蓄。

【特殊格局】
枭神夺食（偏印旺克食神）：子女缘较薄，或子女难以成器。
伤官旺（女命）：婚后独立意识强，对生育子女有自己的想法，晚育倾向。
食神旺（女命）：温柔贤淑，爱护子女，适合相夫教子。

【子女运与流年】
食伤流年：子女有喜事，或本人才华被认可。
子女官杀旺年：子女受压力，或自身对子女有管教问题。
冲时支：子女宫受冲，子女与自身关系出现变化。`,
    shishen: ['食神', '伤官', '正印', '偏印'],
    pillars: ['时柱', '日柱'],
    keywords: ['子女', '子嗣', '食神', '伤官', '生育', '子女缘', '晚年', '时柱'],
  },
  {
    id: 'bazi-family-3',
    destinyType: 'bazi',
    subCategory: 'family',
    title: '家庭背景与祖荫分析',
    content: `【年柱与家庭背景】
年干为祖父，年支为祖母（部分学派）。
年柱官印旺：出身官宦或书香门第，家庭背景好。
年柱财旺：出身富裕家庭，早年物质条件佳。
年柱比劫旺：兄弟姐妹多，或家庭中竞争较多。
年柱刑冲：早年家庭不稳定，或幼年与亲人分离。

【月柱与父母影响】
月令印旺：母亲对命主影响深远，教育背景好。
月令财旺：父亲能干，家庭经济条件好。
月令官杀旺：父亲严格，有规矩，家教严格。
月令比劫旺：兄弟姐妹多，家庭中竞争感强。

【离祖与克亲】
年月柱刑冲严重：早年离祖，或与父母聚少离多。
六亲星入库（辰戌丑未）：与六亲感情深沉内敛，或六亲早离。
六亲星死绝：与该六亲缘分浅薄，对方健康较弱或缘分短。`,
    shishen: ['正印', '偏印', '比肩', '劫财', '正官', '七杀'],
    pillars: ['年柱', '月柱'],
    keywords: ['家庭', '祖荫', '父母', '背景', '年柱', '月柱', '出身', '离祖', '家教'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return familyKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = familyKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '家庭', '父亲', '母亲', '兄弟', '姐妹', '子女', '六亲', '亲缘',
    '父母', '子嗣', '祖荫', '背景', '年柱', '月柱', '时柱',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
