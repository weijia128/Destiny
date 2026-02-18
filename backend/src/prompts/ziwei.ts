/**
 * 紫微斗数 Prompt 构建器（后端版本）
 */

import type { PromptBuilder, PromptBuildResult } from './index';
import type { SubCategory, ChatMessage } from '../types/index.js';
import type { PromptPersonalization } from './index';

/**
 * 紫微斗数类别名称映射
 */
const ZIWEI_CATEGORY_NAMES: Record<string, string> = {
  career: '事业运势',
  wealth: '财运分析',
  relationship: '感情姻缘',
  health: '健康运势',
  family: '家庭亲缘',
  general: '综合分析',
  ziweigeju: '紫微格局',
  sixi: '四化飞星',
  dashun: '大运分析',
};

const ZIWEI_CATEGORY_GUIDANCE: Record<string, string> = {
  career: '重点看官禄宫主星、四化入官禄、命宫与官禄宫互动、迁移宫对事业场景的影响。',
  wealth: '重点看财帛宫主星、化禄化忌对财帛宫的作用、田宅宫与资产沉淀能力。',
  relationship: '重点看夫妻宫主星、化禄化忌入夫妻宫、命宫与夫妻宫对照关系。',
  health: '重点看疾厄宫主星、四化入疾厄宫、命盘五行局对体质倾向的影响。',
  family: '重点看父母宫、兄弟宫、子女宫三宫主星与四化，分析家庭支持与责任结构。',
  general: '重点看命宫主星、五行局、当前大限与命宫主轴的整体协同。',
  ziweigeju: '重点识别紫微格局类型（如紫府同宫、日月并明等）及其成立条件。',
  sixi: '重点分析化禄、化权、化科、化忌的来源星、落宫与对宫联动关系。',
  dashun: '重点看当前大限宫位、大限四化及对宫牵动，评估阶段性主题。',
};

/**
 * 紫微斗数支持的类别
 */
const ZIWEI_SUPPORTED_CATEGORIES: SubCategory[] = [
  'career', 'wealth', 'relationship', 'health', 'family', 'general',
  'ziweigeju', 'sixi', 'dashun'
];

/**
 * 紫微斗数 Prompt 构建器实现（后端版本）
 * 后端版本更简洁，因为数据格式化已经在前端完成
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

  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult {
    const categoryName = this.getCategoryName(category);
    const categoryGuidance = ZIWEI_CATEGORY_GUIDANCE[category] || ZIWEI_CATEGORY_GUIDANCE.general;
    const personalizationLines: string[] = [];
    if (typeof personalization?.currentYear === 'number') {
      personalizationLines.push(`当前年份：${personalization.currentYear}年`);
    }
    if (typeof personalization?.currentAge === 'number') {
      personalizationLines.push(`命主当前年龄：${personalization.currentAge}岁`);
    }
    if (personalizationLines.length > 0) {
      personalizationLines.push('分析时请结合当前阶段，不要脱离当前流年语境。');
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
本次分析重点：${categoryGuidance}

${personalizationLines.length > 0 ? `【个性化信息】
${personalizationLines.join('\n')}
` : ''}

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

    // 构建消息历史
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    return {
      system: systemPrompt,
      messages,
      categoryName,
    };
  }
}
