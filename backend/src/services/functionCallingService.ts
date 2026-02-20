import type { PromptData } from '../types/graph.js';
import type {
  FunctionCallingAction,
  FunctionCallingInput,
  FunctionCallingResult,
  FunctionCallingTerminationReason,
} from '../types/functionCalling.js';
import type { ToolCallRequest, ToolCallResponse } from '../tools/types.js';
import { toolRegistry } from '../tools/registry.js';

type AICaller = (promptData: PromptData) => Promise<string>;

/**
 * Function-calling 循环服务
 * 负责模型决策、工具调用、观察回填与最终答案收敛
 */
export class FunctionCallingService {
  static async run(input: FunctionCallingInput, callAI: AICaller): Promise<FunctionCallingResult> {
    if (!input.config.enabled) {
      const answer = await callAI(input.promptData);
      return {
        answer,
        trace: {
          enabled: false,
          iterations: 0,
          toolCalls: [],
          terminationReason: 'disabled',
          fallbackUsed: false,
        },
      };
    }

    const toolCalls: ToolCallResponse[] = [];
    let iterations = 0;

    try {
      for (let index = 0; index < input.config.maxIterations; index += 1) {
        iterations += 1;

        if (toolCalls.length >= input.config.maxToolCalls) {
          return this.fallback(
            input,
            callAI,
            toolCalls,
            iterations,
            'max_tool_calls'
          );
        }

        const decisionRaw = await callAI(this.buildDecisionPromptData(input, toolCalls, iterations));
        const action = this.parseAction(decisionRaw);

        if (!action) {
          return this.fallback(input, callAI, toolCalls, iterations, 'parse_error');
        }

        if (action.action === 'final') {
          return {
            answer: action.answer,
            trace: {
              enabled: true,
              iterations,
              toolCalls,
              terminationReason: 'final',
              fallbackUsed: false,
            },
          };
        }

        const toolResponse = await this.executeToolAction(action, input);
        toolCalls.push(toolResponse);
      }

      return this.fallback(input, callAI, toolCalls, iterations, 'max_iterations');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Function calling failed';
      return {
        answer: `抱歉，自动工具调用流程异常：${message}`,
        trace: {
          enabled: true,
          iterations,
          toolCalls,
          terminationReason: 'error',
          fallbackUsed: true,
        },
      };
    }
  }

  private static buildDecisionPromptData(
    input: FunctionCallingInput,
    toolCalls: ToolCallResponse[],
    iteration: number
  ): PromptData {
    const system = `${input.promptData.system}

【Function Calling 执行约束】
你可以在回答前调用工具补充事实信息。
你本轮必须只输出一个 JSON 对象，禁止输出 Markdown、解释文字、代码块。

JSON 格式二选一：
1) 调用工具
{"action":"tool","toolName":"knowledge_search","parameters":{"query":"..."},"reason":"调用原因"}
2) 输出最终答案
{"action":"final","answer":"最终回答","reason":"为何现在可直接回答"}

可用工具：${input.config.allowedTools.join(', ')}
`;

    const observationText = this.formatToolObservations(toolCalls);
    const userInstruction = [
      `当前是第 ${iteration} 轮决策。`,
      `最多轮数：${input.config.maxIterations}，最多工具调用：${input.config.maxToolCalls}。`,
      observationText ? `已获得工具观察：\n${observationText}` : '当前尚无工具观察。',
      '请根据现有信息输出下一步 JSON 动作。',
    ].join('\n\n');

    return {
      system,
      messages: [
        ...input.promptData.messages,
        { role: 'user', content: userInstruction },
      ],
    };
  }

  private static parseAction(raw: string): FunctionCallingAction | null {
    const json = this.extractJson(raw);
    if (!json || typeof json !== 'object') {
      return null;
    }

    const action = (json as { action?: unknown }).action;
    if (action === 'tool') {
      const toolName = (json as { toolName?: unknown }).toolName;
      if (typeof toolName !== 'string' || !toolName.trim()) {
        return null;
      }
      const parameters = (json as { parameters?: unknown }).parameters;
      return {
        action: 'tool',
        toolName: toolName.trim(),
        parameters: this.normalizeParameters(parameters),
        reason: this.extractOptionalString((json as { reason?: unknown }).reason),
      };
    }

    if (action === 'final') {
      const answer = (json as { answer?: unknown }).answer;
      if (typeof answer !== 'string' || !answer.trim()) {
        return null;
      }
      return {
        action: 'final',
        answer: answer.trim(),
        reason: this.extractOptionalString((json as { reason?: unknown }).reason),
      };
    }

    return null;
  }

  private static async executeToolAction(
    action: Extract<FunctionCallingAction, { action: 'tool' }>,
    input: FunctionCallingInput
  ): Promise<ToolCallResponse> {
    if (!input.config.allowedTools.includes(action.toolName)) {
      return {
        toolName: action.toolName,
        result: {
          success: false,
          error: `Tool not allowed: ${action.toolName}`,
          toolName: action.toolName,
        },
        observation: `工具不可用：${action.toolName}`,
      };
    }

    const request = this.applyToolDefaults(
      {
        toolName: action.toolName,
        parameters: action.parameters ?? {},
        reasoning: action.reason,
        context: input.toolContext,
      },
      input
    );

    try {
      return await toolRegistry.execute(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      return {
        toolName: action.toolName,
        result: {
          success: false,
          error: message,
          toolName: action.toolName,
        },
        observation: `工具执行失败：${message}`,
      };
    }
  }

  private static applyToolDefaults(
    request: ToolCallRequest,
    input: FunctionCallingInput
  ): ToolCallRequest {
    if (request.toolName !== 'knowledge_search') {
      return request;
    }

    const parameters = { ...request.parameters };
    const context = input.toolContext;

    if (!('destinyType' in parameters) && context?.destinyType) {
      parameters.destinyType = context.destinyType;
    }
    if (!('subCategory' in parameters) && context?.subCategory) {
      parameters.subCategory = context.subCategory;
    }
    if (!('query' in parameters) && context?.userMessage) {
      parameters.query = context.userMessage;
    }
    if (!('chartText' in parameters) && context?.chartText) {
      parameters.chartText = context.chartText;
    }
    if (!('keywords' in parameters) && context?.userMessage) {
      parameters.keywords = this.extractKeywords(context.userMessage);
    }

    return {
      ...request,
      parameters,
    };
  }

  private static async fallback(
    input: FunctionCallingInput,
    callAI: AICaller,
    toolCalls: ToolCallResponse[],
    iterations: number,
    reason: FunctionCallingTerminationReason
  ): Promise<FunctionCallingResult> {
    const fallbackPrompt: PromptData = {
      system: input.promptData.system,
      messages: [
        ...input.promptData.messages,
        {
          role: 'user',
          content: [
            '请直接给出最终答案。',
            '如果有工具观察结果，请优先吸收后再作答。',
            this.formatToolObservations(toolCalls) || '没有工具观察结果。',
          ].join('\n\n'),
        },
      ],
    };

    const answer = await callAI(fallbackPrompt);

    return {
      answer,
      trace: {
        enabled: true,
        iterations,
        toolCalls,
        terminationReason: reason,
        fallbackUsed: true,
      },
    };
  }

  private static formatToolObservations(toolCalls: ToolCallResponse[]): string {
    if (toolCalls.length === 0) {
      return '';
    }

    return toolCalls
      .map((call, index) => {
        return `#${index + 1} ${call.toolName}\n${call.observation}`;
      })
      .join('\n\n');
  }

  private static extractJson(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || trimmed;

    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      // ignore
    }

    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    const maybeJson = candidate.slice(start, end + 1);
    try {
      return JSON.parse(maybeJson) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private static normalizeParameters(parameters: unknown): Record<string, unknown> {
    if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
      return parameters as Record<string, unknown>;
    }
    return {};
  }

  private static extractOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private static extractKeywords(text: string): string[] {
    const tokens = text
      .split(/[，。！？、,\s]+/g)
      .map(token => token.trim())
      .filter(token => token.length >= 2)
      .slice(0, 6);
    return tokens;
  }
}
