/**
 * DeepSeek API 客户端
 * DeepSeek 使用 OpenAI 兼容的 API 格式
 * 支持模型: deepseek-chat, deepseek-coder
 */

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekChatRequest {
  model: string;
  messages: DeepSeekMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
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

export class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(
    apiKey: string,
    baseURL = 'https://api.deepseek.com',
    model = 'deepseek-chat'
  ) {
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
  private buildRequestBody(messages: DeepSeekMessage[], stream = false): DeepSeekChatRequest {
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
  async chat(messages: DeepSeekMessage[]): Promise<string> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, false)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as DeepSeekResponse;

    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }

    throw new Error('No response from DeepSeek API');
  }

  /**
   * 流式聊天
   */
  async *streamChat(messages: DeepSeekMessage[]): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, true)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
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
              if (jsonStr === '[DONE]') continue;

              const data: DeepSeekStreamChunk = JSON.parse(jsonStr);

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
              // 忽略解析错误（可能是空行或其他数据）
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
 * 创建 DeepSeek 客户端
 */
export function createDeepSeekClient(): DeepSeekClient | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    console.warn('DEEPSEEK_API_KEY not set');
    return null;
  }

  console.log(`🤖 DeepSeek client initialized with model: ${model}`);
  return new DeepSeekClient(apiKey, baseURL, model);
}
