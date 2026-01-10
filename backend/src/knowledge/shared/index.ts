/**
 * 共享基础理论知识库
 * 所有命理大类通用的基础理论
 */

import type { KnowledgeEntry } from '../../types/index.js';

/**
 * 五行理论
 */
export const fiveElementKnowledge: KnowledgeEntry[] = [
  {
    id: 'shared-wuxing-1',
    destinyType: 'ziwei', // 可用于任何大类
    subCategory: 'general',
    title: '五行基础理论',
    content: `五行是中华传统文化的基础理论：

【五行相生】
- 木生火：木燃烧产生火
- 火生土：火烧成灰变为土
- 土生金：土中蕴藏金属
- 金生水：金属凝结产生水
- 水生木：水滋养树木

【五行相克】
- 木克土：树木吸收土壤养分
- 土克水：土壤吸收水分
- 水克火：水可以灭火
- 火克金：火可以熔化金属
- 金克木：金属工具可以砍伐树木

【五行特性】
- 木：生长、升发、条达
- 火：温热、升腾、明亮
- 土：承载、生化、受纳
- 金：沉降、肃杀、收敛
- 水：寒凉、滋润、下行`,
    wuxing: ['木', '火', '土', '金', '水'],
    keywords: ['五行', '相生', '相克', '木', '火', '土', '金', '水'],
  },
];

/**
 * 天干地支基础
 */
export const ganZhiKnowledge: KnowledgeEntry[] = [
  {
    id: 'shared-ganzhi-1',
    destinyType: 'ziwei',
    subCategory: 'general',
    title: '天干地支基础',
    content: `天干地支是中华传统历法的基础：

【十天干】
- 甲乙丙丁戊己庚辛壬癸
- 甲乙属木，丙丁属火，戊己属土，庚辛属金，壬癸属水

【十二地支】
- 子丑寅卯辰巳午未申酉戌亥
- 对应十二生肖：鼠牛虎兔龙蛇马羊猴鸡狗猪

【干支配伍】
- 甲子、乙丑、丙寅...六十一甲子
- 用于纪年、纪月、纪日、纪时`,
    keywords: ['天干', '地支', '甲子', '六十甲子'],
  },
];

/**
 * 合并所有共享知识
 */
export const sharedKnowledge: KnowledgeEntry[] = [
  ...fiveElementKnowledge,
  ...ganZhiKnowledge,
];

/**
 * 根据子分类检索共享知识
 */
export function retrieve(subCategory: string): KnowledgeEntry[] {
  // 共享知识对所有大类都适用
  return sharedKnowledge;
}
