/**
 * 八字命理 - 健康运势知识库
 */

import type { KnowledgeEntry } from '../../types/index.js';

export const healthKnowledge: KnowledgeEntry[] = [
  {
    id: 'bazi-health-1',
    destinyType: 'bazi',
    subCategory: 'health',
    title: '五行与身体器官对应',
    content: `【五行对应人体】
木：肝脏、胆囊、神经系统、筋骨、眼睛
火：心脏、小肠、血液循环、视力
土：脾脏、胃、消化系统、肌肉
金：肺脏、大肠、呼吸系统、皮肤、鼻子
水：肾脏、膀胱、泌尿生殖系统、耳朵、骨骼

【判断方法】
命中五行过旺（超过3个）：对应器官易亢奋或过劳。
命中五行过弱（0个）：对应器官先天较弱，需注意保养。
五行被克：被克五行对应的器官健康风险较高。

【实例】
命中土旺克水：脾胃强但肾脏偏弱，需注意肾脏保养。
命中金旺克木：呼吸系统有优势但肝胆偏弱，注意情绪管理。
命中木旺克土：肝胆旺盛但脾胃消化功能偏弱。`,
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['健康', '五行', '器官', '肝脏', '心脏', '脾胃', '肺', '肾', '身体'],
  },
  {
    id: 'bazi-health-2',
    destinyType: 'bazi',
    subCategory: 'health',
    title: '十神与健康关联',
    content: `【十神对健康的影响】
正印、偏印旺：大脑活跃，思虑过多，易失眠、神经衰弱。
比肩、劫财旺：精力充沛，但争强好胜，易受外伤。
食神旺：消化好，体质较好，但易贪嘴导致肠胃问题。
伤官旺：精神外泄，情绪波动大，易有肝气郁结。
正财、偏财旺：操劳奔波，易过劳，财运好但健康需关注。
正官、七杀旺（日主弱）：压力大，易因压力引发疾病；七杀过旺主伤灾。

【特殊格局与健康】
枭神夺食（偏印克食神）：消化系统问题，免疫力偏弱。
伤官见官（格局不合）：紧张焦虑，职场压力影响身心。
比劫旺而无制：血气方刚，外伤风险，需注意安全。

【大运健康变化】
行克日主五行的大运：健康挑战期，需定期体检。
行喜用神大运：精气神充沛，健康状态改善。`,
    shishen: ['正印', '偏印', '比肩', '劫财', '食神', '伤官', '正财', '偏财', '正官', '七杀'],
    keywords: ['健康', '十神', '疾病', '失眠', '压力', '外伤', '体质', '大运'],
  },
  {
    id: 'bazi-health-3',
    destinyType: 'bazi',
    subCategory: 'health',
    title: '健康风险大运流年判断',
    content: `【高风险大运特征】
克日主的大运：日主被克，整体健康下滑，容易生病。
七杀旺且无制的大运：意外伤灾风险，男性尤须注意。
官杀混杂的大运：压力过大导致慢性病。
比劫旺的大运：兄弟竞争，竞争激烈导致劳神伤身。

【健康流年信号】
流年干支克日柱：当年健康挑战，注意重大疾病筛查。
流年冲日支：配偶宫受冲，身体抵抗力下降。
流年合住喜用神（合去喜用）：健康失去保护，需注意。
流年带刑（寅巳申三刑、子卯相刑等）：外伤或手术机率增高。

【养生建议方向】
木弱者：保肝护胆，调节情绪，避免熬夜。
火弱者：保护心血管，注意心脏健康，适当运动。
土弱者：规律饮食，保护脾胃，忌暴饮暴食。
金弱者：保护呼吸系统，戒烟，关注肺部健康。
水弱者：保肾护腰，注意泌尿系统，补充水分。`,
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['健康', '大运', '流年', '疾病', '外伤', '养生', '风险', '体检'],
  },
];

export function retrieve(chartText: string, query: string): KnowledgeEntry[] {
  const keywords = extractKeywords(chartText + ' ' + query);
  return healthKnowledge
    .filter(e => matchKeywords(e, keywords))
    .slice(0, 5);
}

export const entries = healthKnowledge;

function extractKeywords(text: string): string[] {
  return [
    '健康', '疾病', '五行', '器官', '大运', '流年', '养生', '外伤',
    '失眠', '压力', '体质', '肝', '心', '脾', '肺', '肾',
  ].filter(k => text.includes(k));
}

function matchKeywords(entry: KnowledgeEntry, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some(kw =>
    entry.keywords.includes(kw) || entry.content.includes(kw) || entry.title.includes(kw)
  );
}
