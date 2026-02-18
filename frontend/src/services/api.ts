import type { BirthInfo, ZiweiChart, ChatMessage, AnalysisCategory, ApiResponse } from '@/types';
import { generateZiweiChart, formatChartForAI, formatChartToReadableText } from './chartService';
import { retrieveKnowledge, buildAnalysisPrompt } from './agentService';

const API_BASE = '/api';

type V2Role = 'user' | 'assistant' | 'system';
interface V2Message {
  role: V2Role;
  content: string;
}

interface V2AnalyzeResponseData {
  narrative: string;
}

function buildDivinationBirthInfo(): BirthInfo {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    gender: 'male',
    isLunar: false,
  };
}

/**
 * v2 analyze 通用调用（最小封装）
 */
export async function analyzeV2(body: {
  birthInfo: BirthInfo;
  userMessage: string;
  history: V2Message[];
  preferredTypes?: string[];
  subCategory?: AnalysisCategory;
}): Promise<ApiResponse<V2AnalyzeResponseData>> {
  try {
    const response = await fetch(`${API_BASE}/v2/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await response.json() as ApiResponse<V2AnalyzeResponseData>;
    if (!response.ok) {
      return { success: false, error: json.error || `请求失败: ${response.status}` };
    }
    return json;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '请求失败' };
  }
}

/**
 * 梅花易数（占位版）调用：强制路由到 meihua Agent
 */
export async function analyzeMeihua(
  message: string,
  category: AnalysisCategory,
  history: ChatMessage[]
): Promise<ApiResponse<V2AnalyzeResponseData>> {
  return analyzeV2({
    birthInfo: buildDivinationBirthInfo(),
    userMessage: message,
    history: history.slice(-10).map(m => ({ role: m.role as V2Role, content: m.content })),
    preferredTypes: ['meihua'],
    subCategory: category,
  });
}

/**
 * API 响应结果（带统计信息）
 */
export interface ChatResult {
  content: string;
  tokenCount?: number;
  executionTime?: number;
  fromCache?: boolean;
}

/**
 * 生成命盘
 */
export async function generateChart(birthInfo: BirthInfo): Promise<ApiResponse<ZiweiChart>> {
  try {
    // 直接使用 iztro 在前端生成命盘
    const chart = generateZiweiChart(birthInfo);
    return { success: true, data: chart };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '生成命盘失败' 
    };
  }
}

/**
 * 发送聊天消息并获取流式响应
 */
export async function* streamChat(
  message: string,
  chart: ZiweiChart,
  category: AnalysisCategory,
  history: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  // 检索相关知识
  const knowledge = await retrieveKnowledge(category, chart);

  // 构建提示词
  const prompt = buildAnalysisPrompt(chart, category, message, knowledge);

  const startTime = Date.now();
  let fullContent = '';

  // 调试日志
  console.log('[API] ===== Request Start =====');
  console.log('[API] Prompt length:', prompt.length);
  const chartText = formatChartToReadableText(chart);
  console.log('[API] Chart length:', chartText.length);
  console.log('[API] Chart preview:', chartText.substring(0, 300));

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        chart: formatChartToReadableText(chart), // 使用详细的命盘可读文本
        category,
        history: history.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error('请求失败');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应');
    }

    const decoder = new TextDecoder();

    console.log('[API] Starting to read stream...');
    let chunkCount = 0;
    let cacheHit = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      chunkCount++;
      console.log(`[API] Chunk ${chunkCount}:`, chunk.length, 'chars');

      // 检查是否是缓存命中
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(5));
            if (data.type === 'cache_hit') {
              console.log('[API] ✅ Cache hit from server!');
              cacheHit = true;
              // 返回缓存内容
              yield '⚡ 从缓存加载中...\n\n';
              yield data.content;
              fullContent = data.content;
              break;
            } else if (data.type === 'token' && data.content) {
              fullContent += data.content;
              yield data.content;
            }
          } catch {
            // 不是 JSON，正常处理
          }
        }
      }

      if (!cacheHit) {
        fullContent += chunk;
        yield chunk;
      } else {
        break; // 缓存命中后退出循环
      }
    }

    console.log('[API] Stream ended. Total chunks:', chunkCount);
    console.log('[API] Total content length:', fullContent.length);

    // 计算执行时间和估算 token 数（仅在非缓存命中时）
    if (!cacheHit) {
      const executionTime = (Date.now() - startTime) / 1000;
      const estimatedTokens = Math.round((prompt.length + fullContent.length) / 2);
      // 在返回前显示统计信息
      yield `\n\n---\n📊 统计信息\n推理耗时: ${executionTime.toFixed(2)}秒\n估算 Token: 约 ${estimatedTokens} tokens`;
    }
  } catch (error) {
    console.error('[API] Request failed:', error);
    // 抛出错误，让调用方处理
    throw new Error('API 调用失败，请检查后端服务是否正常运行');
  }
}

/**
 * 模拟流式响应（当后端不可用时）
 * @internal 备用函数，暂未使用但保留用于降级场景
 */
export async function* _simulateStreamResponse(
  _message: string,
  chart: ZiweiChart,
  category: AnalysisCategory,
  _knowledge: string
): AsyncGenerator<string, void, unknown> {
  const lifePalace = chart.palaces.find(p => p.name === '命宫');
  const targetPalace = getTargetPalace(chart, category);
  
  const responses: Record<AnalysisCategory, string> = {
    career: `根据您的紫微命盘分析，让我为您解读事业运势：

**命盘格局分析**

您的命宫位于${lifePalace?.stem}${lifePalace?.branch}，主星为${lifePalace?.majorStars.map(s => s.name).join('、') || '无主星'}。官禄宫显示${targetPalace?.majorStars.map(s => s.name).join('、') || '空宫'}，这个格局有以下特点：

1. **事业方向**：${getCareerSuggestion(chart)}

2. **发展建议**：
   - 适合稳扎稳打的发展路线
   - 注重专业技能的提升
   - 把握贵人机遇很重要

3. **注意事项**：
   - 避免急于求成
   - 保持良好的人际关系
   - 适时调整职业规划

如果您有更具体的事业问题，欢迎继续询问！`,

    wealth: `让我为您分析财运状况：

**财帛宫分析**

您的财帛宫${targetPalace ? `位于${targetPalace.stem}${targetPalace.branch}` : ''}，${targetPalace?.majorStars.length ? `主星为${targetPalace.majorStars.map(s => s.name).join('、')}` : '为空宫格局'}。

**财运特点**：
1. ${chart.fiveElementType}的格局影响您的财运节奏
2. ${getWealthAnalysis(chart)}

**理财建议**：
- 建立稳定的收入来源
- 适度进行投资理财
- 注意风险控制

还有什么财运方面的问题想了解吗？`,

    relationship: `让我解读您的感情运势：

**夫妻宫分析**

您的夫妻宫显示${targetPalace?.majorStars.map(s => s.name).join('、') || '空宫'}的格局。

**感情特点**：
1. ${getRelationshipAnalysis(chart)}
2. 桃花运势与命宫、迁移宫也有关联

**感情建议**：
- 真诚待人是感情稳固的基础
- 沟通交流很重要
- 给彼此适当的空间

有关于感情方面的具体问题吗？`,

    health: `让我为您分析健康运势：

**疾厄宫分析**

您的疾厄宫格局为${targetPalace?.majorStars.map(s => s.name).join('、') || '空宫'}。

**健康提示**：
1. ${getHealthAnalysis(chart)}
2. 结合您的五行局${chart.fiveElementType}，需要注意相应的养生要点

**养生建议**：
- 保持规律的作息
- 适当运动锻炼
- 定期体检很重要

需要更详细的健康建议吗？`,

    family: `让我分析您的家庭运势：

**六亲宫位分析**

从您的命盘来看：
- 父母宫显示与长辈的缘分
- 子女宫反映子女运势
- 兄弟宫体现手足情谊

**家庭建议**：
1. ${getFamilyAnalysis(chart)}
2. 多关心家人，维护家庭和谐

有具体的家庭问题想了解吗？`,

    general: `让我为您做一个综合分析：

**命盘总体格局**

您是${chart.birthInfo.gender === 'male' ? '男' : '女'}命，${chart.fiveElementType}。
- 命主：${chart.soulStar}
- 身主：${chart.bodyStar}
- 命宫主星：${lifePalace?.majorStars.map(s => s.name).join('、') || '无主星'}

**综合运势**：
1. 您的命盘${getOverallAnalysis(chart)}
2. 需要把握机遇，稳步发展

**建议**：
- 发挥自身优势
- 规避不利因素
- 把握关键时机

想深入了解哪个方面呢？`,

    // 紫微专属
    ziweigeju: `让我为您分析紫微格局：

**格局分析**

命宫主星为${lifePalace?.majorStars.map(s => s.name).join('、') || '无主星'}。

这个格局有以下特点：${getOverallAnalysis(chart)}

需要更详细的分析吗？`,

    sixi: `让我为您分析四化飞星：

**四化分析**

四化对命盘的影响深远，${chart.fiveElementType}局需要特别注意化忌的影响。

需要更详细的分析吗？`,

    dashun: `让我为您分析大运走势：

**大运分析**

根据您的命盘，大运走势与${lifePalace?.majorStars.map(s => s.name).join('、') || '命宫'}密切相关。

需要更详细的分析吗？`,

    // 八字专属
    geju: `让我为您分析八字格局：

**格局分析**

需要更详细的分析吗？`,

    yongshen: `让我为您分析用神：

**用神分析**

需要更详细的分析吗？`,

    shishen: `让我为您分析十神：

**十神分析**

需要更详细的分析吗？`,

    dayun: `让我为您分析大运流年：

**大运流年分析**

需要更详细的分析吗？`,

    // 奇门遁甲专属
    jushi: `让我为您分析局数：

**局数分析**

需要更详细的分析吗？`,

    men: `让我为您分析八门：

**八门分析**

需要更详细的分析吗？`,

    xing: `让我为您分析九星：

**九星分析**

需要更详细的分析吗？`,

    shen: `让我为您分析八神：

**八神分析**

需要更详细的分析吗？`,

    // 六爻专属
    gua: `让我为您分析卦象：

**卦象分析**

需要更详细的分析吗？`,

    liuyaoyin: `让我为您分析六爻印：

**六爻印分析**

需要更详细的分析吗？`,

    shiyin: `让我为您分析世应：

**世应分析**

需要更详细的分析吗？`,

    // 手相专属
    xian: `让我为您分析手线：

**手线分析**

需要更详细的分析吗？`,

    qiu: `让我为您分析丘位：

**丘位分析**

需要更详细的分析吗？`,

    zhi: `让我为您分析指型：

**指型分析**

需要更详细的分析吗？`,

    wen: `让我为您分析纹理：

**纹理分析**

需要更详细的分析吗？`,
  };

  const response = responses[category];
  
  // 模拟打字效果
  for (const char of response) {
    yield char;
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
  }
}

// 辅助函数
function getTargetPalace(chart: ZiweiChart, category: AnalysisCategory) {
  const palaceMap: Record<AnalysisCategory, string> = {
    career: '官禄宫',
    wealth: '财帛宫',
    relationship: '夫妻宫',
    health: '疾厄宫',
    family: '父母宫',
    general: '命宫',
    // 其他类别默认映射到命宫
    ziweigeju: '命宫',
    sixi: '命宫',
    dashun: '命宫',
    geju: '命宫',
    yongshen: '命宫',
    shishen: '命宫',
    dayun: '命宫',
    jushi: '命宫',
    men: '命宫',
    xing: '命宫',
    shen: '命宫',
    gua: '命宫',
    liuyaoyin: '命宫',
    shiyin: '命宫',
    xian: '命宫',
    qiu: '命宫',
    zhi: '命宫',
    wen: '命宫',
  };
  return chart.palaces.find(p => p.name === palaceMap[category]);
}

function getCareerSuggestion(chart: ZiweiChart): string {
  const careerPalace = chart.palaces.find(p => p.name === '官禄宫');
  const stars = careerPalace?.majorStars.map(s => s.name) || [];
  
  if (stars.includes('紫微')) return '适合管理、领导岗位，有官运';
  if (stars.includes('武曲')) return '适合金融、财务相关工作';
  if (stars.includes('天机')) return '适合策划、研究类工作';
  if (stars.includes('太阳')) return '适合公开露面、服务大众的工作';
  return '需结合整体命盘分析具体方向';
}

function getWealthAnalysis(chart: ZiweiChart): string {
  const wealthPalace = chart.palaces.find(p => p.name === '财帛宫');
  if (wealthPalace?.majorStars.some(s => s.name === '武曲')) {
    return '财星入位，主财运较旺';
  }
  if (wealthPalace?.majorStars.some(s => s.name === '天府')) {
    return '库星入位，主积蓄能力强';
  }
  return '财运平稳，需稳扎稳打';
}

function getRelationshipAnalysis(chart: ZiweiChart): string {
  const marriagePalace = chart.palaces.find(p => p.name === '夫妻宫');
  if (marriagePalace?.majorStars.some(s => ['天府', '天相'].includes(s.name))) {
    return '感情运势稳定，婚姻和谐';
  }
  if (marriagePalace?.majorStars.some(s => ['贪狼', '廉贞'].includes(s.name))) {
    return '桃花运旺，感情经历丰富';
  }
  return '感情发展需要用心经营';
}

function getHealthAnalysis(chart: ZiweiChart): string {
  const healthPalace = chart.palaces.find(p => p.name === '疾厄宫');
  if (healthPalace?.majorStars.some(s => s.brightness === '庙' || s.brightness === '旺')) {
    return '整体健康运势较好';
  }
  return '需要注意日常保健养生';
}

function getFamilyAnalysis(chart: ZiweiChart): string {
  const parentPalace = chart.palaces.find(p => p.name === '父母宫');
  if (parentPalace?.majorStars.some(s => s.nature === 'good')) {
    return '与家人关系和谐，六亲缘分较好';
  }
  return '家庭关系需要多用心维护';
}

function getOverallAnalysis(chart: ZiweiChart): string {
  const lifePalace = chart.palaces.find(p => p.name === '命宫');
  const goodStars = lifePalace?.majorStars.filter(s => s.nature === 'good').length || 0;
  
  if (goodStars >= 2) return '格局较佳，发展潜力大';
  if (goodStars === 1) return '格局中等，需把握机遇';
  return '需要后天努力来改善运势';
}

/**
 * 非流式聊天（备用）
 */
export async function sendChat(
  message: string,
  chart: ZiweiChart,
  category: AnalysisCategory,
  history: ChatMessage[]
): Promise<ApiResponse<string>> {
  try {
    const knowledge = await retrieveKnowledge(category, chart);
    const prompt = buildAnalysisPrompt(chart, category, message, knowledge);
    
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        chart: formatChartForAI(chart),
        category,
        history: history.slice(-10),
      }),
    });

    if (!response.ok) {
      throw new Error('请求失败');
    }

    const data = await response.json();
    return { success: true, data: data.response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '发送消息失败',
    };
  }
}

/**
 * 保存报告到服务器
 */
export async function saveReportToServer(filename: string, content: string): Promise<ApiResponse<string>> {
  try {
    const response = await fetch(`${API_BASE}/reports/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error('保存报告失败');
    }

    const data = await response.json();
    return { success: true, data: data.filepath };
  } catch (error) {
    console.error('保存报告失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存报告失败',
    };
  }
}
