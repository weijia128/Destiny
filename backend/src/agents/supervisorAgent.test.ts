import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agentRegistry } from './registry.js';
import { buildDispatch, dispatchAnalyze, dispatchStream } from './supervisorAgent.js';
import type { SubAgent, SubAgentInput, SubAgentOutput, V2AnalyzeRequest } from './types.js';
import type { DestinyType, SubCategory, BirthInfo } from '../types/index.js';

const birthInfo: BirthInfo = {
  year: 1990,
  month: 1,
  day: 15,
  hour: 10,
  gender: 'male',
  isLunar: false,
};

function createStubAgent(destinyType: DestinyType): {
  agent: SubAgent;
  getLastInput: () => SubAgentInput | null;
} {
  let lastInput: SubAgentInput | null = null;

  const agent: SubAgent = {
    name: `${destinyType}-stub`,
    destinyType,
    description: 'stub agent for tests',
    getSupportedCategories: () => ['general'],
    canHandle: () => true,
    generateChart: async () => 'stub-chart',
    analyze: async (input: SubAgentInput): Promise<SubAgentOutput> => {
      lastInput = input;
      return {
        destinyType,
        subCategory: input.subCategory,
        analysis: 'ok',
        confidence: 1,
        metadata: {
          chartSummary: '',
          knowledgeUsed: [],
          executionTimeMs: 1,
        },
      };
    },
    analyzeStream: async function* (input: SubAgentInput): AsyncGenerator<string> {
      lastInput = input;
      yield 'chunk';
    },
  };

  return {
    agent,
    getLastInput: () => lastInput,
  };
}

describe('SupervisorAgent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-18T08:00:00Z'));
    (agentRegistry as any).agents.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatchAnalyze 应注入 currentYear 与 currentAge', async () => {
    const { agent, getLastInput } = createStubAgent('bazi');
    agentRegistry.register(agent);

    const request: V2AnalyzeRequest = {
      birthInfo,
      userMessage: '测试问题',
      history: [],
      preferredTypes: ['bazi'],
      subCategory: 'general' as SubCategory,
    };

    const dispatch = buildDispatch(request);
    const result = await dispatchAnalyze(request, dispatch);

    expect(result.length).toBe(1);
    expect(getLastInput()).toBeTruthy();
    expect(getLastInput()!.currentYear).toBe(2026);
    expect(getLastInput()!.currentAge).toBe(36);
    expect(getLastInput()!.functionCalling?.enabled).toBe(true);
  });

  it('dispatchStream 应注入 currentYear 与 currentAge', async () => {
    const { agent, getLastInput } = createStubAgent('ziwei');
    agentRegistry.register(agent);

    const request: V2AnalyzeRequest = {
      birthInfo,
      userMessage: '测试流式',
      history: [],
      preferredTypes: ['ziwei'],
      subCategory: 'general' as SubCategory,
    };

    const dispatch = buildDispatch(request);
    const chunks: string[] = [];

    for await (const chunk of dispatchStream(request, dispatch)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(1);
    expect(getLastInput()).toBeTruthy();
    expect(getLastInput()!.currentYear).toBe(2026);
    expect(getLastInput()!.currentAge).toBe(36);
    expect(getLastInput()!.functionCalling?.enabled).toBe(true);
  });

  it('dispatchAnalyze 应透传 function-calling 配置', async () => {
    const { agent, getLastInput } = createStubAgent('meihua');
    agentRegistry.register(agent);

    const request: V2AnalyzeRequest = {
      birthInfo,
      userMessage: '测试 function calling',
      history: [],
      preferredTypes: ['meihua'],
      subCategory: 'general' as SubCategory,
      enableFunctionCalling: false,
      maxFunctionIterations: 2,
      maxToolCalls: 1,
      allowedTools: ['knowledge_search'],
    };

    const dispatch = buildDispatch(request);
    await dispatchAnalyze(request, dispatch);

    expect(getLastInput()).toBeTruthy();
    expect(getLastInput()!.functionCalling).toEqual({
      enabled: false,
      maxIterations: 2,
      maxToolCalls: 1,
      allowedTools: ['knowledge_search'],
    });
  });
});
