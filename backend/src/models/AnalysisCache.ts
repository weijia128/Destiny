/**
 * 分析缓存模型
 */

export interface AnalysisCache {
  id?: number;
  chart_key: string;
  analysis_type: string;
  result: string;
  timestamp: number;
  token_count?: number;
  execution_time?: number;
  hit_count?: number;
  last_hit_at?: number;
}

/**
 * 从数据库行转换为 AnalysisCache
 */
export function rowToAnalysisCache(row: any): AnalysisCache {
  return {
    id: row.id,
    chart_key: row.chart_key,
    analysis_type: row.analysis_type,
    result: row.result,
    timestamp: row.timestamp,
    token_count: row.token_count,
    execution_time: row.execution_time,
    hit_count: row.hit_count,
    last_hit_at: row.last_hit_at,
  };
}

/**
 * 从缓存条目生成响应（包含 fromCache 标记）
 */
export function cacheToResponse(cache: AnalysisCache): AnalysisCache & { fromCache: true } {
  return {
    ...cache,
    fromCache: true as const,
  };
}
