/**
 * 错误码定义
 * 格式: [模块][类型][序号]
 */
export const ErrorCodes = {
  // ========== 通用错误 (1000-1999) ==========
  UNKNOWN_ERROR: 'ERR_1000',
  VALIDATION_ERROR: 'ERR_1001',
  NOT_FOUND: 'ERR_1002',
  UNAUTHORIZED: 'ERR_1003',
  FORBIDDEN: 'ERR_1004',
  RATE_LIMIT_EXCEEDED: 'ERR_1005',

  // ========== 数据库错误 (2000-2999) ==========
  DATABASE_CONNECTION_ERROR: 'ERR_2000',
  DATABASE_QUERY_ERROR: 'ERR_2001',
  DATABASE_CONSTRAINT_ERROR: 'ERR_2002',
  CACHE_ERROR: 'ERR_2003',

  // ========== AI Provider 错误 (3000-3999) ==========
  AI_PROVIDER_ERROR: 'ERR_3000',
  AI_PROVIDER_TIMEOUT: 'ERR_3001',
  AI_PROVIDER_RATE_LIMIT: 'ERR_3002',
  AI_PROVIDER_INVALID_RESPONSE: 'ERR_3003',
  AI_API_KEY_MISSING: 'ERR_3004',
  AI_API_KEY_INVALID: 'ERR_3005',

  // ========== 知识库错误 (4000-4999) ==========
  KNOWLEDGE_NOT_FOUND: 'ERR_4000',
  KNOWLEDGE_LOAD_ERROR: 'ERR_4001',
  KNOWLEDGE_SEARCH_ERROR: 'ERR_4002',

  // ========== RAG 服务错误 (5000-5999) ==========
  RAG_SERVICE_UNAVAILABLE: 'ERR_5000',
  RAG_SERVICE_TIMEOUT: 'ERR_5001',
  RAG_SERVICE_ERROR: 'ERR_5002',

  // ========== 命盘处理错误 (6000-6999) ==========
  CHART_CALCULATION_ERROR: 'ERR_6000',
  INVALID_BIRTH_INFO: 'ERR_6001',
  CHART_FORMAT_ERROR: 'ERR_6002',

  // ========== LangGraph 状态机错误 (7000-7999) ==========
  STATE_MACHINE_ERROR: 'ERR_7000',
  INVALID_STATE_TRANSITION: 'ERR_7001',
  NODE_EXECUTION_ERROR: 'ERR_7002',

  // ========== Tool 调用错误 (8000-8999) ==========
  TOOL_NOT_FOUND: 'ERR_8000',
  TOOL_EXECUTION_ERROR: 'ERR_8001',
  TOOL_PARAMETER_ERROR: 'ERR_8002',
  TOOL_TIMEOUT: 'ERR_8003',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 错误码到 HTTP 状态码的映射
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  // 通用错误
  [ErrorCodes.UNKNOWN_ERROR]: 500,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,

  // 数据库错误
  [ErrorCodes.DATABASE_CONNECTION_ERROR]: 503,
  [ErrorCodes.DATABASE_QUERY_ERROR]: 500,
  [ErrorCodes.DATABASE_CONSTRAINT_ERROR]: 400,
  [ErrorCodes.CACHE_ERROR]: 500,

  // AI Provider 错误
  [ErrorCodes.AI_PROVIDER_ERROR]: 503,
  [ErrorCodes.AI_PROVIDER_TIMEOUT]: 504,
  [ErrorCodes.AI_PROVIDER_RATE_LIMIT]: 429,
  [ErrorCodes.AI_PROVIDER_INVALID_RESPONSE]: 502,
  [ErrorCodes.AI_API_KEY_MISSING]: 500,
  [ErrorCodes.AI_API_KEY_INVALID]: 500,

  // 知识库错误
  [ErrorCodes.KNOWLEDGE_NOT_FOUND]: 404,
  [ErrorCodes.KNOWLEDGE_LOAD_ERROR]: 500,
  [ErrorCodes.KNOWLEDGE_SEARCH_ERROR]: 500,

  // RAG 服务错误
  [ErrorCodes.RAG_SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.RAG_SERVICE_TIMEOUT]: 504,
  [ErrorCodes.RAG_SERVICE_ERROR]: 500,

  // 命盘处理错误
  [ErrorCodes.CHART_CALCULATION_ERROR]: 500,
  [ErrorCodes.INVALID_BIRTH_INFO]: 400,
  [ErrorCodes.CHART_FORMAT_ERROR]: 500,

  // LangGraph 错误
  [ErrorCodes.STATE_MACHINE_ERROR]: 500,
  [ErrorCodes.INVALID_STATE_TRANSITION]: 500,
  [ErrorCodes.NODE_EXECUTION_ERROR]: 500,

  // Tool 错误
  [ErrorCodes.TOOL_NOT_FOUND]: 404,
  [ErrorCodes.TOOL_EXECUTION_ERROR]: 500,
  [ErrorCodes.TOOL_PARAMETER_ERROR]: 400,
  [ErrorCodes.TOOL_TIMEOUT]: 504,
};
