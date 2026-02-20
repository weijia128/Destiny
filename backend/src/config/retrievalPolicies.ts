/**
 * Sub-Agent 检索策略配置
 */

import type { DestinyType, SubCategory } from '../types/index.js';
import type { RetrievalPolicy } from '../types/retrieval.js';

type RetrievalPolicyKey = `${DestinyType}:${SubCategory}`;

const DEFAULT_RETRIEVAL_POLICY: RetrievalPolicy = {
  id: 'default',
  topK: 5,
  includeSharedKnowledge: true,
  queryMode: 'chart_and_message',
};

const TYPE_POLICY_OVERRIDES: Partial<Record<DestinyType, Partial<RetrievalPolicy>>> = {
  ziwei: {
    id: 'ziwei-default',
    queryMode: 'chart_and_message',
    topK: 5,
  },
  bazi: {
    id: 'bazi-default',
    queryMode: 'chart_and_message',
    topK: 5,
  },
  meihua: {
    id: 'meihua-default',
    queryMode: 'message_only',
    topK: 5,
  },
};

const SUBCATEGORY_POLICY_OVERRIDES: Partial<Record<RetrievalPolicyKey, Partial<RetrievalPolicy>>> = {
  'ziwei:sixi': {
    id: 'ziwei-sixi-focus',
    topK: 6,
  },
  'bazi:dayun': {
    id: 'bazi-dayun-focus',
    topK: 6,
  },
  'meihua:general': {
    id: 'meihua-general-focus',
    topK: 4,
  },
};

/**
 * 获取指定大类+子分类的检索策略
 */
export function getRetrievalPolicy(
  destinyType: DestinyType,
  subCategory: SubCategory
): RetrievalPolicy {
  const typeOverride = TYPE_POLICY_OVERRIDES[destinyType] ?? {};
  const key = `${destinyType}:${subCategory}` as RetrievalPolicyKey;
  const categoryOverride = SUBCATEGORY_POLICY_OVERRIDES[key] ?? {};

  return {
    ...DEFAULT_RETRIEVAL_POLICY,
    ...typeOverride,
    ...categoryOverride,
  };
}

/**
 * 仅用于测试场景：读取策略快照
 */
export function getRetrievalPolicySnapshot(): {
  readonly defaultPolicy: RetrievalPolicy;
  readonly typeOverrides: Partial<Record<DestinyType, Partial<RetrievalPolicy>>>;
  readonly subCategoryOverrides: Partial<Record<RetrievalPolicyKey, Partial<RetrievalPolicy>>>;
} {
  return {
    defaultPolicy: DEFAULT_RETRIEVAL_POLICY,
    typeOverrides: TYPE_POLICY_OVERRIDES,
    subCategoryOverrides: SUBCATEGORY_POLICY_OVERRIDES,
  };
}
