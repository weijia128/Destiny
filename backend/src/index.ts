import express from 'express';
import cors from 'cors';
import { createHash } from 'crypto';
import type { ChatRequest, ApiResponse } from './types/index.js';
import { initDatabase } from './database/index.js';
import { knowledgeRepository } from './repositories/KnowledgeRepository.js';
import { cacheRepository } from './repositories/CacheRepository.js';
import { saveReportToFile, listReports, readReport, deleteReport } from './services/reportService.js';
import { analyzeDestiny, streamAnalyzeDestiny } from './graph/destinyGraph.js';
import { analyzeWithReAct, streamAnalyzeWithReAct, validateReactConfig } from './graph/reactGraph.js';
import { errorHandler, asyncHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ValidationError } from './errors/AppError.js';

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
      console.log(`✅ ReAct stream cache hit for chartKey=${chartKey}`);
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

    console.log(`❌ ReAct stream cache miss, starting ReAct streaming...`);

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

    // 使用 ReAct 流式分析
    for await (const chunk of streamAnalyzeWithReAct(
      { year: 0, month: 0, day: 0, hour: 0, gender: 'male', isLunar: false }, // birthInfo
      category,
      chart,
      fullHistory,
      { enableKnowledge, enableExternal, maxToolCalls }
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
      cacheRepository.save(chartKey, `react_stream_${category}`, fullResponse, {
        executionTime,
        tokenCount: undefined,
      });
      console.log(`💾 ReAct stream response saved to cache: chartKey=${chartKey}`);
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
  console.log(`🧠 ReAct 模式已启用，支持工具调用和动态分析！`);
});

export default app;
