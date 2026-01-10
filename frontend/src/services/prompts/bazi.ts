/**
 * 八字命理 Prompt 构建器
 */

import type { PromptBuilder, PromptBuildResult, FormattedData } from './index';
import type { SubCategory, ChatMessage } from '@/types';

/**
 * 八字命理知识库
 */
const BAZI_KNOWLEDGE: Record<SubCategory, string> = {
  // 通用分类
  career: `
【八字事业运势知识库】
- 月柱代表青年事业运，日柱代表中年事业运
- 正官、七杀：主管事业、权力、地位
  - 正官：正统事业、稳定工作、公职、管理
  - 七杀：开拓性事业、创业、冒险、军警
- 食神、伤官：才华、技能、创意
  - 食神：温和表达、艺术、餐饮、技艺
  - 伤官：锐意创新、设计、口才、表演
- 财星：资源、资本、商务
- 印星：学习、知识、证书、靠山
- 官印相生：事业稳步上升
- 食伤生财：技艺致富
- 杀印相生：威权创业
`,
  wealth: `
【八字财运知识库】
- 正财：固定收入、工资、稳健经营
- 偏财：投资、副业、横财、投机
- 财星定位：
  - 年财：祖产、继承
  - 月财：正财、工资
  - 日财：自己求财
  - 时财：晚年财、投资
- 财星得位：财运亨通
- 身强财旺：能担大财
- 身弱财旺：富屋贫人
- 比劫夺财：破财、竞争
- 食伤生财：技艺求财
- 官星护财：财源稳定
`,
  relationship: `
【八字感情婚姻知识库】
- 男命：财星为妻
  - 正财：正妻、稳重感情
  - 偏财：外缘、异性缘旺
- 女命：官杀为夫
  - 正官：正夫、稳定婚姻
  - 七杀：外缘、感情波折
- 日支：配偶宫
  - 日支逢冲：婚姻不稳
  - 日支相合：感情和谐
- 桃花星：子午卯酉
  - 桃花入命：异性缘旺
  - 桃花逢冲：感情风波
- 红艳煞：感情纠葛
- 伤官见官：婚姻不利（女命）
- 比劫争夫：感情竞争（女命）
`,
  health: `
【八字健康知识库】
- 五行对应五脏：
  - 木：肝胆、神经
  - 火：心脏、血液、眼睛
  - 土：脾胃、消化
  - 金：肺、呼吸系统、皮肤
  - 水：肾、泌尿、生殖系统
- 五行失衡对应的健康问题：
  - 木太旺或太弱：肝胆疾病
  - 火太旺或太弱：心血管问题
  - 土太旺或太弱：脾胃消化
  - 金太旺或太弱：呼吸系统
  - 水太旺或太弱：肾泌尿
- 冲克害：对应部位易受伤病
- 羊刃、伤官：易有手术、外伤
`,
  family: `
【八字家庭亲缘知识库】
- 年柱：祖辈、父母宫
- 月柱：父母、兄弟宫
- 日支：配偶宫
- 时柱：子女宫
- 六亲对应：
  - 男命：财为妻、官杀为子女、印星为母亲、比劫为兄弟
  - 女命：官杀为夫、食伤为子女、印星为母亲、比劫为兄弟
- 六亲强弱：
  - 六亲得位：与该亲缘分好
  - 六亲受冲克：与该亲缘分薄
- 六亲入库：六亲收藏、缘分内敛
- 六亲逢空：六亲缘淡
`,
  general: `
【八字综合分析知识库】
- 日干：代表命主本人
  - 日干旺衰：决定格局高低
  - 身强：能担财官，利于任事
  - 身弱：需印比生助，宜守不宜攻
- 月令：提纲、格局关键
- 用神：平衡命局最重要之神
- 喜忌神：有利与不利之神
- 格局高低：
  - 身强用官：贵格
  - 身强财旺：富格
  - 食神生财：富而有技
  - 杀印相生：贵而有权
- 调候：气候调和，寒暖燥湿适中
`,
  // 八字专属分类
  geju: `
【八字格局知识库】
- 正格：月令提纲取格
  - 正官格、正财格、印绶格、食神格等
- 变格：特殊格局
  - 从格：从杀、从财、从势、从儿
  - 化格：甲己化土、乙庚化金等
  - 专气格：曲直格、炎上格、稼穑格、从革格、润下格
- 建禄格：日主得月令之旺
- 羊刃格：阳干帝旺之地
- 魁罡格：辰戌丑未四日生
`,
  yongshen: `
【用神分析知识库】
- 用神：平衡命局最需要的五行
  - 身弱需印比生扶
  - 身强需食伤财官耗泄
- 喜神：生助用神之神
- 忌神：克制用神之神
- 仇神：克制喜神、生助忌神之神
- 用神取法：
  - 扶抑：弱扶之，强抑之
  - 调候：寒暖燥湿调之
  - 病药：命局有病，药之即愈
- 用神强弱：
  - 用神有力：格局高
  - 用神无力：格局低
`,
  shishen: `
【十神分析知识库】
- 十神根据日干与其他干支的关系而定
- 正官：克制我者（异性）- 贵气、地位
- 七杀：克制我者（同性）- 权威、压力
- 正财：我克者（异性）- 财富、节俭
- 偏财：我克者（同性）- 横财、慷慨
- 正印：生我者（异性）- 学识、靠山
- 偏印（枭神）：生我者（同性）- 敏锐、孤独
- 食神：我生者（异性）- 才华、享受
- 伤官：我生者（同性）- 叛逆、创新
- 比肩：同我者（异性）- 朋友、竞争
- 劫财：同我者（同性）- 冲动、冒险
- 十神组合含义复杂，需综合分析
`,
  dayun: `
【大运流年知识库】
- 大运：10年一步运，由月柱推演
  - 大运干支与原命局的组合影响运势
  - 大运为所喜之五行：运势顺遂
  - 大运为所忌之五行：运势坎坷
- 流年：每年的运势
  - 流年干支与原命局、大运的作用
  - 冲克：变动、变化
  - 合会：机遇、合作
- 岁运并临：大运与流年相同，影响加倍
- 伏吟：反吟、伏吟多不顺
- 流年用神：该年吉凶关键
`,

  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 八字类别名称映射
 */
const BAZI_CATEGORY_NAMES: Record<SubCategory, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  geju: '八字格局',
  yongshen: '用神分析',
  shishen: '十神分析',
  dayun: '大运流年',
  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 八字支持的类别
 */
const BAZI_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'geju', 'yongshen', 'shishen', 'dayun'
];

/**
 * 八字命理 Prompt 构建器实现
 */
export class BaziPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'bazi';
  }

  getSupportedCategories(): SubCategory[] {
    return BAZI_SUPPORTED_CATEGORIES;
  }

  getCategoryName(category: SubCategory): string {
    return BAZI_CATEGORY_NAMES[category] || '综合分析';
  }

  getKnowledge(category: SubCategory): string {
    return BAZI_KNOWLEDGE[category] || BAZI_KNOWLEDGE.general;
  }

  buildPrompt(
    category: SubCategory,
    formattedData: FormattedData,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[]
  ): PromptBuildResult {
    const { text: chartText, metadata } = formattedData;
    const categoryName = this.getCategoryName(category);

    const systemPrompt = `你是一位精通八字命理的命理大师，名叫"八字先生"。你需要根据用户的八字四柱，结合专业的命理知识，为用户提供客观、专业、实事求是的命理分析。

你的分析原则：
1. **客观中立**：实事求是地分析八字，不回避问题，不过度美化
2. **五行平衡**：重点分析五行强弱、用神喜忌、格局高低
3. **专业准确**：使用准确的命理术语（正官、七杀、食神、伤官等）
4. **因果关系**：说明命理与现实的对应关系，是"倾向性"而非"宿命"
5. **直面不足**：对不利组合（冲克害、用神受损等）明确指出影响
6. **避免宿命论**：八字显示的是先天倾向，后天努力可以改善

特别注意：
- 日主旺衰直接影响格局高低和用神取法
- 月令提纲是格局判断的关键
- 用神得力、格局清纯者为上格
- 五行失衡、冲克过多者需要特别注意
- 财官印食四吉神要得位，杀伤枭刃四凶神要制化
- 不要说"必定"、"一定"等绝对化表述

当前分析主题：${categoryName}

用户的八字信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户的问题。回答时：
- 结合八字的五行旺衰、格局特点进行分析
- 引用相关的命理理论（如用神、喜忌、格局等）
- 客观指出八字组合的优劣，不回避矛盾
- 说明命理与现实生活的对应关系
- 对不利因素要明确说明影响，给出改善方向
- 保持语言专业、客观，避免玄虚化表达`;

    return {
      systemPrompt,
      knowledge,
      categoryName,
    };
  }

  /**
   * 格式化八字命盘数据
   */
  static formatChart(baziData: any): FormattedData {
    // TODO: 实现八字数据格式化
    // 这里需要根据实际的八字数据结构来实现
    const chartText = `【八字命盘】
${JSON.stringify(baziData, null, 2)}

注：八字数据格式化功能待实现`;

    return {
      text: chartText,
      metadata: {},
    };
  }
}
