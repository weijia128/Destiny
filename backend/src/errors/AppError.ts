import { ErrorCode, ErrorCodeToHttpStatus, ErrorCodes } from './ErrorCodes.js';

/**
 * 应用基础错误类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = ErrorCodeToHttpStatus[code] || 500;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_ERROR, message, context);
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super(
      ErrorCodes.NOT_FOUND,
      `Resource not found: ${resource}`,
      context
    );
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.DATABASE_QUERY_ERROR, message, context);
  }
}

/**
 * 缓存错误
 */
export class CacheError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.CACHE_ERROR, message, context);
  }
}

/**
 * AI Provider 错误
 */
export class AIProviderError extends AppError {
  public readonly provider: string;

  constructor(
    provider: string,
    message: string,
    code: ErrorCode = ErrorCodes.AI_PROVIDER_ERROR,
    context?: Record<string, unknown>
  ) {
    super(code, `AI Provider (${provider}): ${message}`, {
      ...context,
      provider,
    });
    this.provider = provider;
  }
}

/**
 * AI Provider 超时错误
 */
export class AIProviderTimeoutError extends AIProviderError {
  constructor(provider: string, timeout: number) {
    super(
      provider,
      `Request timeout after ${timeout}ms`,
      ErrorCodes.AI_PROVIDER_TIMEOUT,
      { timeout }
    );
  }
}

/**
 * AI Provider 限流错误
 */
export class AIProviderRateLimitError extends AIProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(
      provider,
      'Rate limit exceeded',
      ErrorCodes.AI_PROVIDER_RATE_LIMIT,
      { retryAfter }
    );
  }
}

/**
 * AI API Key 错误
 */
export class AIAPIKeyError extends AppError {
  constructor(provider: string, reason: 'missing' | 'invalid') {
    super(
      reason === 'missing' ? ErrorCodes.AI_API_KEY_MISSING : ErrorCodes.AI_API_KEY_INVALID,
      `AI API key ${reason} for provider: ${provider}`,
      { provider, reason }
    );
  }
}

/**
 * 知识库错误
 */
export class KnowledgeError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.KNOWLEDGE_SEARCH_ERROR,
    context?: Record<string, unknown>
  ) {
    super(code, message, context);
  }
}

/**
 * RAG 服务错误
 */
export class RAGServiceError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.RAG_SERVICE_ERROR,
    context?: Record<string, unknown>
  ) {
    super(code, `RAG Service: ${message}`, context);
  }
}

/**
 * 命盘处理错误
 */
export class ChartError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.CHART_CALCULATION_ERROR, message, context);
  }
}

/**
 * 出生信息验证错误
 */
export class InvalidBirthInfoError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.INVALID_BIRTH_INFO, message, context);
  }
}

/**
 * 状态机错误
 */
export class StateMachineError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(ErrorCodes.STATE_MACHINE_ERROR, message, context);
  }
}

/**
 * Tool 错误
 */
export class ToolError extends AppError {
  public readonly toolName: string;

  constructor(
    toolName: string,
    message: string,
    code: ErrorCode = ErrorCodes.TOOL_EXECUTION_ERROR,
    context?: Record<string, unknown>
  ) {
    super(code, `Tool (${toolName}): ${message}`, {
      ...context,
      toolName,
    });
    this.toolName = toolName;
  }
}

/**
 * Tool 未找到错误
 */
export class ToolNotFoundError extends ToolError {
  constructor(toolName: string) {
    super(toolName, 'Tool not found', ErrorCodes.TOOL_NOT_FOUND);
  }
}

/**
 * Tool 参数错误
 */
export class ToolParameterError extends ToolError {
  constructor(toolName: string, parameterName: string, reason: string) {
    super(
      toolName,
      `Invalid parameter "${parameterName}": ${reason}`,
      ErrorCodes.TOOL_PARAMETER_ERROR,
      { parameterName, reason }
    );
  }
}
