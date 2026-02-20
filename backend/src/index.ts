import express from 'express';
import cors from 'cors';
import { createHash, randomUUID } from 'crypto';
import type { ChatRequest, ApiResponse } from './types/index.js';
import type { V2AnalyzeRequest } from './agents/types.js';
import { initDatabase } from './database/index.js';
import { knowledgeRepository } from './repositories/KnowledgeRepository.js';
import { cacheRepository } from './repositories/CacheRepository.js';
import { saveReportToFile, listReports, readReport, deleteReport } from './services/reportService.js';
import { analyzeDestiny, streamAnalyzeDestiny } from './graph/destinyGraph.js';
import { analyzeWithReAct, streamAnalyzeWithReAct, validateReactConfig } from './graph/reactGraph.js';
import { errorHandler, asyncHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ValidationError } from './errors/AppError.js';
import { agentRegistry } from './agents/registry.js';
import { ZiweiAgent } from './agents/ziweiAgent.js';
import { BaziAgent } from './agents/baziAgent.js';
import { MeihuaAgent } from './agents/meihuaAgent.js';
import { BaziService } from './services/baziService.js';
import { buildDispatch, dispatchAnalyze, dispatchStream } from './agents/supervisorAgent.js';
import { fuseResults, fuseResultsStream } from './agents/fusionAgent.js';

// ── 注册所有 Sub-Agent ─────────────────────────────────────────────────
agentRegistry.register(new ZiweiAgent());
agentRegistry.register(new BaziAgent());
agentRegistry.register(new MeihuaAgent());

// 注意: 环境变量通过 interpretationService.ts 导入的 config/env.js 自动加载

// 初始化数据库
initDatabase();

/**
 * 生成命盘缓存键
 * 基于 chart + category + prompt 生成唯一哈希值
 * 这样每个不同的问题都会有独立的缓存
 */
function generateChartKey(chart: string, category: string, prompt: string): string {
  const hash = createHash('sha256');
  hash.update(chart);
  hash.update(category);
  hash.update(prompt); // 加入 prompt 使每个问题有独立缓存
  return hash.digest('hex').substring(0, 16);
}

/**
 * v2 缓存键：基于 birthInfo + userMessage + subCategory 生成唯一哈希
 * 前缀 v2_ 避免与 v1 缓存键碰撞
 */
function generateV2CacheKey(
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string },
  userMessage: string,
  subCategory?: string,
): string {
  const hash = createHash('sha256');
  hash.update(`${birthInfo.year}-${birthInfo.month}-${birthInfo.day}-${birthInfo.hour}-${birthInfo.gender}`);
  hash.update(userMessage);
  hash.update(subCategory ?? 'general');
  return 'v2_' + hash.digest('hex').substring(0, 16);
}

/**
 * v2 出生信息级缓存键：基于 birthInfo + subCategory + dispatch 生成
 * 用于同命主复用整段分析结果，减少模型重复调用
 */
function generateV2BirthCacheKey(
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string },
  subCategory: string | undefined,
  primaryAgent: string,
  targetAgents: ReadonlyArray<string>,
): string {
  const hash = createHash('sha256');
  hash.update(`${birthInfo.year}-${birthInfo.month}-${birthInfo.day}-${birthInfo.hour}-${birthInfo.gender}`);
  hash.update(subCategory ?? 'general');
  hash.update(primaryAgent);
  hash.update(targetAgents.join('|'));
  return 'v2_birth_' + hash.digest('hex').substring(0, 16);
}

const app = express();
const PORT = process.env.PORT || 8000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 普通聊天接口
app.post('/api/chat', asyncHandler(async (req, res) => {
  const { prompt, chart, category, history }: ChatRequest = req.body;

  if (!prompt || !chart || !category) {
    throw new ValidationError('Missing required fields: prompt, chart, category', {
      receivedFields: { prompt: !!prompt, chart: !!chart, category: !!category },
    });
  }

    // 生成缓存键（包含 prompt）
    const chartKey = generateChartKey(chart, category, prompt);

    // 检查缓存
    const cached = cacheRepository.get(chartKey, category);
    if (cached) {
      console.log(`✅ Cache hit for chartKey=${chartKey}, category=${category}`);
      if (cached.id) {
        cacheRepository.incrementHitCount(cached.id);
      }
      return res.json({
        success: true,
        data: { response: cached.result, fromCache: true },
      } as ApiResponse);
    }

    console.log(`❌ Cache miss for chartKey=${chartKey}, category=${category}, calling AI...`);

    // 使用新的 DestinyGraph
    const startTime = Date.now();
    const response = await analyzeDestiny(
      { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false }, // birthInfo (暂不使用)
      category,
      chart,
      history || []
    );
    const executionTime = (Date.now() - startTime) / 1000;

    // 保存到缓存
    cacheRepository.save(chartKey, category, response, {
      executionTime,
      tokenCount: undefined, // AI 返回的 token 数量
    });

    console.log(`💾 Saved to cache: chartKey=${chartKey}`);

  res.json({
    success: true,
    data: { response, fromCache: false },
  } as ApiResponse);
}));

// ReAct 聊天接口 (非流式)
app.post('/api/chat/react', async (req, res) => {
  try {
    const { prompt, chart, category, history, enableKnowledge = true, enableExternal = true, maxToolCalls = 5 }: ChatRequest & {
      enableKnowledge?: boolean;
      enableExternal?: boolean;
      maxToolCalls?: number;
    } = req.body;

    if (!prompt || !chart || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt, chart, category',
      } as ApiResponse);
    }

    // 验证 ReAct 配置
    const configValidation = validateReactConfig({ enableKnowledge, enableExternal, maxToolCalls });
    if (!configValidation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid ReAct config: ${configValidation.errors.join(', ')}`,
      } as ApiResponse);
    }

    console.log(`🧠 ReAct request: category=${category}, maxToolCalls=${maxToolCalls}`);

    // 生成缓存键
    const chartKey = generateChartKey(chart, category, `react_${prompt}`);

    // 检查缓存
    const cached = cacheRepository.get(chartKey, `react_${category}`);
    if (cached) {
      console.log(`✅ ReAct cache hit for chartKey=${chartKey}`);
      if (cached.id) {
        cacheRepository.incrementHitCount(cached.id);
      }
      return res.json({
        success: true,
        data: {
          response: cached.result,
          fromCache: true,
          reactMode: true,
        },
      } as ApiResponse);
    }

    console.log(`❌ ReAct cache miss, calling ReAct analysis...`);

    // 执行 ReAct 分析
    const startTime = Date.now();
    const result = await analyzeWithReAct(
      { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false }, // birthInfo
      category,
      chart,
      history || [],
      { enableKnowledge, enableExternal, maxToolCalls }
    );

    const executionTime = (Date.now() - startTime) / 1000;

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'ReAct analysis failed',
      } as ApiResponse);
    }

    // 保存到缓存
    if (result.finalAnswer) {
      cacheRepository.save(chartKey, `react_${category}`, result.finalAnswer, {
        executionTime,
        tokenCount: undefined,
      });
      console.log(`💾 ReAct result saved to cache: chartKey=${chartKey}`);
    }

    res.json({
      success: true,
      data: {
        response: result.finalAnswer,
        reasoning: result.reasoning,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        reactStats: {
          totalToolCalls: result.toolCalls?.length || 0,
          successfulCalls: result.toolResults?.filter(r => r.result?.success).length || 0,
          failedCalls: result.toolResults?.filter(r => !r.result?.success).length || 0,
        },
        fromCache: false,
        reactMode: true,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('ReAct chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'ReAct internal server error',
    } as ApiResponse);
  }
});

// 流式聊天接口
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { prompt, chart, category, history }: ChatRequest = req.body;

    // 调试日志：显示接收到的数据
    console.log(`📥 Received stream chat request:`);
    console.log(`   - Prompt length: ${prompt?.length || 0} chars`);
    console.log(`   - Chart length: ${chart?.length || 0} chars`);
    console.log(`   - Category: ${category}`);
    console.log(`   - History: ${history?.length || 0} messages`);

    if (!prompt || !chart || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // 生成缓存键（包含 prompt）
    const chartKey = generateChartKey(chart, category, prompt);

    // 检查缓存
    const cached = cacheRepository.get(chartKey, category);
    if (cached) {
      console.log(`✅ Stream cache hit for chartKey=${chartKey}, category=${category}`);
      if (cached.id) {
        cacheRepository.incrementHitCount(cached.id);
      }

      // 设置 SSE 头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 发送缓存标记
      res.write(`data: ${JSON.stringify({ type: 'cache_hit', content: cached.result })}\n\n`);
      res.end();
      return;
    }

    console.log(`❌ Stream cache miss for chartKey=${chartKey}, category=${category}, calling AI...`);

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 添加 prompt 到 history
    const fullHistory = [
      ...(history || []),
      { role: 'user' as const, content: prompt },
    ];

    const startTime = Date.now();
    let fullResponse = '';

    // 使用新的 DestinyGraph 流式分析
    for await (const chunk of streamAnalyzeDestiny(
      { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false }, // birthInfo (暂不使用)
      category,
      chart,
      fullHistory
    )) {
      res.write(chunk);
      // 收集完整响应用于缓存
      const match = chunk.match(/data: (.+)\n\n/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (data.type === 'token' && data.content) {
            fullResponse += data.content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;

    // 保存到缓存
    if (fullResponse) {
      cacheRepository.save(chartKey, category, fullResponse, {
        executionTime,
        tokenCount: undefined,
      });
      console.log(`💾 Stream response saved to cache: chartKey=${chartKey}`);
    }

    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Streaming error',
      });
    } else {
      res.end();
    }
  }
});

// ReAct 流式聊天接口
app.post('/api/chat/react/stream', async (req, res) => {
  try {
    const { prompt, chart, category, history, enableKnowledge = true, enableExternal = true, maxToolCalls = 5 }: ChatRequest & {
      enableKnowledge?: boolean;
      enableExternal?: boolean;
      maxToolCalls?: number;
    } = req.body;

    console.log(`📥 Received ReAct stream request: category=${category}, maxToolCalls=${maxToolCalls}`);

    if (!prompt || !chart || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // 验证 ReAct 配置
    const configValidation = validateReactConfig({ enableKnowledge, enableExternal, maxToolCalls });
    if (!configValidation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid ReAct config: ${configValidation.errors.join(', ')}`,
      } as ApiResponse);
    }

    // 生成缓存键
    const chartKey = generateChartKey(chart, category, `react_stream_${prompt}`);

    // 检查缓存
    const cached = cacheRepository.get(chartKey, `react_stream_${category}`);
    if (cached) {
      console.log(`[ReAct] Cache hit for chartKey=${chartKey}`);
      if (cached.id) {
        cacheRepository.incrementHitCount(cached.id);
      }

      // 设置 SSE 头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 发送缓存标记
      res.write(`data: ${JSON.stringify({ type: 'cache_hit', content: cached.result, reactMode: true })}\n\n`);
      res.end();
      return;
    }

    console.log(`[ReAct] Cache miss, starting ReAct streaming...`);

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 添加 prompt 到 history
    const fullHistory = [
      ...(history || []),
      { role: 'user' as const, content: prompt },
    ];

    const startTime = Date.now();
    let fullResponse = '';

    try {
      // 使用 ReAct 流式分析（非异步生成器，直接 await）
      const result = await streamAnalyzeWithReAct(
        { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false }, // birthInfo
        category,
        chart,
        fullHistory,
        { enableKnowledge, enableExternal, maxToolCalls }
      );

      // 将结果转换为 SSE 格式
      if (result.success && result.finalAnswer) {
        const responseChunk = `data: ${JSON.stringify({ type: 'token', content: result.finalAnswer })}\n\n`;
        res.write(responseChunk);
        fullResponse = result.finalAnswer;
      }

      res.write('data: [DONE]\n\n');
    } catch (error) {
      console.error('ReAct analysis error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'ReAct analysis failed' })}\n\n`);
      res.write('data: [DONE]\n\n');
    }

    const executionTime = (Date.now() - startTime) / 1000;

    // 保存到缓存
    if (fullResponse) {
      cacheRepository.save(chartKey, `react_stream_${category}`, fullResponse, {
        executionTime,
        tokenCount: undefined,
      });
      console.log(`ReAct stream response saved to cache: chartKey=${chartKey}`);
    }

    res.end();
  } catch (error) {
    console.error('ReAct stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'ReAct streaming error',
      });
    } else {
      res.end();
    }
  }
});

// 知识库搜索接口
app.post('/api/knowledge/search', async (req, res) => {
  try {
    const { category, keywords } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: category',
      } as ApiResponse);
    }

    // 从数据库搜索知识库
    const entries = keywords && keywords.length > 0
      ? knowledgeRepository.searchByKeywords(keywords)
      : knowledgeRepository.findByCategory(category);

    // 格式化知识库内容供 AI 使用
    const formatted = entries.map(entry => {
      return `【${entry.title}】\n${entry.content}`;
    }).join('\n\n---\n\n');

    res.json({
      success: true,
      data: { entries, formatted },
    } as ApiResponse);
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search error',
    } as ApiResponse);
  }
});

// =====================================================
// 缓存 API 端点
// =====================================================

// 获取缓存
app.get('/api/cache/:chartKey/:analysisType', (req, res) => {
  try {
    const { chartKey, analysisType } = req.params;
    const cached = cacheRepository.get(chartKey, analysisType);

    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'Cache not found',
      } as ApiResponse);
    }

    // 更新命中计数
    if (cached.id) {
      cacheRepository.incrementHitCount(cached.id);
    }

    res.json({
      success: true,
      data: { ...cached, fromCache: true },
    } as ApiResponse);
  } catch (error) {
    console.error('Cache get error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Get cache error',
    } as ApiResponse);
  }
});

// 保存缓存
app.post('/api/cache', (req, res) => {
  try {
    const { chartKey, analysisType, result, tokenCount, executionTime } = req.body;

    if (!chartKey || !analysisType || !result) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: chartKey, analysisType, result',
      } as ApiResponse);
    }

    const id = cacheRepository.save(chartKey, analysisType, result, {
      tokenCount,
      executionTime,
    });

    res.json({
      success: true,
      data: { id },
    } as ApiResponse);
  } catch (error) {
    console.error('Cache save error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Save cache error',
    } as ApiResponse);
  }
});

// 获取命盘的所有缓存
app.get('/api/cache/chart/:chartKey', (req, res) => {
  try {
    const { chartKey } = req.params;
    const caches = cacheRepository.getByChart(chartKey);

    res.json({
      success: true,
      data: caches,
    } as ApiResponse);
  } catch (error) {
    console.error('Get chart caches error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Get chart caches error',
    } as ApiResponse);
  }
});

// 清除命盘缓存
app.delete('/api/cache/chart/:chartKey', (req, res) => {
  try {
    const { chartKey } = req.params;
    const count = cacheRepository.clearChart(chartKey);

    res.json({
      success: true,
      data: { deleted: count },
    } as ApiResponse);
  } catch (error) {
    console.error('Clear chart cache error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Clear chart cache error',
    } as ApiResponse);
  }
});

// 清除过期缓存
app.delete('/api/cache/expired/:days', (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const count = cacheRepository.clearExpired(days);

    res.json({
      success: true,
      data: { deleted: count },
    } as ApiResponse);
  } catch (error) {
    console.error('Clear expired cache error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Clear expired cache error',
    } as ApiResponse);
  }
});

// =====================================================
// 报告保存 API 端点
// =====================================================

// 保存报告到服务器文件系统
app.post('/api/reports/save', async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: filename, content',
      } as ApiResponse);
    }

    const filepath = await saveReportToFile(filename, content);

    res.json({
      success: true,
      data: { filepath },
    } as ApiResponse);
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Save report error',
    } as ApiResponse);
  }
});

// 列出所有报告
app.get('/api/reports', async (req, res) => {
  try {
    const files = await listReports();

    res.json({
      success: true,
      data: { files },
    } as ApiResponse);
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'List reports error',
    } as ApiResponse);
  }
});

// 读取报告内容
app.get('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const content = await readReport(filename);

    res.json({
      success: true,
      data: { content },
    } as ApiResponse);
  } catch (error) {
    console.error('Read report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Read report error',
    } as ApiResponse);
  }
});

// 删除报告
app.delete('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    await deleteReport(filename);

    res.json({
      success: true,
      data: { message: 'Report deleted successfully' },
    } as ApiResponse);
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete report error',
    } as ApiResponse);
  }
});

// =====================================================
// 八字盘面 API
// =====================================================

/**
 * POST /api/bazi/chart
 * 根据出生信息生成结构化八字命盘（JSON 格式）
 */
app.post('/api/bazi/chart', asyncHandler(async (req, res) => {
  const { birthInfo } = req.body;

  if (!birthInfo) {
    throw new ValidationError('Missing required field: birthInfo', {
      receivedFields: { birthInfo: !!birthInfo },
    });
  }

  const { year, month, day, hour, gender } = birthInfo as Record<string, unknown>;
  if (
    typeof year !== 'number' || year < 1900 || year > 2100 ||
    typeof month !== 'number' || month < 1 || month > 12 ||
    typeof day !== 'number' || day < 1 || day > 31 ||
    typeof hour !== 'number' || hour < 0 || hour > 23 ||
    !['male', 'female'].includes(gender as string)
  ) {
    throw new ValidationError('Invalid birthInfo fields', {
      expected: { year: '1900-2100', month: '1-12', day: '1-31', hour: '0-23', gender: 'male|female' },
    });
  }

  const chart = BaziService.generate(birthInfo as Parameters<typeof BaziService.generate>[0]);

  res.json({
    success: true,
    data: chart,
  } as ApiResponse);
}));

// =====================================================
// v2 API — Multi-Agent 分析端点
// =====================================================

/**
 * POST /api/v2/analyze
 * 非流式多 Agent 分析，自动路由 + 融合
 */
app.post('/api/v2/analyze', asyncHandler(async (req, res) => {
  const body = req.body as V2AnalyzeRequest;
  const {
    birthInfo,
    userMessage,
    history = [],
    preferredTypes,
    subCategory,
    enableFunctionCalling,
    maxFunctionIterations,
    maxToolCalls,
    allowedTools,
    reuseBirthInfoCache = true,
  } = body;

  if (!birthInfo || !userMessage) {
    throw new ValidationError('Missing required fields: birthInfo, userMessage', {
      receivedFields: { birthInfo: !!birthInfo, userMessage: !!userMessage },
    });
  }

  const traceId = (req.headers['x-trace-id'] as string | undefined) ?? randomUUID();
  process.stdout.write(JSON.stringify({ traceId, event: 'v2_analyze_start', userMessage: userMessage.slice(0, 50) }) + '\n');

  // 检查缓存
  const cacheKey = generateV2CacheKey(birthInfo, userMessage, subCategory);
  const cacheCategory = `v2_${subCategory ?? 'general'}`;
  const cached = cacheRepository.get(cacheKey, cacheCategory);
  if (cached) {
    if (cached.id) cacheRepository.incrementHitCount(cached.id);
    process.stdout.write(JSON.stringify({ traceId, event: 'v2_cache_hit', cacheKey }) + '\n');
    return res.json({
      success: true,
      data: { narrative: cached.result, agentResults: [], dispatch: null, fromCache: true },
    } as ApiResponse);
  }

  const startTime = Date.now();
  const dispatch = buildDispatch({
    birthInfo,
    userMessage,
    history,
    preferredTypes,
    subCategory,
    traceId,
    enableFunctionCalling,
    maxFunctionIterations,
    maxToolCalls,
    allowedTools,
    reuseBirthInfoCache,
  });
  process.stdout.write(JSON.stringify({ traceId, event: 'v2_dispatch', targets: dispatch.targetAgents, shouldFuse: dispatch.shouldFuse }) + '\n');

  // 出生信息级缓存（同命主整段分析复用）
  if (reuseBirthInfoCache) {
    const birthCacheKey = generateV2BirthCacheKey(
      birthInfo,
      subCategory,
      dispatch.primaryAgent,
      dispatch.targetAgents,
    );
    const birthCached = cacheRepository.get(birthCacheKey, 'v2_birth');
    if (birthCached) {
      if (birthCached.id) cacheRepository.incrementHitCount(birthCached.id);
      process.stdout.write(JSON.stringify({ traceId, event: 'v2_birth_cache_hit', birthCacheKey }) + '\n');
      return res.json({
        success: true,
        data: {
          narrative: birthCached.result,
          agentResults: [],
          fusion: undefined,
          dispatch,
          fromCache: true,
          cacheMode: 'birth_info',
        },
      } as ApiResponse);
    }
  }

  const agentResults = await dispatchAnalyze(
    {
      birthInfo,
      userMessage,
      history,
      preferredTypes,
      subCategory,
      traceId,
      enableFunctionCalling,
      maxFunctionIterations,
      maxToolCalls,
      allowedTools,
      reuseBirthInfoCache,
    },
    dispatch,
  );

  let narrative: string;
  let fusion = undefined;

  if (dispatch.shouldFuse && agentResults.length > 1) {
    const fusionOutput = await fuseResults({
      userMessage,
      agentResults,
      dispatch,
    });
    narrative = fusionOutput.narrative;
    fusion = fusionOutput;
  } else {
    narrative = agentResults[0]?.analysis || '分析失败，未获得结果';
  }

  // 保存到缓存
  const executionTime = (Date.now() - startTime) / 1000;
  cacheRepository.save(cacheKey, cacheCategory, narrative, { executionTime });
  if (reuseBirthInfoCache) {
    const birthCacheKey = generateV2BirthCacheKey(
      birthInfo,
      subCategory,
      dispatch.primaryAgent,
      dispatch.targetAgents,
    );
    cacheRepository.save(birthCacheKey, 'v2_birth', narrative, { executionTime });
  }

  res.json({
    success: true,
    data: {
      narrative,
      agentResults,
      fusion,
      dispatch,
    },
  } as ApiResponse);
}));

/**
 * POST /api/v2/analyze/stream
 * 流式多 Agent 分析（primary agent 流式，其余后台）
 */
app.post('/api/v2/analyze/stream', async (req, res) => {
  try {
    const body = req.body as V2AnalyzeRequest;
    const {
      birthInfo,
      userMessage,
      history = [],
      preferredTypes,
      subCategory,
      enableFunctionCalling,
      maxFunctionIterations,
      maxToolCalls,
      allowedTools,
      reuseBirthInfoCache = true,
    } = body;

    if (!birthInfo || !userMessage) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const traceId = (req.headers['x-trace-id'] as string | undefined) ?? randomUUID();
    process.stdout.write(JSON.stringify({ traceId, event: 'v2_stream_start', userMessage: userMessage.slice(0, 50) }) + '\n');

    // 检查缓存
    const cacheKey = generateV2CacheKey(birthInfo, userMessage, subCategory);
    const cacheCategory = `v2_stream_${subCategory ?? 'general'}`;
    const cached = cacheRepository.get(cacheKey, cacheCategory);
    if (cached) {
      if (cached.id) cacheRepository.incrementHitCount(cached.id);
      process.stdout.write(JSON.stringify({ traceId, event: 'v2_stream_cache_hit', cacheKey }) + '\n');

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.write(`data: ${JSON.stringify({ type: 'cache_hit', content: cached.result })}\n\n`);
      res.end();
      return;
    }

    const startTime = Date.now();
    const dispatch = buildDispatch({
      birthInfo,
      userMessage,
      history,
      preferredTypes,
      subCategory,
      traceId,
      enableFunctionCalling,
      maxFunctionIterations,
      maxToolCalls,
      allowedTools,
      reuseBirthInfoCache,
    });
    process.stdout.write(JSON.stringify({ traceId, event: 'v2_dispatch', targets: dispatch.targetAgents }) + '\n');

    // 出生信息级缓存（同命主整段分析复用）
    if (reuseBirthInfoCache) {
      const birthCacheKey = generateV2BirthCacheKey(
        birthInfo,
        subCategory,
        dispatch.primaryAgent,
        dispatch.targetAgents,
      );
      const birthCached = cacheRepository.get(birthCacheKey, 'v2_stream_birth');
      if (birthCached) {
        if (birthCached.id) cacheRepository.incrementHitCount(birthCached.id);
        process.stdout.write(JSON.stringify({ traceId, event: 'v2_stream_birth_cache_hit', birthCacheKey }) + '\n');

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.write(`data: ${JSON.stringify({ type: 'cache_hit', content: birthCached.result, cacheMode: 'birth_info' })}\n\n`);
        res.end();
        return;
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送 dispatch 信息
    res.write(`data: ${JSON.stringify({ type: 'dispatch', dispatch })}\n\n`);

    let fullResponse = '';
    for await (const chunk of dispatchStream(
      {
        birthInfo,
        userMessage,
        history,
        preferredTypes,
        subCategory,
        traceId,
        enableFunctionCalling,
        maxFunctionIterations,
        maxToolCalls,
        allowedTools,
        reuseBirthInfoCache,
      },
      dispatch,
    )) {
      res.write(chunk);
      // 收集完整响应用于缓存
      const match = chunk.match(/data: (.+)\n\n/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (data.type === 'token' && data.content) {
            fullResponse += data.content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 保存到缓存
    if (fullResponse) {
      const executionTime = (Date.now() - startTime) / 1000;
      cacheRepository.save(cacheKey, cacheCategory, fullResponse, { executionTime });
      if (reuseBirthInfoCache) {
        const birthCacheKey = generateV2BirthCacheKey(
          birthInfo,
          subCategory,
          dispatch.primaryAgent,
          dispatch.targetAgents,
        );
        cacheRepository.save(birthCacheKey, 'v2_stream_birth', fullResponse, { executionTime });
      }
    }

    res.end();
  } catch (error) {
    console.error('[v2/stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'v2 streaming error',
      });
    } else {
      res.end();
    }
  }
});

// =====================================================
// 错误处理中间件（必须放在所有路由之后）
// =====================================================

// 404 处理
app.use(notFoundHandler);

// 统一错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/chat - Chat with agent`);
  console.log(`   POST /api/chat/stream - Stream chat`);
  console.log(`   🧠 POST /api/chat/react - ReAct chat (non-streaming)`);
  console.log(`   🧠 POST /api/chat/react/stream - ReAct chat (streaming)`);
  console.log(`   POST /api/knowledge/search - Search knowledge base`);
  console.log(`   POST /api/reports/save - Save report to server`);
  console.log(`   GET  /api/reports - List all reports`);
  console.log(`   GET  /api/reports/:filename - Read report content`);
  console.log(`   DELETE /api/reports/:filename - Delete report`);
  console.log(`   GET  /api/cache/:chartKey/:analysisType - Get cache`);
  console.log(`   POST /api/cache - Save cache`);
  console.log(`   GET  /api/cache/chart/:chartKey - Get chart caches`);
  console.log(`   DELETE /api/cache/chart/:chartKey - Clear chart cache`);
  console.log(`   DELETE /api/cache/expired/:days - Clear expired cache`);
  console.log(`   🤖 POST /api/v2/analyze - Multi-Agent 综合分析`);
  console.log(`   🤖 POST /api/v2/analyze/stream - Multi-Agent 流式分析`);
  console.log(`🧠 ReAct 模式已启用，支持工具调用和动态分析！`);
  console.log(`🤖 Multi-Agent 模式已启用：已注册 ${agentRegistry.getRegisteredTypes().join('、')} Agent`);
});

export default app;
