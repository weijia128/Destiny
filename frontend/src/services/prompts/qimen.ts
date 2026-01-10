/**
 * 奇门遁甲 Prompt 构建器
 */

import type { PromptBuilder, PromptBuildResult, FormattedData } from './index';
import type { SubCategory, ChatMessage } from '@/types';

/**
 * 奇门遁甲知识库
 */
const QIMEN_KNOWLEDGE: Record<SubCategory, string> = {
  // 通用分类
  career: `
【奇门遁甲事业运势知识库】
- 开门：事业宫、工作机遇、升迁
- 休门：休息、调整、适宜策划
- 生门：生财之道、业务发展
- 值符：领导、贵人、权力
- 九星组合：
  - 天乙：贵人、上级
  - 腾蛇：变动、心机
  - 太阴：隐私、暗中
  - 六合：合作、协调
- 值符临开门：事业顺利
- 腾蛇临开门：事业多变
`,
  wealth: `
【奇门遁甲财运知识库】
- 生门：财门、生财之路
- 开门：正财、固定收入
- 伤门：破财、投资风险
- 杜门：财源受阻
- 景门：信息财、名声财
- 八神影响：
  - 值符：财运亨通
  - 腾蛇：财来财去
  - 太阴：暗中求财
  - 六合：合作求财
  - 白虎：破财、竞争
  - 玄武：被骗、失财
  - 九地：积蓄、存财
  - 九天：拓展、发展
`,
  relationship: `
【奇门遁甲感情知识库】】
- 休门：感情休息、平稳
- 生门：感情发展、新生
- 杜门：感情受阻、不通
- 景门：感情多彩、浪漫
- 九星影响：
  - 天乙：贵人介绍
  - 腾蛇：感情多变
  - 太阴：暗中相恋
  - 六合：感情和谐
- 八神影响：
  - 值符：感情顺利
  - 腾蛇：感情纠纷
  - 六合：婚姻美满
  - 白虎：感情冲突
`,
  health: `
【奇门遁甲健康知识库】
- 休门：养生、康复
- 生门：生机、健康
- 死门：疾病、危险
- 伤门：外伤、手术
- 九星健康含义：
  - 天蓬：肾脏、泌尿
  - 天任：脾胃、消化
  - 天冲：肝脏、神经
  - 天辅：四肢、筋骨
  - 天英：心脏、血液
  - 天芮：疾病、病灶
  - 天柱：呼吸系统
  - 天心：心脑血管
  - 天禽：中宫、整体健康
`,
  family: `
【奇门遁甲家庭知识库】
- 休门：家庭和睦
- 开门：家庭开放、迎客
- 生门：家庭兴旺
- 九星影响家庭关系：
  - 天乙：长辈贵人
  - 天任：家庭责任
  - 天冲：家庭冲突
  - 天辅：家庭辅助
- 八神影响：
  - 六合：家庭和谐
  - 白虎：家庭矛盾
  - 玄武：家庭隐忧
  - 九地：家庭稳定
`,
  general: `
【奇门遁甲综合分析知识库】
- 奇门遁甲三要素：
  - 天盘：九星（天蓬、天任、天冲、天辅、天英、天芮、天柱、天心、天禽）
  - 地盘：八门（休、生、伤、杜、景、死、惊、开）
  - 人盘：八神（值符、腾蛇、太阴、六合、白虎、玄武、九地、九天）
- 局数：阳遁一至九局，阴遁一至九局
- 值符：当前时辰的主导星神
- 格局：星门神的组合格局
- 吉格：飞鸟跌穴、青龙回首等
- 凶格：白虎猖狂、青龙逃走等
`,
  // 奇门遁甲专属分类
  jushi: `
【奇门局数知识库】
- 阳遁局：冬至至夏至，阳气上升
  - 阳遁一局至九局，每个格局15天
- 阴遁局：夏至至冬至，阴气上升
  - 阴遁一局至九局，每个格局15天
- 定局方法：根据节气和时辰确定
- 局数影响整体运势走向
- 不同局数适合不同事务
`,
  men: `
【奇门八门知识库】
- 八门代表人事活动
- 休门（北方）：休息、养精蓄锐
- 生门（东北）：生财、发展
- 伤门（东方）：受伤、破坏
- 杜门（东南）：阻塞、不通
- 景门（南方）：景象、文书
- 死门（西南）：死亡、终结
- 惊门（西方）：惊恐、意外
- 开门（西北）：开启、机遇
- 八门吉凶：休、生、开为三吉门；死、惊、伤为三凶门；杜门为半吉半凶
`,
  xing: `
【奇门九星知识库】
- 九星代表天象和自然力量
- 天蓬（水星）：智慧、盗贼、阴谋
- 天任（土星）：担当、固执、忠厚
- 天冲（金星）：冲动、冲突、直率
- 天辅（木星）：辅助、文化、教育
- 天英（火星）：文采、血光、名声
- 天芮（土星）：疾病、柔弱、依附
- 天柱（金星）：刚直、破坏、支撑
- 天心（金星）：医疗、领导、仁慈
- 天禽（中宫）：稳重、包容、中心
- 九星吉凶：天乙、天心、天任为吉；天蓬、天芮、天英为凶
`,
  shen: `
【奇门八神知识库】
- 八神代表神灵和隐形力量
- 值符：主管、领导、贵人、大吉
- 腾蛇：变化、虚惊、纠纷、暧昧
- 太阴：隐私、暗中、女性、计谋
- 六合：和合、婚姻、合作、中介
- 白虎：凶猛、伤灾、官司、竞争
- 玄武：暗昧、欺骗、盗贼、暧昧
- 九地：稳定、积蓄、低调、防守
- 九天：升腾、发展、远行、高远
- 八神吉凶：值符、六合为吉；白虎、玄武为凶
`,

  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 奇门遁甲类别名称映射
 */
const QIMEN_CATEGORY_NAMES: Record<SubCategory, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  jushi: '局数分析',
  men: '八门分析',
  xing: '九星分析',
  shen: '八神分析',
  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 奇门遁甲支持的类别
 */
const QIMEN_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'jushi', 'men', 'xing', 'shen'
];

/**
 * 奇门遁甲 Prompt 构建器实现
 */
export class QimenPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'qimen';
  }

  getSupportedCategories(): SubCategory[] {
    return QIMEN_SUPPORTED_CATEGORIES;
  }

  getCategoryName(category: SubCategory): string {
    return QIMEN_CATEGORY_NAMES[category] || '综合分析';
  }

  getKnowledge(category: SubCategory): string {
    return QIMEN_KNOWLEDGE[category] || QIMEN_KNOWLEDGE.general;
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

    const systemPrompt = `你是一位精通奇门遁甲的预测大师，名叫"奇门先生"。奇门遁甲是中国古代最高层次的预测学，被誉为"帝王之学"。你需要根据奇门盘式，结合专业的奇门遁甲理论，为用户提供客观、专业的预测分析。

你的分析原则：
1. **客观中立**：实事求是地分析奇门盘式，不回避问题
2. **天地人合**：综合分析天盘九星、地盘八门、人盘八神的组合
3. **格局为本**：重点分析星门神的组合格局，判断吉凶
4. **时位结合**：结合问事时间和落宫位置进行判断
5. **直断吉凶**：明确指出格局的吉凶性质和影响程度
6. **化解有方**：对凶格给出合理的化解或应对建议

特别注意：
- 值符是当前时辰的主导，对整体局势影响最大
- 三奇六仪的配置影响格局层次
- 格局有吉有凶，要明确指出
- 飞盘、转盘等不同起局方法的解读略有差异
- 时间准确性对奇门预测至关重要
- 不要说"必定"、"一定"等绝对化表述

当前分析主题：${categoryName}

用户的奇门盘式信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户的问题。回答时：
- 结合九星、八门、八神的组合进行分析
- 引用相关的奇门遁甲理论（格局、吉凶、生克等）
- 客观指出格局的吉凶性质和影响
- 说明格局的现实对应和实际影响
- 对凶格给出合理的化解或应对建议
- 保持语言专业、客观，避免过度玄虚化`;

    return {
      systemPrompt,
      knowledge,
      categoryName,
    };
  }

  /**
   * 格式化奇门遁甲盘式数据
   */
  static formatChart(qimenData: any): FormattedData {
    // TODO: 实现奇门遁甲数据格式化
    const chartText = `【奇门遁甲盘式】
${JSON.stringify(qimenData, null, 2)}

注：奇门遁甲数据格式化功能待实现`;

    return {
      text: chartText,
      metadata: {},
    };
  }
}
