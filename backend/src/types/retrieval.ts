/**
 * 检索层类型定义
 * 统一 Sub-Agent 的知识召回、排序与调试元数据
 */

import type { DestinyType, SubCategory, KnowledgeEntry } from './index.js';

/**
 * 排序查询构建策略
 */
export type RetrievalQueryMode = 'message_only' | 'chart_and_message';

/**
 * 检索策略
 */
export interface RetrievalPolicy {
  readonly id: string;
  readonly topK: number;
  readonly includeSharedKnowledge: boolean;
  readonly queryMode: RetrievalQueryMode;
}

/**
 * 统一检索请求
 */
export interface RetrievalRequest {
  readonly destinyType: DestinyType;
  readonly subCategory: SubCategory;
  readonly chartText: string;
  readonly userMessage: string;
  readonly traceId?: string;
}

/**
 * 排序后的检索条目
 */
export interface RetrievalItem {
  readonly entry: KnowledgeEntry;
  readonly score: number;
}

/**
 * 检索调试信息（用于观测与诊断）
 */
export interface RetrievalDebugInfo {
  readonly policyId: string;
  readonly queryMode: RetrievalQueryMode;
  readonly rankingQuery: string;
  readonly sharedCount: number;
  readonly specificCount: number;
  readonly candidateCount: number;
  readonly selectedCount: number;
  readonly selectedIds: ReadonlyArray<string>;
  readonly topScores: ReadonlyArray<number>;
}

/**
 * 统一检索结果
 */
export interface RetrievalResult {
  readonly text: string;
  readonly titles: ReadonlyArray<string>;
  readonly items: ReadonlyArray<RetrievalItem>;
  readonly debug: RetrievalDebugInfo;
}
