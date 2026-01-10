/**
 * LangGraph 节点函数
 * 每个节点函数处理状态机的一个步骤
 *
 * 节点函数签名: (state: GraphState) => Promise<GraphStateUpdate>
 */

import type { GraphStateUpdate } from '../types/graph.js';
import type { SubCategory, ChatMessage } from '../types/index.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { InterpretationService } from '../services/interpretationService.js';

// 新增：RAG 服务
import { ragService, getLegacyKnowledge } from '../services/ragService.js';

/**
 * 路由节点 - 根据 category 决定下一步
 * 返回 nextNode 字段指定下一个执行的节点
 */
export async function routerNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  const { category, useReAct } = state;

  // 如果启用 ReAct 模式，直接进入 ReAct 分析流程
  if (useReAct) {
    console.log(`🧠 Router: ReAct mode enabled, entering ReAct flow`);
    return { nextNode: 'reactFlow' };
  }

  // 只映射通用的 6 个分类，其他分类使用动态路由
  const categoryToNodeMap: Record<string, string> = {
    career: 'retrieveCareer',
    wealth: 'retrieveWealth',
    relationship: 'retrieveRelationship',
    health: 'retrieveHealth',
    family: 'retrieveFamily',
    general: 'retrieveGeneral',
    // 新增：使用 RAG 服务的节点
    ziweigeju: 'retrieveRAG',
    sixi: 'retrieveRAG',
    dashun: 'retrieveRAG',
    geju: 'retrieveRAG',
    yongshen: 'retrieveRAG',
    shishen: 'retrieveRAG',
    dayun: 'retrieveRAG',
  };

  const nextNode = categoryToNodeMap[category as string] || 'retrieveGeneral';
  console.log(`🔀 Router: category=${category} -> nextNode=${nextNode}`);

  return { nextNode };
}

/**
 * 事业知识检索节点
 */
export async function retrieveCareerNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving career knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);

  // 调用知识服务
  const entries = await KnowledgeService.retrieve('career', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} career knowledge entries`);

  return { retrievedContext: context };
}

/**
 * 财运知识检索节点
 */
export async function retrieveWealthNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving wealth knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);
  const entries = await KnowledgeService.retrieve('wealth', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} wealth knowledge entries`);

  return { retrievedContext: context };
}

/**
 * 感情知识检索节点
 */
export async function retrieveRelationshipNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving relationship knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);
  const entries = await KnowledgeService.retrieve('relationship', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} relationship knowledge entries`);

  return { retrievedContext: context };
}

/**
 * 健康知识检索节点
 */
export async function retrieveHealthNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving health knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);
  const entries = await KnowledgeService.retrieve('health', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} health knowledge entries`);

  return { retrievedContext: context };
}

/**
 * 家庭知识检索节点
 */
export async function retrieveFamilyNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving family knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);
  const entries = await KnowledgeService.retrieve('family', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} family knowledge entries`);

  return { retrievedContext: context };
}

/**
 * 综合知识检索节点
 */
export async function retrieveGeneralNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('📚 Retrieving general knowledge...');

  const { chartText, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for knowledge retrieval');
  }

  const userMessage = getUserMessage(history || []);
  const entries = await KnowledgeService.retrieve('general', chartText, userMessage);
  const context = KnowledgeService.formatForAI(entries);

  console.log(`✅ Retrieved ${entries.length} general knowledge entries`);

  return { retrievedContext: context };
}

/**
 * RAG 知识检索节点 - 使用向量数据库 + GraphRAG
 *
 * 支持新的分类：
 * - ziweigeju: 紫微格局分析
 * - sixi: 四化分析
 * - dashun: 大运分析
 * - geju: 八字格局
 * - yongshen: 用神分析
 * - shishen: 十神分析
 * - dayun: 大运流年
 */
export async function retrieveRAGNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🔮 [RAG] Retrieving knowledge from vector database...');

  const { chartText, category, history } = state;
  if (!chartText) {
    throw new Error('chartText is required for RAG retrieval');
  }

  const userMessage = getUserMessage(history || []);

  // 优先使用 RAG 服务
  const ragAvailable = await ragService.healthCheck();
  console.log(`🔮 [RAG] Service available: ${ragAvailable}`);

  if (ragAvailable) {
    try {
      // 构建完整查询
      const fullQuery = `${userMessage}\n\n命盘信息：\n${chartText}`;

      // 调用 RAG 服务
      const result = await ragService.chat(
        fullQuery,
        'ziwei',
        category,
        5
      );

      // 构建上下文
      let context = `【知识来源】${result.strategy}\n\n`;
      context += `【涉及实体】${result.entities.join(', ') || '无'}\n\n`;

      if (result.sources && result.sources.length > 0) {
        context += `【参考知识】\n`;
        for (const source of result.sources.slice(0, 5)) {
          context += `【${source.title}】(${source.score.toFixed(3)})\n`;
        }
        context += '\n';
      }

      console.log(`✅ [RAG] Retrieved ${result.sources.length} sources, strategy: ${result.strategy}`);

      return {
        retrievedContext: context,
        // 保存 RAG 元数据用于调试
        metadata: {
          ragStrategy: result.strategy,
          ragEntities: result.entities,
          ragSources: result.sources.map(s => s.id),
        }
      };
    } catch (error) {
      console.warn('⚠️ [RAG] Service call failed, falling back to legacy knowledge');
      // 降级到原有知识库
      return retrieveRAGFallback(category as string, chartText, userMessage);
    }
  } else {
    // RAG 服务不可用，降级到原有知识库
    console.warn('⚠️ [RAG] Service unavailable, using legacy knowledge');
    return retrieveRAGFallback(category as string, chartText, userMessage);
  }
}

/**
 * RAG 降级处理 - 使用原有知识库
 */
async function retrieveRAGFallback(
  category: string,
  chartText: string,
  userMessage: string
): Promise<GraphStateUpdate> {
  // 映射分类到原有知识库类别
  const categoryMap: Record<string, string> = {
    ziweigeju: 'general',
    sixi: 'general',
    dashun: 'general',
    geju: 'general',
    yongshen: 'general',
    shishen: 'general',
    dayun: 'general',
  };

  const legacyCategory = categoryMap[category] || 'general';
  const legacyKnowledge = getLegacyKnowledge(legacyCategory);

  // 构建降级上下文
  const context = `【降级模式 - 使用原有知识库】\n\n${legacyKnowledge}`;

  console.log(`✅ [Fallback] Using legacy knowledge for ${category}`);

  return {
    retrievedContext: context,
    metadata: {
      ragStrategy: 'fallback',
      ragEntities: [],
      ragSources: [],
    }
  };
}

/**
 * 分析节点 - 构建提示词
 */
export async function analyzeNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🔍 Analyzing...');

  const { chartText, category, retrievedContext, history } = state;

  if (!chartText || !category || !retrievedContext) {
    throw new Error('Missing required state for analysis');
  }

  const userMessage = getUserMessage(history || []);

  // 使用 InterpretationService 构建提示词
  const promptData = InterpretationService.buildPrompt(
    chartText,
    category as SubCategory,
    retrievedContext,
    userMessage,
    history || []
  );

  console.log('✅ Analysis prompt built');

  return { promptData };
}

/**
 * 响应节点 - 生成 AI 回复
 *
 * 注意: 这个节点用于非流式响应
 * 流式响应需要特殊处理，在 graph 层面实现
 */
export async function respondNode(
  state: GraphStateUpdate
): Promise<GraphStateUpdate> {
  console.log('🤖 Generating response...');

  const { promptData } = state;

  if (!promptData) {
    throw new Error('Missing prompt data for response');
  }

  // 使用 InterpretationService 调用 AI
  const response = await InterpretationService.callAI(promptData);

  console.log('✅ Response generated');

  return { response };
}

/**
 * 辅助函数 - 获取用户最新消息
 */
function getUserMessage(history: ChatMessage[] | undefined): string {
  if (!history || history.length === 0) return '';
  const lastMessage = history[history.length - 1];
  return lastMessage?.content || '';
}
