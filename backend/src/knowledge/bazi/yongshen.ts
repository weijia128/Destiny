/**
 * 八字命理 - 用神分析知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const yongshenKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-yongshen-1',
    destinyType: 'bazi',
    subCategory: 'yongshen',
    title: '用神取法总论',
    content: `【用神定义】
用神是八字命局中最需要、最有利的五行，如同命局的"救星"。
用神能调候命局，平衡五行，使命主一生顺遂。

【取用神的基本原则】
扶抑取用：根据日主强弱取用神。
  - 日主旺：用官杀（制旺）、食伤（泄旺）、财星（耗旺）
  - 日主弱：用印星（生日主）、比劫（帮日主）

调候取用：根据生月季节寒暖燥湿取用神。
  - 生冬月（子丑亥）：日主过寒，喜火（丙丁）调候。
  - 生夏月（午未巳）：日主过热，喜水（壬癸）调候。
  - 生秋月（申酉戌）：需根据日主强弱配合取用。
  - 生春月（寅卯辰）：木旺，日主如为木则需金水调候。

通关取用：两种五行对峙，用通关之神疏导。
  - 金木对峙：用水通关（金生水，水生木）
  - 水火对峙：用木通关
  - 木土对峙：用火通关`,
    shishen: ['正印', '偏印', '比肩', '劫财', '正官', '七杀', '食神', '伤官', '正财', '偏财'],
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['用神', '取用', '扶抑', '调候', '通关', '喜神', '忌神', '日主强弱'],
  },
  {
    id: 'bazi-yongshen-2',
    destinyType: 'bazi',
    subCategory: 'yongshen',
    title: '用神与各行各业',
    content: `【用神五行与职业方向】
用神为木：教育、文化、医疗、环保、服装、木材、家具。
用神为火：传媒、娱乐、餐饮、能源、电气、化工、文艺。
用神为土：建筑、地产、农业、保险、中介、土石行业。
用神为金：金融、银行、机械、制造、军事、IT硬件。
用神为水：运输、贸易、咨询、旅游、水产、科技、传播。

【用神与色彩方位】
木：绿色、青色；方位东方。
火：红色、紫色；方位南方。
土：黄色、橙色；方位中央。
金：白色、银色、灰色；方位西方。
水：黑色、蓝色、深色；方位北方。

【用神五行运用建议】
用神为火者：多穿红色，居南方，选择朝南居室。
用神为水者：多接触水，居北方或靠近江河湖海。
用神为木者：多亲近自然、树木，居东方。
用神为金者：多接触金属，佩戴金属饰品。
用神为土者：多走户外，接触土壤，居高处或中央。`,
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['用神', '职业', '行业', '色彩', '方位', '建议', '风水', '喜用'],
  },
  {
    id: 'bazi-yongshen-3',
    destinyType: 'bazi',
    subCategory: 'yongshen',
    title: '用神与大运流年配合',
    content: `【用神大运的影响】
行用神大运：命局得到补益，最顺的10年。事业、财运、感情齐旺。
行喜神大运：辅助用神的大运，稍次于用神运，仍属吉运。
行闲神大运：不助不克，运势平淡，变化不大。
行忌神大运：克制用神，阻碍命局，多逆境挫折。
行仇神大运（生忌神）：帮助忌神，间接危害用神，比忌神还坏。

【流年用神判断】
用神流年：当年大吉，适合创业、升职、结婚等重大决策。
忌神流年：当年多阻，宜守不宜进，延缓重大决定。
用神与流年相合：用神得助，当年如虎添翼。
忌神与流年相冲：忌神受制，反而当年运气转好。

【实际案例思路】
先定用神 → 看大运是否帮助用神 → 看流年是否配合大运 →
综合评估该年度运势吉凶 → 给出具体行动建议。`,
    shishen: ['正印', '偏印', '比肩', '劫财', '正官', '七杀', '食神', '伤官', '正财', '偏财'],
    keywords: ['用神', '大运', '流年', '喜神', '忌神', '仇神', '闲神', '运势', '配合'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return yongshenKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = yongshenKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '用神', '喜神', '忌神', '仇神', '调候', '扶抑', '通关',
    '大运', '流年', '职业', '行业', '方位', '色彩',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
