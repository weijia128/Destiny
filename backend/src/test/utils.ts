import type { BirthInfo, ChatMessage, AnalysisCategory } from '../types/index.js';

/**
 * 创建 mock BirthInfo
 */
export function createMockBirthInfo(): BirthInfo {
  return {
    year: 2000,
    month: 8,
    day: 16,
    hour: 12,
    gender: 'female',
    isLunar: false,
  };
}

/**
 * 创建 mock ChatMessage
 */
export function createMockChatMessage(
  content: string,
  role: 'user' | 'assistant' | 'system' = 'user'
): ChatMessage {
  return {
    role,
    content,
  };
}

/**
 * 创建 mock 命盘文本
 */
export function createMockChartText(): string {
  return `
【紫微斗数命盘】
【基本信息】
性别：女
阳历：2000-08-16
阴历：二〇〇〇年七月十七
时辰：午时

【命宫】壬子
主星：紫微(庙)、天机(旺)
辅星：文昌
化禄：紫微
  `.trim();
}

/**
 * 延迟执行（用于测试异步）
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建 mock AI 响应
 */
export function createMockAIResponse(): string {
  return '根据您的命盘分析，您的事业运势呈现上升趋势...';
}
