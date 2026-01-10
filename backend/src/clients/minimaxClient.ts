import type {
  MiniMaxChatRequest,
  MiniMaxMessage,
} from '../types/index.js';

/**
 * MiniMax API 客户端
 * 支持 abab6.5s-chat, abab5.5-chat, abab5-chat 等模型
 */

interface MiniMaxStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

interface MiniMaxResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MiniMaxClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, baseURL = 'https://api.minimax.chat/v1', model = 'abab6.5s-chat') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(messages: MiniMaxMessage[], stream = false): MiniMaxChatRequest {
    return {
      model: this.model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream,
    };
  }

  /**
   * 非流式聊天
   */
  async chat(messages: MiniMaxMessage[]): Promise<string> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, false)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as MiniMaxResponse;

    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }

    throw new Error('No response from MiniMax API');
  }

  /**
   * 流式聊天
   */
  async *streamChat(messages: MiniMaxMessage[]): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, true)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const jsonStr = trimmed.slice(6);
              const data: MiniMaxStreamChunk = JSON.parse(jsonStr);

              if (data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;
                if (delta.content) {
                  yield delta.content;
                }

                if (data.choices[0].finish_reason === 'stop') {
                  return;
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE chunk:', trimmed, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * 创建 MiniMax 客户端
 */
export function createMiniMaxClient(): MiniMaxClient | null {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseURL = process.env.MINIMAX_BASE_URL;
  const model = process.env.MINIMAX_MODEL || 'abab6.5s-chat';

  if (!apiKey) {
    console.warn('MINIMAX_API_KEY not set');
    return null;
  }

  console.log(`🤖 MiniMax client initialized with model: ${model}`);
  return new MiniMaxClient(apiKey, baseURL, model);
}
