/**
 * 紫微斗数 Prompt 构建器
 */

import type { PromptBuilder, PromptBuildResult, FormattedData } from './index';
import type { SubCategory, ChatMessage } from '@/types';
import { formatChartToReadableText, getCurrentMajorPeriod, getCurrentYearlyFortune } from '../chartService';
import type { ZiweiChart } from '@/types';

/**
 * 紫微斗数知识库
 */
const ZIWEI_KNOWLEDGE: Record<SubCategory, string> = {
  // 通用分类
  career: `
【事业运势分析知识库】
- 官禄宫主管事业发展、工作运势
- 命宫主星影响个人能力和发展方向
- 迁移宫关系到外出发展和机遇
- 紫微星在官禄宫主贵显，适合公职或管理岗位
- 武曲星主财星，在官禄宫适合金融、业务工作
- 天机星主智慧，适合策划、研究类工作
- 太阳星主公开露面，适合服务大众、传播工作
- 四化飞星对事业影响重大，化禄主机遇，化权主权力，化科主名声，化忌主阻碍
- 大限流年对事业运势有重要影响，需结合当前年龄分析
`,
  wealth: `
【财运分析知识库】
- 财帛宫主管正财、偏财
- 武曲星为财星，在财帛宫主财运亨通
- 禄存星为财禄之星，主稳定收入
- 化禄入财帛宫主财源广进
- 天府星主库藏，在财帛宫主积蓄丰厚
- 贪狼星在财帛宫主横财、偏财运
- 地空地劫在财帛宫主破财，需注意理财
- 命宫、官禄宫也影响财运来源
`,
  relationship: `
【感情运势知识库】
- 夫妻宫主管婚姻、感情
- 红鸾天喜主桃花运
- 廉贞、贪狼为桃花星
- 天姚、咸池为次桃花
- 夫妻宫有吉星主感情顺遂
- 夫妻宫有煞星主感情波折
- 化忌入夫妻宫主感情阻碍
- 命宫、迁移宫的桃花星也影响异性缘
- 需结合命宫性格特质分析感情模式
`,
  health: `
【健康运势知识库】
- 疾厄宫主管健康、疾病
- 命宫主星也反映体质特点
- 火星、铃星主急性病症
- 天刑主手术、外伤
- 廉贞在疾厄宫注意心血管
- 太阴在疾厄宫女性注意妇科
- 巨门在疾厄宫注意肠胃
- 五行局影响体质偏向（水二局、木三局、金四局、土五局、火六局）
- 福德宫也影响精神状态和心理健康
`,
  family: `
【家庭运势知识库】
- 父母宫主管父母缘分、长辈关系
- 子女宫主管子女缘分
- 兄弟宫主管兄弟姐妹、朋友关系
- 田宅宫主管家庭、不动产
- 福德宫主管祖德、精神状态
- 六亲宫位的吉凶影响家庭和谐
- 化忌飞入六亲宫位主该六亲缘薄
- 需结合命宫性格分析家庭关系处理方式
`,
  general: `
【综合运势知识库】
- 命宫是全盘核心，主管性格、能力、一生运势
- 身宫是后天努力方向
- 大限流年影响特定时期运势
- 三方四正是分析重点（命宫的三方四正：财帛宫、官禄宫、迁移宫）
- 吉星多主顺遂，煞星多主波折
- 四化飞星贯穿全盘分析
- 命主身主是个人特质的重要参考
- 需结合当前年龄、大限、流年进行时空定位分析
`,

  // 紫微专属分类
  ziweigeju: `
【紫微格局分析知识库】
- 紫微独坐：领导格局，个性独立
- 紫府同宫：贵格，双星同宫气势增强
- 府相朝垣：稳定格局，适合公职
- 杀破狼格：变动格局，人生起伏较大
- 日月同宫：日月并明，才貌双全
- 巨日格：口才佳，适合传播行业
- 机月同梁格：智慧格局，适合理财、策划
- 刑囚夹印：需注意官非口舌
- 左右昌曲：文贵格局，学业佳
`,
  sixi: `
【四化飞星分析知识库】
- 化禄：代表财富、机遇、缘分（禄存）
- 化权：代表权力、控制、竞争（破军）
- 化科：代表名声、学业、贵人（文昌）
- 化忌：代表欠债、阻滞、变动（贪狼，也称忌星）

四化飞入各宫的影响：
- 化禄入命：性格开朗，机遇多
- 化权入命：个性强势，喜掌控
- 化科入命：重名声，爱面子
- 化忌入命：个性较忧愁，易欠人情

四化与宫位组合的影响需要结合星曜性质分析
`,
  dashun: `
【大运流年分析知识库】
- 大限：10年一运，每宫主管10年运势
- 大限的吉凶取决于该宫位星曜配置
- 大限天干影响原命盘四化的重新飞星
- 流年：每年的运势，一年一宫
- 流年四化：流年天干产生的四化飞星
- 本命、大限、流年三层叠加分析最为准确
- 需重点关注本命化忌在流年的位置
`,

  // 其他占卜方法的占位符（未实现）
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 紫微斗数类别名称映射
 */
const ZIWEI_CATEGORY_NAMES: Record<SubCategory, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  ziweigeju: '紫微格局',
  sixi: '四化飞星',
  dashun: '大运分析',
  // 其他占卜方法的占位符
  geju: '', yongshen: '', shishen: '', dayun: '',
  jushi: '', men: '', xing: '', shen: '',
  gua: '', liuyaoyin: '', shiyin: '',
  xian: '', qiu: '', zhi: '', wen: '',
};

/**
 * 紫微斗数支持的类别
 */
const ZIWEI_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'ziweigeju', 'sixi', 'dashun'
];

/**
 * 紫微斗数 Prompt 构建器实现
 */
export class ZiweiPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'ziwei';
  }

  getSupportedCategories(): SubCategory[] {
    return ZIWEI_SUPPORTED_CATEGORIES;
  }

  getCategoryName(category: SubCategory): string {
    return ZIWEI_CATEGORY_NAMES[category] || '综合分析';
  }

  getKnowledge(category: SubCategory): string {
    return ZIWEI_KNOWLEDGE[category] || ZIWEI_KNOWLEDGE.general;
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

    // 构建时空定位上下文（如果有大限流年信息）
    let ageContext = '';
    if (metadata?.currentInfo) {
      const currentInfo = metadata.currentInfo as ReturnType<typeof getCurrentMajorPeriod>;
      if (currentInfo) {
        ageContext = `
【当前运势时空定位】
当前年龄: ${currentInfo.age}岁（虚岁）
当前大限: ${currentInfo.palace.name} (${currentInfo.startAge}-${currentInfo.endAge}岁，还剩${currentInfo.yearsRemaining}年)
大限主星: ${currentInfo.palace.majorStars.map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`).join('、') || '无主星'}
大限天干地支: ${currentInfo.palace.stem}${currentInfo.palace.branch}
大限四化: ${currentInfo.palace.transformations.map(t => `${t.star}${t.type}`).join('、') || '无'}
`;
      }
    }

    if (metadata?.yearlyInfo) {
      const yearlyInfo = metadata.yearlyInfo as ReturnType<typeof getCurrentYearlyFortune>;
      if (yearlyInfo && yearlyInfo.yearlyMutagens) {
        const { lu, quan, ke, ji } = yearlyInfo.yearlyMutagens;
        const mutagens = [
          lu && `化禄: ${lu}`,
          quan && `化权: ${quan}`,
          ke && `化科: ${ke}`,
          ji && `化忌: ${ji}`,
        ].filter(Boolean).join('、');

        ageContext += `
当前流年: ${yearlyInfo.year}年
流年四化: ${mutagens || '无'}
`;
      }
    }

    const systemPrompt = `你是一位精通紫微斗数的命理分析师，名叫"天机大师"。你需要根据用户的命盘信息，结合专业的紫微斗数知识，为用户提供客观、专业、实事求是的命理分析。

你的分析原则：
1. **客观中立**：实事求是地分析命盘，不回避问题，不过度美化
2. **成本意识**：说明实现某种结果需要付出的代价和成本，不要只说好的一面
3. **专业准确**：使用准确的命理术语，避免"王者"、"贵气"、"巾帼英雄"等浮夸修辞
4. **结构分析**：重点说明命盘的结构特点，而非预测结果；是"可能性"而非"宿命"
5. **直面困难**：对不利格局直接指出问题所在，不要急于给"化解方法"；让用户清醒认识现实
6. **避免过度承诺**：不要说"一定能成功"、"必有大成"等绝对化表述

特别注意：
- 星曜在庙旺利陷的状态**直接影响吉凶**，不要忽略亮度
- 化忌、陷宫、煞星同宫等不利因素，要明确指出其**严重性和实际影响**
- 不要为了安慰而过度解读吉象，要说明"好格局也需要条件配合才能发挥"
- 对"中晚年享清福"等说法要谨慎，要看命盘是否真正支持
- 职业建议要加**前提条件**，不是什么都适合

当前分析主题：${categoryName}

${ageContext}

用户的命盘信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户的问题。回答时：
- 结合命盘中的具体星曜位置、亮度、四化进行分析
- 引用相关的命理理论，但要说明理论的适用条件
- 客观指出格局的优劣，不回避矛盾和困难
- 说明实现目标需要的条件和付出的成本
- 对不利因素要明确说明影响，不要立即跟上"化解方法"
- 保持语言专业、客观，避免过度文学化和情绪化表达`;

    return {
      systemPrompt,
      knowledge,
      categoryName,
    };
  }

  /**
   * 格式化紫微斗数命盘数据
   */
  static formatChart(chart: ZiweiChart): FormattedData {
    const chartText = formatChartToReadableText(chart);
    const currentInfo = getCurrentMajorPeriod(chart);
    const yearlyInfo = getCurrentYearlyFortune(chart);

    return {
      text: chartText,
      metadata: {
        currentInfo,
        yearlyInfo,
      },
    };
  }
}
