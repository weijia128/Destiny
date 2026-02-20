/**
 * 解析服务
 * 负责 AI 提示词构建和 AI 调用
 * 支持多个 AI Provider (Anthropic, MiniMax, DeepSeek)
 */

// 必须最先导入以确保环境变量被加载
import '../config/env.js';

import Anthropic from '@anthropic-ai/sdk';
import type { PromptData } from '../types/graph.js';
import type { SubCategory, ChatMessage, AIProvider, MiniMaxMessage } from '../types/index.js';
import type {
  FunctionCallingConfig,
  FunctionCallingResult,
  FunctionCallingToolContext,
} from '../types/functionCalling.js';
import { createMiniMaxClient } from '../clients/minimaxClient.js';
import { createDeepSeekClient, type DeepSeekClient } from '../clients/deepseekClient.js';
import { resolveFunctionCallingConfig } from '../config/functionCalling.js';
import { promptBuilderFactory } from '../prompts/index.js';
import { FunctionCallingService } from './functionCallingService.js';

/**
 * AI 提供者配置
 */
const MODEL_CONFIG = {
  anthropic: 'claude-sonnet-4-20250514',
  minimax: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
  deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
} as const;

/**
 * 默认 AI 提供者
 */
const DEFAULT_PROVIDER: AIProvider = 'deepseek';

/**
 * 解析服务类
 */
export class InterpretationService {
  private static anthropic: Anthropic | null = null;
  private static minimaxClient: ReturnType<typeof createMiniMaxClient>;
  private static deepseek: DeepSeekClient | null = null;
  private static provider: AIProvider = DEFAULT_PROVIDER;

  /**
   * 初始化服务
   */
  static initialize() {
    // 初始化 Anthropic 客户端
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (this.isValidApiKey(anthropicKey)) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    // 初始化 MiniMax 客户端
    const minimaxKey = process.env.MINIMAX_API_KEY;
    if (this.isValidApiKey(minimaxKey)) {
      this.minimaxClient = createMiniMaxClient();
    }

    // 初始化 DeepSeek 客户端
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (this.isValidApiKey(deepseekKey)) {
      this.deepseek = createDeepSeekClient();
    }

    // 确定使用的 provider
    this.provider = this.getAvailableProvider();

    const hasAnyKey = this.anthropic || this.minimaxClient || this.deepseek;
    if (!hasAnyKey) {
      console.warn('⚠️  No AI provider API keys configured, will use mock responses');
    } else {
      console.log(`🤖 Using AI provider: ${this.provider} (${MODEL_CONFIG[this.provider]})`);
    }
  }

  /**
   * 检查 API key 是否有效
   */
  private static isValidApiKey(key: string | undefined): boolean {
    if (!key) return false;
    // 检查是否是占位符或示例值
    const invalidPatterns = [
      'your_api_key_here',
      'your-key-here',
      'sk-ant-',
      'example',
      'dummy',
      'test',
    ];
    return !invalidPatterns.some(pattern => key.toLowerCase().includes(pattern));
  }

  /**
   * 获取可用的 AI Provider
   */
  private static getAvailableProvider(): AIProvider {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const minimaxKey = process.env.MINIMAX_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    const isValidAnthropicKey = this.isValidApiKey(anthropicKey);
    const isValidMinimaxKey = this.isValidApiKey(minimaxKey);
    const isValidDeepSeekKey = this.isValidApiKey(deepseekKey);

    console.log('🔑 API Key Status:', {
      anthropic: isValidAnthropicKey ? '✅ Valid' : '❌ Invalid/Missing',
      minimax: isValidMinimaxKey ? '✅ Valid' : '❌ Invalid/Missing',
      deepseek: isValidDeepSeekKey ? '✅ Valid' : '❌ Invalid/Missing',
    });

    // 优先使用配置的默认 provider
    if (DEFAULT_PROVIDER === 'minimax' && isValidMinimaxKey) return 'minimax';
    if (DEFAULT_PROVIDER === 'anthropic' && isValidAnthropicKey) return 'anthropic';
    if (DEFAULT_PROVIDER === 'deepseek' && isValidDeepSeekKey) return 'deepseek';

    // 回退到可用的 provider
    if (isValidMinimaxKey) return 'minimax';
    if (isValidDeepSeekKey) return 'deepseek';
    if (isValidAnthropicKey) return 'anthropic';

    console.warn('⚠️  No valid API keys found, will use mock responses');
    return 'anthropic'; // 默认返回，实际会使用 mock
  }

  /**
   * 获取当前使用的 provider
   */
  static getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * 构建 AI 分析提示词（使用新的 Prompt 构建系统）
   *
   * @param chartText - 命盘文本
   * @param category - 分析类别
   * @param knowledge - 知识库内容
   * @param userMessage - 用户消息
   * @param history - 对话历史
   * @returns 构建的提示词数据
   */
  static buildPrompt(
    chartText: string,
    category: SubCategory,
    knowledge: string,
    userMessage: string,
    history: ChatMessage[] = []
  ): PromptData {
    // 检查对话历史中是否包含已生成的报告
    const hasReportInHistory = history.some(m => m.role === 'system' && m.content.includes('【已生成的命盘分析报告】'));

    if (hasReportInHistory) {
      // 基于已生成报告的对话模式 - 使用简化 prompt
      const systemPrompt = `你是一位精通命理的分析师。

**重要：对话历史中已经包含了一份完整的命盘分析报告。**

你的任务是：
1. **基于已有的报告内容**回答用户的具体问题
2. **不要重新生成完整的报告**，而是针对用户的问题进行深入分析
3. 如果用户补充了个人信息（如职业、现状），请结合报告中的命盘分析给出针对性建议
4. 保持与报告风格一致：客观、专业、实事求是

回答时：
- 直接回答用户的问题，不要重复报告中的通用内容
- 如果用户提到职业、现状等具体信息，结合命盘特点进行个性化分析
- 保持专业、客观的语气
- 避免过度美化，要指出实际的问题和挑战`;

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

      return { system: systemPrompt, messages };
    }

    // 首次生成完整报告 - 使用新的 Prompt 构建系统
    const builder = promptBuilderFactory.getBuilderByCategory(category);
    return builder.buildPrompt(chartText, category, knowledge, userMessage, history);
  }

  /**
   * 调用 AI 生成回复（非流式）
   *
   * @param promptData - 提示词数据
   * @returns AI 生成的回复
   */
  static async callAI(promptData: PromptData): Promise<string> {
    if (this.provider === 'minimax' && this.minimaxClient) {
      try {
        const messages: MiniMaxMessage[] = [
          { role: 'system', content: promptData.system },
          ...promptData.messages,
        ];
        return await this.minimaxClient.chat(messages);
      } catch (error) {
        console.error('MiniMax API error:', error);
        return this.getMockResponse();
      }
    }

    if (this.provider === 'deepseek' && this.deepseek) {
      try {
        const messages = [
          { role: 'system' as const, content: promptData.system },
          ...promptData.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ];
        return await this.deepseek.chat(messages);
      } catch (error) {
        console.error('DeepSeek API error:', error);
        return this.getMockResponse();
      }
    }

    if (this.provider === 'anthropic' && this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: MODEL_CONFIG.anthropic,
          max_tokens: 4096,
          system: promptData.system,
          messages: promptData.messages,
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return content.text;
        }

        return '抱歉，无法生成回复，请稍后再试。';
      } catch (error) {
        console.error('Anthropic API error:', error);
        return this.getMockResponse();
      }
    }

    // 没有可用的 AI 客户端，返回模拟响应
    return this.getMockResponse();
  }

  /**
   * 基于 Function-calling 循环调用 AI（非流式）
   */
  static async callAIWithFunctionLoop(
    promptData: PromptData,
    options?: {
      config?: FunctionCallingConfig;
      toolContext?: FunctionCallingToolContext;
    }
  ): Promise<FunctionCallingResult> {
    const config = resolveFunctionCallingConfig(options?.config);

    return FunctionCallingService.run(
      {
        promptData,
        config,
        toolContext: options?.toolContext,
      },
      async (nextPromptData) => this.callAI(nextPromptData)
    );
  }

  /**
   * 流式调用 AI
   *
   * @param promptData - 提示词数据
   * @returns 异步生成器，每次生成一个文本块
   */
  static async *stream(promptData: PromptData): AsyncGenerator<string> {
    if (this.provider === 'minimax' && this.minimaxClient) {
      try {
        const messages: MiniMaxMessage[] = [
          { role: 'system', content: promptData.system },
          ...promptData.messages,
        ];

        for await (const chunk of this.minimaxClient.streamChat(messages)) {
          yield chunk;
        }
        return;
      } catch (error) {
        console.error('MiniMax streaming error:', error);
        const mock = this.getMockResponse();
        for (const char of mock) {
          yield char;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        return;
      }
    }

    if (this.provider === 'deepseek' && this.deepseek) {
      try {
        const messages = [
          { role: 'system' as const, content: promptData.system },
          ...promptData.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ];

        for await (const chunk of this.deepseek.streamChat(messages)) {
          yield chunk;
        }
        return;
      } catch (error) {
        console.error('DeepSeek streaming error:', error);
        const mock = this.getMockResponse();
        for (const char of mock) {
          yield char;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        return;
      }
    }

    if (this.provider === 'anthropic' && this.anthropic) {
      try {
        const stream = await this.anthropic.messages.stream({
          model: MODEL_CONFIG.anthropic,
          max_tokens: 4096,
          system: promptData.system,
          messages: promptData.messages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if ('text' in delta) {
              yield delta.text;
            }
          }
        }
        return;
      } catch (error) {
        console.error('Anthropic streaming error:', error);
        const mock = this.getMockResponse();
        for (const char of mock) {
          yield char;
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        return;
      }
    }

    // 没有可用的 AI 客户端，返回模拟响应
    const mock = this.getMockResponse();
    for (const char of mock) {
      yield char;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  /**
   * 获取模拟响应（无 API key 时使用）
   */
  private static getMockResponse(): string {
    return `根据您的命盘分析：

这是一个模拟的 AI 回复。要获得真正的命理分析，请在后端配置 AI Provider 的 API 密钥：

- Anthropic Claude: 设置 ANTHROPIC_API_KEY 环境变量
- MiniMax: 设置 MINIMAX_API_KEY 环境变量
- DeepSeek: 设置 DEEPSEEK_API_KEY 环境变量

配置后即可获得专业的紫微斗数命理分析。`;
  }
}

// 初始化服务
InterpretationService.initialize();
