/**
 * Backend Prompt 构建器系统
 * 支持多种占卜方法的 prompt 构建
 */

import type { SubCategory, ChatMessage } from '../types/index.js';
import { ZiweiPromptBuilder } from './ziwei.js';
import { BaziPromptBuilder, QimenPromptBuilder, LiuyaoPromptBuilder, PalmistryPromptBuilder, MeihuaPromptBuilder } from './others.js';

/**
 * Prompt 构建结果
 */
export interface PromptBuildResult {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  categoryName: string;
}

export interface PromptPersonalization {
  currentYear?: number;
  currentAge?: number;
}

/**
 * Prompt 构建器接口
 * 每个占卜方法需要实现这个接口
 */
export interface PromptBuilder {
  /**
   * 获取占卜方法类型
   */
  getType(): string;

  /**
   * 构建系统 prompt
   */
  buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[],
    personalization?: PromptPersonalization,
  ): PromptBuildResult;

  /**
   * 获取类别名称
   */
  getCategoryName(category: SubCategory): string;

  /**
   * 获取支持的类别列表
   */
  getSupportedCategories(): SubCategory[];
}

/**
 * Prompt 构建器工厂
 */
class PromptBuilderFactory {
  private builders: Map<string, PromptBuilder> = new Map();

  constructor() {
    // 自动注册所有构建器
    this.register(new ZiweiPromptBuilder());
    this.register(new BaziPromptBuilder());
    this.register(new QimenPromptBuilder());
    this.register(new LiuyaoPromptBuilder());
    this.register(new PalmistryPromptBuilder());
    this.register(new MeihuaPromptBuilder());
  }

  /**
   * 注册构建器
   */
  register(builder: PromptBuilder): void {
    this.builders.set(builder.getType(), builder);
  }

  /**
   * 根据类型获取构建器
   */
  getBuilder(type: string): PromptBuilder | undefined {
    return this.builders.get(type);
  }

  /**
   * 根据类别获取构建器
   * @param category - 分析类别
   * @returns 对应的构建器，默认返回紫微斗数构建器
   */
  getBuilderByCategory(category: SubCategory): PromptBuilder {
    // 紫微斗数专属类别
    if (['ziweigeju', 'sixi', 'dashun'].includes(category)) {
      return this.builders.get('ziwei')!;
    }
    // 八字专属类别
    if (['geju', 'yongshen', 'shishen', 'dayun'].includes(category)) {
      return this.builders.get('bazi')!;
    }
    // 奇门遁甲专属类别
    if (['jushi', 'men', 'xing', 'shen'].includes(category)) {
      return this.builders.get('qimen')!;
    }
    // 六爻专属类别
    if (['gua', 'liuyaoyin', 'shiyin'].includes(category)) {
      return this.builders.get('liuyao')!;
    }
    // 手相专属类别
    if (['xian', 'qiu', 'zhi', 'wen'].includes(category)) {
      return this.builders.get('palmistry')!;
    }
    // 通用类别，默认返回紫微斗数
    return this.builders.get('ziwei')!;
  }

  /**
   * 获取所有已注册的构建器类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.builders.keys());
  }
}

// 导出单例实例
export const promptBuilderFactory = new PromptBuilderFactory();

// 导出各个构建器类
export { ZiweiPromptBuilder };
export { BaziPromptBuilder, QimenPromptBuilder, LiuyaoPromptBuilder, PalmistryPromptBuilder, MeihuaPromptBuilder };
