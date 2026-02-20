import { describe, it, expect } from 'vitest';
import { FunctionCallingService } from './functionCallingService.js';
import type { PromptData } from '../types/graph.js';

const basePrompt: PromptData = {
  system: '你是命理分析师。',
  messages: [{ role: 'user', content: '帮我分析事业运。' }],
};

describe('FunctionCallingService', () => {
  it('禁用时应直接返回单次 AI 回复', async () => {
    let callCount = 0;

    const result = await FunctionCallingService.run(
      {
        promptData: basePrompt,
        config: {
          enabled: false,
          maxIterations: 3,
          maxToolCalls: 2,
          allowedTools: ['knowledge_search'],
        },
      },
      async () => {
        callCount += 1;
        return 'direct-answer';
      }
    );

    expect(callCount).toBe(1);
    expect(result.answer).toBe('direct-answer');
    expect(result.trace.enabled).toBe(false);
    expect(result.trace.terminationReason).toBe('disabled');
  });

  it('应支持“工具调用 -> 最终回答”的完整循环', async () => {
    const responses = [
      '{"action":"tool","toolName":"calendar_almanac","parameters":{"date":"2026-02-19"},"reason":"补充日期信息"}',
      '{"action":"final","answer":"根据黄历信息，今日宜稳健推进事业计划。"}',
    ];

    const result = await FunctionCallingService.run(
      {
        promptData: basePrompt,
        config: {
          enabled: true,
          maxIterations: 4,
          maxToolCalls: 2,
          allowedTools: ['calendar_almanac'],
        },
      },
      async () => responses.shift() || '{"action":"final","answer":"fallback"}'
    );

    expect(result.trace.enabled).toBe(true);
    expect(result.trace.terminationReason).toBe('final');
    expect(result.trace.fallbackUsed).toBe(false);
    expect(result.trace.toolCalls.length).toBe(1);
    expect(result.trace.toolCalls[0].toolName).toBe('calendar_almanac');
    expect(result.trace.toolCalls[0].result.success).toBe(true);
    expect(result.answer).toContain('黄历信息');
  });

  it('解析失败时应回退到最终回答模式', async () => {
    let callCount = 0;
    const responses = ['this-is-not-json', 'fallback-final-answer'];

    const result = await FunctionCallingService.run(
      {
        promptData: basePrompt,
        config: {
          enabled: true,
          maxIterations: 3,
          maxToolCalls: 2,
          allowedTools: ['calendar_almanac'],
        },
      },
      async () => {
        callCount += 1;
        return responses.shift() || 'fallback-final-answer';
      }
    );

    expect(callCount).toBe(2);
    expect(result.trace.terminationReason).toBe('parse_error');
    expect(result.trace.fallbackUsed).toBe(true);
    expect(result.answer).toBe('fallback-final-answer');
  });

  it('达到 maxToolCalls 时应提前结束并回退', async () => {
    let callCount = 0;
    const responses = [
      '{"action":"tool","toolName":"calendar_almanac","parameters":{"date":"2026-02-19"}}',
      'max-tools-fallback-answer',
    ];

    const result = await FunctionCallingService.run(
      {
        promptData: basePrompt,
        config: {
          enabled: true,
          maxIterations: 5,
          maxToolCalls: 1,
          allowedTools: ['calendar_almanac'],
        },
      },
      async () => {
        callCount += 1;
        return responses.shift() || 'max-tools-fallback-answer';
      }
    );

    expect(callCount).toBe(2);
    expect(result.trace.toolCalls.length).toBe(1);
    expect(result.trace.terminationReason).toBe('max_tool_calls');
    expect(result.trace.fallbackUsed).toBe(true);
    expect(result.answer).toBe('max-tools-fallback-answer');
  });
});
