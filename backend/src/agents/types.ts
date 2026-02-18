/**
 * Multi-Agent 架构类型定义
 * Supervisor + Sub-Agent 协作模式的核心接口
 */

import type {
  BirthInfo,
  DestinyType,
  SubCategory,
  ChatMessage,
} from '../types/index.js';

/**
 * Sub-Agent 输入
 */
export interface SubAgentInput {
  readonly birthInfo: BirthInfo;
  readonly subCategory: SubCategory;
  readonly chartText: string;
  readonly userMessage: string;
  readonly history: ReadonlyArray<ChatMessage>;
  readonly currentYear?: number;
  readonly currentAge?: number;
}

/**
 * Sub-Agent 输出
 */
export interface SubAgentOutput {
  readonly destinyType: DestinyType;
  readonly subCategory: SubCategory;
  readonly analysis: string;
  readonly confidence: number;
  readonly metadata: SubAgentMetadata;
}

/**
 * Sub-Agent 元数据
 */
export interface SubAgentMetadata {
  readonly chartSummary: string;
  readonly knowledgeUsed: ReadonlyArray<string>;
  readonly executionTimeMs: number;
  readonly modelUsed?: string;
}

/**
 * Sub-Agent 接口
 * 每个术数系统实现此接口
 */
export interface SubAgent {
  readonly name: string;
  readonly destinyType: DestinyType;
  readonly description: string;

  /**
   * 获取支持的子分类列表
   */
  getSupportedCategories(): ReadonlyArray<SubCategory>;

  /**
   * 判断是否能处理给定输入
   */
  canHandle(input: SubAgentInput): boolean;

  /**
   * 生成命盘文本（从出生信息计算）
   */
  generateChart(birthInfo: BirthInfo): Promise<string>;

  /**
   * 执行分析（非流式）
   */
  analyze(input: SubAgentInput): Promise<SubAgentOutput>;

  /**
   * 执行分析（流式）
   */
  analyzeStream(input: SubAgentInput): AsyncGenerator<string>;
}

/**
 * Supervisor 分发请求
 */
export interface SupervisorDispatch {
  readonly targetAgents: ReadonlyArray<DestinyType>;
  readonly primaryAgent: DestinyType;
  readonly reason: string;
  readonly shouldFuse: boolean;
}

/**
 * Fusion 输入
 */
export interface FusionInput {
  readonly userMessage: string;
  readonly agentResults: ReadonlyArray<SubAgentOutput>;
  readonly dispatch: SupervisorDispatch;
}

/**
 * Fusion 输出
 */
export interface FusionOutput {
  readonly narrative: string;
  readonly consistency: ReadonlyArray<string>;
  readonly complementary: ReadonlyArray<string>;
  readonly contradictions: ReadonlyArray<string>;
  readonly sources: ReadonlyArray<DestinyType>;
}

/**
 * v2 分析请求
 */
export interface V2AnalyzeRequest {
  readonly birthInfo: BirthInfo;
  readonly userMessage: string;
  readonly history: ReadonlyArray<ChatMessage>;
  readonly preferredTypes?: ReadonlyArray<DestinyType>;
  readonly subCategory?: SubCategory;
}

/**
 * v2 分析响应
 */
export interface V2AnalyzeResponse {
  readonly success: boolean;
  readonly narrative: string;
  readonly agentResults: ReadonlyArray<SubAgentOutput>;
  readonly fusion?: FusionOutput;
  readonly dispatch: SupervisorDispatch;
}
