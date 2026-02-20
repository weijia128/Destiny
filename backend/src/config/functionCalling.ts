import type { FunctionCallingConfig, FunctionCallingRuntimeConfig } from '../types/functionCalling.js';

/**
 * Function-calling 默认配置
 */
export const DEFAULT_FUNCTION_CALLING_CONFIG: FunctionCallingRuntimeConfig = {
  enabled: true,
  maxIterations: 4,
  maxToolCalls: 2,
  allowedTools: ['knowledge_search', 'calendar_almanac'],
};

/**
 * 归一化并兜底 function-calling 配置
 */
export function resolveFunctionCallingConfig(
  config?: FunctionCallingConfig
): FunctionCallingRuntimeConfig {
  const enabled = config?.enabled ?? DEFAULT_FUNCTION_CALLING_CONFIG.enabled;
  const maxIterations = clampInteger(
    config?.maxIterations,
    DEFAULT_FUNCTION_CALLING_CONFIG.maxIterations,
    1,
    8
  );
  const maxToolCalls = clampInteger(
    config?.maxToolCalls,
    DEFAULT_FUNCTION_CALLING_CONFIG.maxToolCalls,
    0,
    8
  );

  const allowedTools =
    config?.allowedTools && config.allowedTools.length > 0
      ? [...new Set(config.allowedTools)]
      : DEFAULT_FUNCTION_CALLING_CONFIG.allowedTools;

  return {
    enabled,
    maxIterations,
    maxToolCalls,
    allowedTools,
  };
}

function clampInteger(
  value: number | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}
