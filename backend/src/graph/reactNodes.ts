import type { GraphStateUpdate } from '../types/graph.js';
import { toolRegistry } from '../tools/registry.js';
import { InterpretationService } from '../services/interpretationService.js';

/**
 * ReAct 思考节点
 * 让 AI 决定是否需要调用工具，以及调用哪个工具
 */
export async function reactReasoningNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🧠 ReAct: AI 思考中...');

  const { chartText, category, history, toolResults, reasoning, toolCallCount, maxToolCalls } = state;

  // 构建思考提示词
  const thoughtPrompt = buildThoughtPrompt(chartText, category, history, toolResults, reasoning);

  try {
    // 调用 AI 进行推理
    const aiResponse = await InterpretationService.callAI({
      system: buildReActSystemPrompt(),
      messages: [{ role: 'user', content: thoughtPrompt }],
    });

    // 解析 AI 的决策
    const decision = parseAIDecision(aiResponse);

    console.log(`🧠 ReAct 决策:`, decision);

    // 记录思考过程
    const newReasoning = [
      ...(reasoning || []),
      `思考: ${decision.thought}`,
    ];

    // 检查是否需要调用工具
    if (decision.needsTool && toolCallCount! < maxToolCalls!) {
      return {
        reasoning: newReasoning,
        reactPhase: 'action',
        toolCalls: [
          ...(state.toolCalls || []),
          {
            toolName: decision.toolName!,
            parameters: decision.parameters!,
            reasoning: decision.thought,
          },
        ],
        toolCallCount: ((toolCallCount as number) || 0) + 1,
      };
    } else {
      // 不需要工具或达到最大调用次数，生成最终答案
      return {
        reasoning: newReasoning,
        reactPhase: 'final',
      };
    }
  } catch (error) {
    console.error('ReAct reasoning error:', error);
    return {
      reasoning: [...(reasoning || []), `思考出错: ${error}`],
      reactPhase: 'error',
      error: error instanceof Error ? error.message : 'Reasoning failed',
    };
  }
}

/**
 * 构建 ReAct 系统提示词
 */
function buildReActSystemPrompt(): string {
  const toolsList = toolRegistry.formatForAI();

  return `你是一位精通命理的分析师，具备使用工具的能力。

**工作模式：ReAct (Reasoning + Acting)**

你需要遵循以下思考流程：

1. **理解问题**: 分析用户的问题和命盘信息
2. **检索知识**: 决定是否需要搜索知识库
3. **外部信息**: 决定是否需要查询外部信息（如黄历）
4. **综合分析**: 结合所有信息给出分析

**可用工具：**

${toolsList}

**输出格式：**

如果需要调用工具：
\`\`\`
需要: 是
工具: tool_name
参数: {"param1": "value1", "param2": "value2"}
思考: [你的推理过程]
\`\`\`

如果不需要工具（已有足够信息）：
\`\`\`
需要: 否
思考: [你的推理过程]
最终答案: [直接回答用户]
\`\`\`

**重要约束：**
- 最多调用 5 次工具
- 工具调用应该有明确的目的，不要滥用
- 优先使用已有知识，必要时再调用工具
- 思考过程要清晰、有逻辑`;
}

/**
 * 构建思考提示词
 */
function buildThoughtPrompt(
  chartText: string | undefined,
  category: string | undefined,
  history: any[] | undefined,
  toolResults: any[] | undefined,
  reasoning: string[] | undefined
): string {
  let prompt = '';

  // 添加命盘信息
  if (chartText) {
    prompt += `【命盘信息】\n${chartText}\n\n`;
  }

  // 添加分析类别
  if (category) {
    prompt += `【分析类别】${category}\n\n`;
  }

  // 添加之前的工具调用结果
  if (toolResults && toolResults.length > 0) {
    prompt += '【已获取的信息】\n';
    toolResults.forEach((result, index) => {
      prompt += `\n--- 工具调用 ${index + 1}: ${result.toolName} ---\n`;
      prompt += result.observation;
    });
    prompt += '\n';
  }

  // 添加之前的思考过程
  if (reasoning && reasoning.length > 0) {
    prompt += '【之前的思考】\n';
    reasoning.forEach((thought, index) => {
      prompt += `${index + 1}. ${thought}\n`;
    });
    prompt += '\n';
  }

  // 添加用户问题
  if (history && history.length > 0) {
    const lastMessage = history[history.length - 1];
    prompt += `【用户问题】\n${lastMessage.content}\n`;
  }

  prompt += '\n请根据以上信息，决定下一步行动。';

  return prompt;
}

/**
 * 解析 AI 决策
 */
function parseAIDecision(response: string): {
  needsTool: boolean;
  toolName?: string;
  parameters?: Record<string, unknown>;
  thought: string;
  finalAnswer?: string;
} {
  // 尝试解析结构化输出
  const needsToolMatch = response.match(/需要[：:]\s*(是|否)/i);
  const needsTool = needsToolMatch ? needsToolMatch[1].includes('是') : false;

  const toolNameMatch = response.match(/工具[：:]\s*(\w+)/);
  const toolName = toolNameMatch ? toolNameMatch[1] : undefined;

  const paramsMatch = response.match(/参数[：:]\s*(\{[^}]+\})/s);
  const parameters = paramsMatch ? JSON.parse(paramsMatch[1]) : undefined;

  const thoughtMatch = response.match(/思考[：:]\s*(.+?)(?=\n需要|工具|参数|最终答案|$)/s);
  const thought = thoughtMatch ? thoughtMatch[1].trim() : response;

  const finalAnswerMatch = response.match(/最终答案[：:]\s*(.+)$/s);
  const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : undefined;

  return {
    needsTool,
    toolName,
    parameters,
    thought,
    finalAnswer,
  };
}

/**
 * ReAct 工具调用节点
 * 执行 AI 决定的工具调用
 */
export async function reactToolCallNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🔧 ReAct: 执行工具调用...');

  const { toolCalls } = state;

  if (!toolCalls || toolCalls.length === 0) {
    return {
      reactPhase: 'error',
      error: 'No tool calls to execute',
    };
  }

  // 获取最新的工具调用请求
  const latestCall = toolCalls[toolCalls.length - 1];

  try {
    // 查找工具
    const tool = toolRegistry.get(latestCall.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${latestCall.toolName}`);
    }

    console.log(`🔧 执行工具: ${latestCall.toolName}`, latestCall.parameters);

    // 执行工具
    const result = await tool.handler(latestCall.parameters);

    // 格式化观察结果
    const observation = formatToolObservation(result);

    console.log(`✅ 工具执行完成: ${latestCall.toolName}`);

    return {
      toolResults: [
        ...(state.toolResults || []),
        {
          toolName: latestCall.toolName,
          result,
          observation,
        },
      ],
      reactPhase: 'observation',
    };
  } catch (error) {
    console.error('Tool execution error:', error);
    return {
      toolResults: [
        ...(state.toolResults || []),
        {
          toolName: latestCall.toolName,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Tool execution failed',
            toolName: latestCall.toolName,
          },
          observation: `工具执行出错: ${error}`,
        },
      ],
      reactPhase: 'observation', // 继续循环，让 AI 知道出错
    };
  }
}

/**
 * 格式化工具观察结果
 */
function formatToolObservation(result: any): string {
  if (!result.success) {
    return `工具执行失败: ${result.error}`;
  }

  if (result.data?.formatted) {
    return result.data.formatted;
  }

  return JSON.stringify(result.data, null, 2);
}

/**
 * ReAct 最终答案节点
 * 基于所有工具调用结果生成最终响应
 */
export async function reactFinalAnswerNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('✍️ ReAct: 生成最终答案...');

  const { chartText, category, history, toolResults, reasoning } = state;

  // 构建最终答案提示词
  const finalPrompt = buildFinalAnswerPrompt(chartText, category, history, toolResults, reasoning);

  try {
    // 调用 AI 生成最终答案
    const finalAnswer = await InterpretationService.callAI({
      system: `你是一位精通命理的分析师。

**任务：** 基于之前获取的所有信息，为用户提供专业、准确的命理分析。

**要求：**
1. 综合所有工具调用结果
2. 结合命盘信息进行深度分析
3. 给出实用、客观的建议
4. 保持专业、严谨的风格`,
      messages: [{ role: 'user', content: finalPrompt }],
    });

    console.log('✅ 最终答案生成完成');

    return {
      finalAnswer,
      response: finalAnswer, // 同时设置 response 字段以兼容现有流程
      reactPhase: 'final',
    };
  } catch (error) {
    console.error('Final answer generation error:', error);
    return {
      finalAnswer: '抱歉，生成最终答案时出错。',
      response: '抱歉，生成最终答案时出错。',
      reactPhase: 'error',
      error: error instanceof Error ? error.message : 'Final answer failed',
    };
  }
}

/**
 * 构建最终答案提示词
 */
function buildFinalAnswerPrompt(
  chartText: string | undefined,
  category: string | undefined,
  history: any[] | undefined,
  toolResults: any[] | undefined,
  reasoning: string[] | undefined
): string {
  let prompt = '基于以下信息，请为用户提供完整的命理分析：\n\n';

  // 添加命盘信息
  if (chartText) {
    prompt += `【命盘信息】\n${chartText}\n\n`;
  }

  // 添加分析类别
  if (category) {
    prompt += `【分析类别】${category}\n\n`;
  }

  // 添加工具调用结果
  if (toolResults && toolResults.length > 0) {
    prompt += '【获取的额外信息】\n';
    toolResults.forEach((result, index) => {
      prompt += `\n--- 信息源 ${index + 1}: ${result.toolName} ---\n`;
      prompt += result.observation;
    });
    prompt += '\n';
  }

  // 添加用户问题
  if (history && history.length > 0) {
    const lastMessage = history[history.length - 1];
    prompt += `【用户问题】\n${lastMessage.content}\n`;
  }

  prompt += '\n请综合以上所有信息，给出详细的分析和建议。';

  return prompt;
}
