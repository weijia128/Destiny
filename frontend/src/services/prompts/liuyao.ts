/**
 * 六爻预测 Prompt 构建器
 */

import type { PromptBuilder, PromptBuildResult, FormattedData } from './index';
import type { SubCategory, ChatMessage } from '@/types';

/**
 * 六爻预测知识库
 */
const LIUYAO_KNOWLEDGE: Record<SubCategory, string> = {
  // 通用分类
  career: `
【六爻事业预测知识库】
- 官鬼爻：代表事业、职位、权力
  - 官鬼持世：事业稳定、有职位
  - 官鬼生世：事业有贵人相助
  - 官鬼克世：工作压力大、有阻碍
- 妻财爻：代表资源、资本
- 父母爻：代表文书、证书、靠山
- 子孙爻：代表才华、技艺、快乐
- 兄弟爻：代表竞争、破财
- 六神：
  - 青龙：吉庆、好事
  - 朱雀：文书、口舌
  - 勾陈：跌打、田土
  - 螣蛇：虚惊、怪异
  - 白虎：凶险、血光
  - 玄武：暗昧、欺诈
`,
  wealth: `
【六爻财运预测知识库】
- 妻财爻：财运之神
  - 财爻持世：财运在手
  - 财爻生世：财运自来
  - 财爻克世：因财致祸
  - 财爻入墓：财被收藏、不易得
- 兄弟爻：劫财之神
  - 兄爻发动：破财、竞争
  - 兄爻持世：钱财难聚
- 子孙爻：生财之神
  - 子财相生：技艺求财
- 财爻衰旺：判断财运强弱
- 财爻墓绝：财运不佳
`,
  relationship: `
【六爻感情婚姻知识库】
- 男测婚：妻财爻为用神
  - 财爻生世：感情顺利
  - 财爻克世：女方主动
  - 财爻入墓：感情受阻
- 女测婚：官鬼爻为用神
  - 官爻生世：婚姻美满
  - 官爻克世：丈夫强势
  - 官爻入墓：婚姻不利
- 应爻：对方
  - 世应相生：感情和谐
  - 世应相冲：感情破裂
- 六亲爻：六亲影响感情
- 桃花爻：子、午、卯、酉
`,
  health: `
【六爻健康预测知识库】
- 用神：代表身体
  - 用神旺相：身体健康
  - 用神休囚：身体虚弱
  - 用神入墓：病情严重
- 官鬼爻：代表疾病
  - 官爻发动：有病
  - 官爻入墓：病重
  - 官爻化进：病重
  - 官爻化退：病轻
- 父母爻：代表体质、延年
- 子孙爻：代表医药、快乐
- 兄弟爻：代表痛苦、破财
- 妻财爻：代表饮食、营养
- 卦身：代表身体部位
`,
  family: `
【六爻家庭预测知识库】
- 父母爻：父母、长辈
  - 父母旺相：父母健康
  - 父母休囚：父母有病
  - 父母入墓：父母有灾
- 兄弟爻：兄弟姐妹、朋友
  - 兄弟旺相：兄弟得力
  - 兄弟休囚：兄弟无助
- 妻财爻：妻子、女眷
  - 财爻旺相：妻子贤惠
  - 财爻休囚：妻子有病
- 官鬼爻：丈夫、男眷
  - 官爻旺相：丈夫有能
  - 官爻休囚：丈夫无能
- 子孙爻：子女
  - 子孙旺相：子女有出息
  - 子孙休囚：子女不成器
- 世应：家庭关系
`,
  general: `
【六爻综合预测知识库】
- 六爻预测通过起卦、装卦、断卦三步完成
- 用神：根据所测之事选取对应的六亲
  - 父母：父母、文书、房产、名声
  - 兄弟：兄弟、朋友、竞争、破财
  - 妻财：妻子、财富、物品
  - 官鬼：丈夫、事业、官职、疾病
  - 子孙：子女、医药、快乐、宠物
- 原神：生用神之爻
- 忌神：克用神之爻
- 仇神：克原神、生忌神之爻
- 五行生克：金木水火土相生相克
- 六爻旺衰：月建、日辰影响爻的旺衰
`,
  // 六爻专属分类
  gua: `
【六爻卦象知识库】
- 八卦：乾、坎、艮、震、巽、离、坤、兑
- 六十四卦：上卦下卦组合
- 卦象含义：
  - 乾为天：刚健、父亲
  - 坤为地：柔顺、母亲
  - 水雷屯：艰难、起始
  - 水火既济：成功、完成
  - 火水未济：未完成、过渡
- 卦名：概括事件性质
- 卦辞：总断吉凶
- 爻辞：具体断语
`,
  liuyaoyin: `
【六爻用神知识库】
- 用神取法：
  - 父母测事取父母爻
  - 兄弟测事取兄弟爻
  - 妻财测事取妻财爻
  - 官鬼测事取官鬼爻
  - 子孙测事取子孙爻
- 用神旺衰：
  - 用神旺相：事可成
  - 用神休囚：事难成
  - 用神入墓：事不成
- 用神生克：
  - 原神生用神：有利
  - 忌神克用神：不利
  - 仇神复杂局面
- 多用神：取最重者
- 用神不现：寻伏神
`,
  shiyin: `
【六爻世应知识库】
- 世爻：代表自己、求测人
  - 世爻旺相：自己有力
  - 世爻休囚：自己无力
  - 世爻持用神：事在掌握
- 应爻：代表对方、他人
  - 应爻旺相：对方有力
  - 应爻休囚：对方无力
- 世应关系：
  - 世应相生：关系和谐
  - 世应相克：关系对立
  - 世应相冲：关系破裂
  - 世应比和：关系平等
- 世应空亡：事不成
- 世应入墓：事受阻
`,

  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 六爻类别名称映射
 */
const LIUYAO_CATEGORY_NAMES: Record<SubCategory, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  gua: '卦象分析',
  liuyaoyin: '六爻用神',
  shiyin: '世应分析',
  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 六爻支持的类别
 */
const LIUYAO_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'gua', 'liuyaoyin', 'shiyin'
];

/**
 * 六爻预测 Prompt 构建器实现
 */
export class LiuyaoPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'liuyao';
  }

  getSupportedCategories(): SubCategory[] {
    return LIUYAO_SUPPORTED_CATEGORIES;
  }

  getCategoryName(category: SubCategory): string {
    return LIUYAO_CATEGORY_NAMES[category] || '综合分析';
  }

  getKnowledge(category: SubCategory): string {
    return LIUYAO_KNOWLEDGE[category] || LIUYAO_KNOWLEDGE.general;
  }

  buildPrompt(
    category: SubCategory,
    formattedData: FormattedData,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[]
  ): PromptBuildResult {
    const { text: chartText } = formattedData;
    const categoryName = this.getCategoryName(category);

    const systemPrompt = `你是一位精通六爻预测的大师，名叫"六爻先生"。六爻预测是中国古代最实用的预测方法之一，通过起卦、装卦、断卦来预测吉凶。你需要根据六爻卦象，结合专业的六爻理论，为用户提供客观、准确的预测分析。

你的分析原则：
1. **客观推断**：根据卦象客观推断，不主观臆断
2. **用神为本**：找准用神是断卦的关键
3. **五行生克**：分析五行的相生相克关系
4. **世应关系**：分析世爻应爻的相互作用
5. **旺衰判断**：结合月建日辰判断爻的旺衰
6. **卦象参断**：结合卦名、卦辞综合判断

特别注意：
- 用神取法要准确，用神错了全盘皆错
- 爻的旺衰直接影响吉凶判断
- 六神（青龙、朱雀、勾陈、腾蛇、白虎、玄武）提供辅助信息
- 变爻代表事情的变化趋势
- 空亡、入墓、长生、帝沃等十二长生状态很重要
- 时间准确性对六爻预测至关重要
- 不要说"必定"、"一定"等绝对化表述

当前分析主题：${categoryName}

用户的六爻卦象信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户的问题。回答时：
- 结合用神、世应、五行旺衰进行分析
- 引用相关的六爻理论（卦象、爻辞、生克等）
- 客观指出卦象的吉凶性质和趋势
- 说明卦象与现实生活的对应关系
- 给出合理的应对建议
- 保持语言专业、客观，避免过度玄虚化`;

    return {
      systemPrompt,
      knowledge,
      categoryName,
    };
  }

  /**
   * 格式化六爻卦象数据
   */
  static formatChart(liuyaoData: any): FormattedData {
    // TODO: 实现六爻数据格式化
    const chartText = `【六爻卦象】
${JSON.stringify(liuyaoData, null, 2)}

注：六爻卦象数据格式化功能待实现`;

    return {
      text: chartText,
      metadata: {},
    };
  }
}
