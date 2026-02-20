/**
 * 统一检索编排服务
 * 为 Sub-Agent 提供一致的知识召回、排序、格式化能力
 */

import { getRetrievalPolicy } from '../config/retrievalPolicies.js';
import type { KnowledgeEntry } from '../types/index.js';
import type {
  RetrievalPolicy,
  RetrievalRequest,
  RetrievalResult,
  RetrievalQueryMode,
} from '../types/retrieval.js';
import { KnowledgeService } from './knowledgeService.js';

export class RetrievalService {
  /**
   * 统一检索入口
   */
  static async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const policy = getRetrievalPolicy(request.destinyType, request.subCategory);
    const rankingQuery = this.buildRankingQuery(policy.queryMode, request.chartText, request.userMessage);

    try {
      const { sharedEntries, specificEntries } = await KnowledgeService.retrieveByCategoryWithSource(
        request.destinyType,
        request.subCategory,
        request.chartText,
        request.userMessage,
      );

      const candidates = this.mergeCandidates(
        sharedEntries,
        specificEntries,
        policy,
      );
      const ranked = KnowledgeService.rank(candidates, rankingQuery, policy.topK);

      return {
        text: KnowledgeService.formatForAI(ranked),
        titles: ranked.map(item => item.title),
        items: ranked.map(item => ({
          entry: this.removeScore(item),
          score: item.score,
        })),
        debug: {
          policyId: policy.id,
          queryMode: policy.queryMode,
          rankingQuery,
          sharedCount: sharedEntries.length,
          specificCount: specificEntries.length,
          candidateCount: candidates.length,
          selectedCount: ranked.length,
          selectedIds: ranked.map(item => item.id),
          topScores: ranked.map(item => item.score),
        },
      };
    } catch (error) {
      console.error(
        `Failed to retrieve knowledge for ${request.destinyType}/${request.subCategory}:`,
        error
      );

      return {
        text: '',
        titles: [],
        items: [],
        debug: {
          policyId: policy.id,
          queryMode: policy.queryMode,
          rankingQuery,
          sharedCount: 0,
          specificCount: 0,
          candidateCount: 0,
          selectedCount: 0,
          selectedIds: [],
          topScores: [],
        },
      };
    }
  }

  private static buildRankingQuery(
    queryMode: RetrievalQueryMode,
    chartText: string,
    userMessage: string
  ): string {
    if (queryMode === 'message_only') {
      return userMessage;
    }

    return `${chartText} ${userMessage}`.trim();
  }

  private static mergeCandidates(
    sharedEntries: KnowledgeEntry[],
    specificEntries: KnowledgeEntry[],
    policy: RetrievalPolicy
  ): KnowledgeEntry[] {
    const merged = policy.includeSharedKnowledge
      ? [...sharedEntries, ...specificEntries]
      : [...specificEntries];

    return this.deduplicateById(merged);
  }

  private static deduplicateById(entries: KnowledgeEntry[]): KnowledgeEntry[] {
    const entryMap = new Map<string, KnowledgeEntry>();

    entries.forEach(entry => {
      entryMap.set(entry.id, entry);
    });

    return Array.from(entryMap.values());
  }

  private static removeScore(entry: KnowledgeEntry & { score: number }): KnowledgeEntry {
    const { score: _score, ...knowledgeEntry } = entry;
    return knowledgeEntry;
  }
}
