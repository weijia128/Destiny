/**
 * 手相占卜 Prompt 构建器
 */

import type { PromptBuilder, PromptBuildResult, FormattedData } from './index';
import type { SubCategory, ChatMessage } from '@/types';
import type { PalmReading } from '@/types';

/**
 * 手相占卜知识库
 */
const PALMISTRY_KNOWLEDGE: Record<SubCategory, string> = {
  // 通用分类
  career: `
【手相事业运势知识库】
- 事业线（命运线）：
  - 起自月丘：事业起步早
  - 起自掌心：中年事业有成
  - 深长清晰：事业稳定
  - 断续岛纹：事业多变
- 智慧线：
  - 长而分叉：多才多艺，适合创意工作
  - 短而直：务实专注，适合技术工作
  - 向上弯曲：野心勃勃，适合管理工作
- 太阳线（成功线）：
  - 清晰深长：事业成功，名气大
  - 无太阳线：事业平凡
- 指甲形状：
  - 方形：务实，适合工程、财务
  - 圆形：灵活，适合艺术、社交
  - 锥形：创意，适合设计、策划
`,
  wealth: `
【手相财运知识库】
- 财富线（太阳线）：
  - 清晰深长：财运亨通，横财多
  - 起自掌心：中年发财
  - 分叉向上：多处财源
- 金星丘（拇指根部）：
  - 饱满有力：财运佳，理财能力强
  - 扁平无力：财运一般
- 月丘（手腕外侧）：
  - 饱满：有投资头脑
  - 过于发达：投机倾向
- 小指：
  - 长而直：善于理财
  - 短而弯：不善理财
- 手掌厚度：
  - 厚实：能积财
  - 薄弱：难存钱
`,
  relationship: `
【手相感情婚姻知识库】
- 感情线：
  - 长而清晰：感情丰富，婚姻美满
  - 短而浅：感情淡薄
  - 分叉向上：理想主义，要求高
  - 分叉向下：现实理性
  - 岛纹：感情波折，第三者
- 婚姻线（小指根下横纹）：
  - 一条深长：婚姻美满，白头偕老
  - 多条短浅：多次感情经历
  - 岛纹：婚姻不顺
- 感情线起点：
  - 食指下：重感情，易动情
  - 指缝间：感情理性
- 丘位：
  - 金星丘饱满：热情主动
  - 月丘饱满：浪漫多情
- 桃花线：斜线横切感情线
`,
  health: `
【手相健康知识库】
- 生命线：
  - 深长清晰：体质强，长寿
  - 短而浅：体质弱
  - 链状：体质差，多病
  - 岛纹：生病或意外
- 头脑线：
  - 深长清晰：心理健康
  - 短而浅：思维简单
  - 下垂：想象力丰富，易精神紧张
- 健康线：
  - 无健康线：身体健康（最佳）
  - 清晰深长：注意健康
  - 链状：体质虚弱
- 指甲：
  - 光滑圆润：健康
  - 纵纹：神经衰弱
  - 横沟：重病或营养不良
- 丘位：
  - 各丘饱满：精力充沛
  - 扁平：精力不足
`,
  family: `
【手相家庭知识库】
- 家庭线：生命线内侧细线
  - 清晰：家庭和睦
  - 多条：家人关系密切
  - 无：家庭关系一般
- 子女线：小指下方垂直线
  - 深长清晰：子女有出息
  - 多条：子女多
  - 短浅：子女缘分薄
- 父母线：生命线起点横线
  - 清晰：与父母关系好
  - 多条：受父母影响大
- 丘位：
  - 第一火星丘平原：与兄弟姐妹关系好
  - 月丘发达：重视家庭
- 手型：
  - 方型手：家庭观念重
  - 圆型手：家庭观念淡
`,
  general: `
【手相综合分析知识库】
- 手型分类：
  - 方型手：务实、稳重、踏实
  - 圆型手：灵活、善变、社交
  - 锥型手：创意、艺术、理想
  - 哲学手：思考、理性、分析
  - 精神手：敏感、灵性、直觉
- 掌纹三大主线：
  - 生命线：体质、活力、健康
  - 智慧线（头脑线）：思维、性格、能力
  - 感情线：情感、婚姻、人际关系
- 丘位（手掌肉垫）：
  - 金星丘（拇指根）：爱情、热情、生命力
  - 木星丘（食指根）：野心、权力、领导
  - 土星丘（中指根）：责任、学习、严肃
  - 太阳丘（无名指根）：艺术、名声、成功
  - 水星丘（小指根）：沟通、商业、科学
  - 月丘（手腕外侧）：想象、直觉、旅行
  - 第一火星丘：勇气、行动、冒险
  - 第二火星丘：毅力、坚持、抵抗
  - 掌心平原（平原）：理性、平衡、务实
- 手指：代表思维方式和性格特质
- 指甲：代表健康状态和性格特点
`,
  // 手相专属分类
  xian: `
【手相掌纹知识库】
- 生命线：起自拇指和食指之间，环绕掌根
  - 长度：长于智慧线为长，短于智慧线为短
  - 深度：深者为强，浅者为弱
  - 形状：直线、曲线、链状、岛纹
- 智慧线：起自食指和拇指之间，横向延伸
  - 长度：长至掌侧边为长，短于掌心为短
  - 形状：直、弯、下垂
  - 分叉：单叉、双叉、多叉
- 感情线：起自小指下方，横向延伸
  - 长度：长至食指下为长，短至中指下为短
  - 形状：直、弯、上弯、下弯
  - 分叉：向上、向下、多叉
- 事业线（命运线）：起自掌心，向上延伸
  - 起点：月丘、掌心、腕横纹
  - 终点：中指根、食指根
  - 形状：直、弯、断续
`,
  qiu: `
【手相丘位知识库】
- 金星丘（拇指根）：爱情、热情、生命力、音乐
  - 发达：热情、活力、艺术天赋
  - 扁平：冷漠、乏味
- 木星丘（食指根）：野心、权力、领导、宗教
  - 发达：领导力、野心、权威
  - 扁平：缺乏野心
- 土星丘（中指根）：责任、学习、农业、冷静
  - 发达：责任感、学习力、严肃
  - 扁平：轻浮
- 太阳丘（无名指根）：艺术、名声、成功、财富
  - 发达：艺术天赋、名声
  - 扁平：平凡
- 水星丘（小指根）：沟通、商业、科学、医学
  - 发达：口才、商业头脑
  - 扁平：不善沟通
- 月丘（手腕外侧）：想象、直觉、旅行、神秘
  - 发达：想象力、直觉力
  - 过度：幻想、逃避
- 第一火星丘：勇气、行动、冒险
  - 发达：勇敢、行动力
  - 过度：冲动
- 第二火星丘：毅力、坚持、抵抗
  - 发达：毅力、坚定
  - 过度：固执
`,
  zhi: `
【手相手指知识库】
- 拇指：意志力、领导力、自我
  - 长而有力：意志坚定、领导力强
  - 短而弱：意志薄弱、易受影响
  - 第一节长：意志坚强
  - 第二节长：思维能力强
- 食指：野心、权力、自尊
  - 长于无名指：野心大
  - 短于无名指：野心小
- 中指：责任、学习、严肃
  - 长：责任感强、好学
  - 短：缺乏责任感
- 无名指：艺术、名声、财富
  - 长于食指：艺术天赋、追求名声
  - 短于食指：艺术天赋一般
- 小指：沟通、商业、性
  - 长：善于沟通、商业头脑
  - 短：不善沟通
- 手指比例：各手指长度关系反映性格特质
- 指节：指节长短反映思考方式和执行力
`,
  wen: `
【手相纹理知识库】
- 主线：生命线、智慧线、感情线
- 辅线：
  - 事业线（命运线）：掌心纵向线
  - 太阳线（成功线、财富线）：无名指下纵向线
  - 健康线：掌心横向或斜向细线
  - 婚姻线：小指根下横向短线
  - 子女线：小指下方纵向细线
  - 家庭线：生命线内侧细线
  - 旅行线：掌边缘横向或斜向线
  - 直觉线：月丘斜向智慧线的弧线
- 纹理特征：
  - 深度：深者为强，浅者为弱
  - 长度：长者为好，短者为弱
  - 形状：直线、曲线、断续、岛纹、十字纹、星纹
  - 颜色：红色（活跃）、白色（淡弱）、黄色（多病）
- 特殊符号：
  - 十字纹：阻碍、困难
  - 星纹：突出、成功或意外
  - 岛纹：中断、分离、变故
  - 三角纹：特殊才能、保护
`,

  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
};

/**
 * 手相类别名称映射
 */
const PALMISTRY_CATEGORY_NAMES: Record<SubCategory, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  xian: '掌纹线路',
  qiu: '掌丘分析',
  zhi: '手指特征',
  wen: '纹理细节',
  // 其他占卜方法的占位符
  ziweigeju: '', sixi: '', dashun: '',
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
};

/**
 * 手相支持的类别
 */
const PALMISTRY_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'xian', 'qiu', 'zhi', 'wen'
];

/**
 * 手相占卜 Prompt 构建器实现
 */
export class PalmistryPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'palmistry';
  }

  getSupportedCategories(): SubCategory[] {
    return PALMISTRY_SUPPORTED_CATEGORIES;
  }

  getCategoryName(category: SubCategory): string {
    return PALMISTRY_CATEGORY_NAMES[category] || '综合分析';
  }

  getKnowledge(category: SubCategory): string {
    return PALMISTRY_KNOWLEDGE[category] || PALMISTRY_KNOWLEDGE.general;
  }

  buildPrompt(
    category: SubCategory,
    formattedData: FormattedData,
    knowledge: string,
    _userMessage: string,
    _history: ChatMessage[]
  ): PromptBuildResult {
    const { text: chartText } = formattedData;
    const categoryName = this.getCategoryName(category);

    const systemPrompt = `你是一位精通手相学的相术大师，名叫"手相先生"。手相学是通过观察手掌的纹路、丘位、手指等特征来分析人的性格和命运的学问。你需要根据手相特征，结合专业的手相学理论，为用户提供客观、准确的分析。

你的分析原则：
1. **客观观察**：根据手相特征客观分析，不主观臆断
2. **综合判断**：综合手型、掌纹、丘位、手指等多方面信息
3. **纹理为本**：掌纹是手相分析的核心依据
4. **左右对比**：男左女右，左右手综合分析
5. **性格优先**：手相主要反映性格特质，命运是性格的结果
6. **趋吉避凶**：指出优势，提醒劣势，给出改善建议

特别注意：
- 掌纹三大主线（生命线、智慧线、感情线）是分析核心
- 丘位的饱满程度反映该方面的能量强弱
- 手型决定基本性格倾向
- 手指长度和比例反映思维方式和能力
- 指甲形状和颜色反映健康状态
- 手掌厚度和弹性反映活力和耐力
- 手相显示的是先天倾向和性格特质，后天可以改善
- 不要说"必定"、"一定"等绝对化表述

当前分析主题：${categoryName}

用户的手相特征信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户的问题。回答时：
- 结合手型、掌纹、丘位、手指等特征综合分析
- 引用相关的手相学理论（掌纹含义、丘位特征等）
- 客观指出手相反映的性格特质和倾向性
- 说明手相与现实生活的对应关系
- 对不利特征给出改善建议
- 保持语言专业、客观，避免迷信化表达`;

    return {
      systemPrompt,
      knowledge,
      categoryName,
    };
  }

  /**
   * 格式化手相数据
   */
  static formatReading(reading: PalmReading): FormattedData {
    const lines: string[] = [];

    // 基本信息
    lines.push('----------基本信息----------');
    lines.push(`命主性别：${reading.birthInfo.gender === 'male' ? '男' : '女'}`);
    lines.push(`出生日期：${reading.birthInfo.year}年${reading.birthInfo.month}月${reading.birthInfo.day}日`);
    lines.push(`分析时间：${new Date(reading.createdAt).toLocaleString('zh-CN')}`);

    // 手相特征
    if (reading.features && reading.features.length > 0) {
      lines.push('\n----------手相特征----------');
      reading.features.forEach((feature, index) => {
        const sideLabel = feature.side === 'left' ? '左手' : feature.side === 'right' ? '右手' : '双手';
        const typeLabel = {
          line: '线条',
          mount: '丘位',
          mark: '标记',
          finger: '手指'
        }[feature.type];
        const strengthLabel = {
          strong: '强',
          medium: '中',
          weak: '弱'
        }[feature.strength];

        lines.push(`\n特征${index + 1}：${feature.name}`);
        lines.push(`类型：${typeLabel}`);
        lines.push(`位置：${sideLabel}`);
        lines.push(`强度：${strengthLabel}`);
        lines.push(`描述：${feature.description}`);
        lines.push(`含义：${feature.meaning}`);
      });
    }

    // 各方面分析
    lines.push('\n----------各方面分析----------');
    if (reading.personalityAnalysis) {
      lines.push(`\n性格特质：\n${reading.personalityAnalysis}`);
    }
    if (reading.careerAnalysis) {
      lines.push(`\n事业运势：\n${reading.careerAnalysis}`);
    }
    if (reading.wealthAnalysis) {
      lines.push(`\n财运分析：\n${reading.wealthAnalysis}`);
    }
    if (reading.relationshipAnalysis) {
      lines.push(`\n感情运势：\n${reading.relationshipAnalysis}`);
    }
    if (reading.healthAnalysis) {
      lines.push(`\n健康运势：\n${reading.healthAnalysis}`);
    }

    // 总体分析
    if (reading.overallAnalysis) {
      lines.push(`\n----------总体分析----------`);
      lines.push(reading.overallAnalysis);
    }

    // 建议
    if (reading.recommendations && reading.recommendations.length > 0) {
      lines.push(`\n----------建议----------`);
      reading.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec}`);
      });
    }

    return {
      text: lines.join('\n'),
      metadata: {},
    };
  }
}
