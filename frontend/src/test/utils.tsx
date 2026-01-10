import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * 自定义 render 函数，包含常用的 Provider
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * 创建 mock BirthInfo
 */
export function createMockBirthInfo() {
  return {
    year: 2000,
    month: 8,
    day: 16,
    hour: 12,
    gender: 'female' as const,
    isLunar: false,
  };
}

/**
 * 创建 mock ChatMessage
 */
export function createMockChatMessage(content: string, role: 'user' | 'assistant' = 'user') {
  return {
    id: `msg-${Date.now()}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

// 导出所有 testing-library 工具
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
