/**
 * 其他占卜方法 Prompt 构建器（简化版）
 * 包含八字、奇门遁甲、六爻、手相
 */

import type { PromptBuilder, PromptBuildResult, PromptPersonalization } from './index';
import type { SubCategory, ChatMessage } from '../types/index.js';

function buildPersonalizationBlock(personalization?: PromptPersonalization): string {
  const lines: string[] = [];
  if (typeof personalization?.currentYear === 'number') {
    lines.push(`当前年份：${personalization.currentYear}年`);
  }
  if (typeof personalization?.currentAge === 'number') {
    lines.push(`命主当前年龄：${personalization.currentAge}岁`);
  }
  if (lines.length === 0) return '';

  return `【个性化信息】
${lines.join('\n')}
分析时请优先回答用户“当前阶段”关切。`;
}

/**
 * 八字类别名称
 */
const BAZI_CATEGORY_NAMES: Record<string, string> = {
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
};

/**
 * 八字 Prompt 构建器
 */
export class BaziPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'bazi';
  }

  getSupportedCategories(): SubCategory[] {
    return ['career', 'wealth', 'relationship', 'health', 'family', 'general', 'geju', 'yongshen', 'shishen', 'dayun'];
  }

  getCategoryName(category: SubCategory): string {
    return BAZI_CATEGORY_NAMES[category] || '综合分析';
  }

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const personalizationBlock = buildPersonalizationBlock(personalization);

    const systemPrompt = `你是一位精通八字命理的命理大师，名叫"八字先生"。你需要根据用户的八字四柱，结合专业的命理知识，为用户提供客观、专业、实事求是的命理分析。

当前分析主题：${categoryName}

${personalizationBlock}

用户的八字信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户问题，保持专业、客观的态度。`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    return { system: systemPrompt, messages, categoryName };
  }
}

/**
 * 奇门遁甲类别名称
 */
const QIMEN_CATEGORY_NAMES: Record<string, string> = {
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
};

/**
 * 奇门遁甲 Prompt 构建器
 */
export class QimenPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'qimen';
  }

  getSupportedCategories(): SubCategory[] {
    return ['career', 'wealth', 'relationship', 'health', 'family', 'general', 'jushi', 'men', 'xing', 'shen'];
  }

  getCategoryName(category: SubCategory): string {
    return QIMEN_CATEGORY_NAMES[category] || '综合分析';
  }

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const personalizationBlock = buildPersonalizationBlock(personalization);

    const systemPrompt = `你是一位精通奇门遁甲的预测大师，名叫"奇门先生"。奇门遁甲是中国古代最高层次的预测学，被誉为"帝王之学"。你需要根据奇门盘式，结合专业的奇门遁甲理论，为用户提供客观、专业的预测分析。

当前分析主题：${categoryName}

${personalizationBlock}

用户的奇门盘式信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户问题，保持专业、客观的态度。`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    return { system: systemPrompt, messages, categoryName };
  }
}

/**
 * 六爻类别名称
 */
const LIUYAO_CATEGORY_NAMES: Record<string, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  gua: '卦象分析',
  liuyaoyin: '六爻用神',
  shiyin: '世应分析',
};

/**
 * 六爻 Prompt 构建器
 */
export class LiuyaoPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'liuyao';
  }

  getSupportedCategories(): SubCategory[] {
    return ['career', 'wealth', 'relationship', 'health', 'family', 'general', 'gua', 'liuyaoyin', 'shiyin'];
  }

  getCategoryName(category: SubCategory): string {
    return LIUYAO_CATEGORY_NAMES[category] || '综合分析';
  }

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const personalizationBlock = buildPersonalizationBlock(personalization);

    const systemPrompt = `你是一位精通六爻预测的大师，名叫"六爻先生"。六爻预测是中国古代最实用的预测方法之一，通过起卦、装卦、断卦来预测吉凶。你需要根据六爻卦象，结合专业的六爻理论，为用户提供客观、准确的预测分析。

当前分析主题：${categoryName}

${personalizationBlock}

用户的六爻卦象信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户问题，保持专业、客观的态度。`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    return { system: systemPrompt, messages, categoryName };
  }
}

/**
 * 梅花易数类别名称
 */
const MEIHUA_CATEGORY_NAMES: Record<string, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合占测',
};

/**
 * 梅花易数 Prompt 构建器
 */
export class MeihuaPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'meihua';
  }

  getSupportedCategories(): SubCategory[] {
    return ['career', 'wealth', 'relationship', 'health', 'family', 'general'];
  }

  getCategoryName(category: SubCategory): string {
    return MEIHUA_CATEGORY_NAMES[category] || '综合占测';
  }

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const personalizationBlock = buildPersonalizationBlock(personalization);

    const systemPrompt = `你是一位精通梅花易数的占卜大师，名叫"梅花先生"。梅花易数以邵雍时间起卦法为核心，通过体用生克关系断定吉凶。

当前占测主题：${categoryName}

${personalizationBlock}

【卦象信息】
${chartText}

【相关知识库】
${knowledge}

【解读要求】
1. 首先解释上下卦的五行与自然象（天、泽、火、雷等）
2. 说明体卦与用卦的位置（动爻决定）
3. 根据体用关系（用生体/比和/体克用/体生用/用克体）给出吉凶判断
4. 结合问题的具体情境（${categoryName}）给出实用建议
5. 语言专业但通俗，避免过于抽象

请根据以上卦象信息回答用户的占测问题，保持专业、客观的态度。`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    return { system: systemPrompt, messages, categoryName };
  }
}

/**
 * 手相类别名称
 */
const PALMISTRY_CATEGORY_NAMES: Record<string, string> = {
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
};

/**
 * 手相 Prompt 构建器
 */
export class PalmistryPromptBuilder implements PromptBuilder {
  getType(): string {
    return 'palmistry';
  }

  getSupportedCategories(): SubCategory[] {
    return ['career', 'wealth', 'relationship', 'health', 'family', 'general', 'xian', 'qiu', 'zhi', 'wen'];
  }

  getCategoryName(category: SubCategory): string {
    return PALMISTRY_CATEGORY_NAMES[category] || '综合分析';
  }

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const personalizationBlock = buildPersonalizationBlock(personalization);

    const systemPrompt = `你是一位精通手相学的相术大师，名叫"手相先生"。手相学是通过观察手掌的纹路、丘位、手指等特征来分析人的性格和命运的学问。你需要根据手相特征，结合专业的手相学理论，为用户提供客观、准确的分析。

当前分析主题：${categoryName}

${personalizationBlock}

用户的手相特征信息：
${chartText}

相关知识库参考：
${knowledge}

请根据以上信息回答用户问题，保持专业、客观的态度。`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    return { system: systemPrompt, messages, categoryName };
  }
}
