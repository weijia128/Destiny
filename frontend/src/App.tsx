import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Menu, X } from 'lucide-react';
import {
  StarField,
  CategorySelect,
  BirthInfoForm,
  ChartDisplay,
  ComprehensiveReport,
  AnalysisCategorySelector,
  ChatInterface,
  PalmistryForm,
  PalmistryDisplay,
} from '@/components';
import { useAppStore } from '@/store';
import { generateChart, streamChat, saveReportToServer } from '@/services/api';
import { formatChartToReadableText, getCurrentMajorPeriod, getCurrentYearlyFortune } from '@/services/chartService';
import { generatePalmReading } from '@/services/palmistryService';
import type { BirthInfo, AnalysisCategory, ChatMessage, PalmAnalysisCategory, PalmReading } from '@/types';

// 简单的 UUID 生成
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 构建报告后的跟进提问
function buildFollowUpPrompt(currentInfo: ReturnType<typeof getCurrentMajorPeriod>, chart: any): string {
  if (!currentInfo) return '';

  const { palace, age, startAge, endAge, yearsRemaining } = currentInfo;
  const majorStars = palace.majorStars.map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`).join('、') || '无主星';

  // 获取流年信息
  const yearlyInfo = getCurrentYearlyFortune(chart);
  let yearlyText = '';

  if (yearlyInfo && yearlyInfo.yearlyMutagens) {
    const { lu, quan, ke, ji } = yearlyInfo.yearlyMutagens;
    const mutagens = [
      lu && `化禄: ${lu}`,
      quan && `化权: ${quan}`,
      ke && `化科: ${ke}`,
      ji && `化忌: ${ji}`,
    ].filter(Boolean).join('、');

    yearlyText = `
• 当前流年：**${yearlyInfo.year} 年**
• 流年四化：${mutagens || '无'}`;
  }

  return `
📊 **综合报告已生成完毕**

如果你愿意，下一步我可以帮你做一件这份报告没做到、但最重要的事：

👉 把你"现在所处的年龄 + 现实状态"，精确套进大限与流年，看你当下这一步"该不该变、怎么变"。

**你的当前时空定位：**
• 当前年龄：**${age} 岁**（虚岁）
• 当前大限：**${palace.name}**（${startAge}-${endAge} 岁，还剩 ${yearsRemaining} 年）
• 大限主星：${majorStars}
• 大限天干地支：${palace.stem}${palace.branch}${yearlyText}

你只要告诉我：
• 你现在大概在做什么（行业/状态即可），
• 或者你想看 **事业 / 感情 / 未来 3–5 年走势** 哪一个。

我会直接给你可执行的判断，不再讲套话。
  `.trim();
}

type AppStep = 'category' | 'birthInfo' | 'chart' | 'report' | 'analysis' | 'palmistryForm' | 'palmistryResult';

export default function App() {
  const [step, setStep] = useState<AppStep>('category');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [palmReading, setPalmReading] = useState<PalmReading | null>(null);

  const {
    setBirthInfo,
    chart,
    setChart,
    messages,
    addMessage,
    updateMessage,
    currentCategory,
    setCurrentCategory,
    isLoading,
    setIsLoading,
    resetAll,
    reportContent,
    setReportContent,
  } = useAppStore();

  // 处理大类选择
  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === 'ziwei') {
      setStep('birthInfo');
    } else if (categoryId === 'palmistry') {
      setStep('palmistryForm');
    } else {
      // 其他类别暂未开放
      alert('该功能即将开放，敬请期待！');
    }
  };

  // 处理出生信息提交
  const handleBirthInfoSubmit = async (info: BirthInfo) => {
    setIsLoading(true);
    setBirthInfo(info);
    
    try {
      const result = await generateChart(info);
      if (result.success && result.data) {
        setChart(result.data);
        setStep('chart');
      } else {
        alert(result.error || '生成命盘失败');
      }
    } catch (error) {
      alert('生成命盘失败，请检查出生信息');
    } finally {
      setIsLoading(false);
    }
  };

  // 进入分析页面
  const handleEnterAnalysis = () => {
    // 如果没有选择类别，默认设置为综合分析
    if (!currentCategory) {
      setCurrentCategory('general');
    }
    setStep('analysis');
  };

  // 处理手相分析提交
  const handlePalmistrySubmit = async (birthInfo: BirthInfo, category: PalmAnalysisCategory) => {
    setIsLoading(true);
    try {
      const reading = generatePalmReading(birthInfo, category);
      setPalmReading(reading);
      setStep('palmistryResult');
    } catch (error) {
      alert('手相分析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置手相相关状态
  const resetPalmistry = () => {
    setPalmReading(null);
  };

  // 生成综合报告
  const handleGenerateReport = async () => {
    if (!chart) return;

    setIsLoading(true);

    try {
      let fullContent = '';

      // 生成综合报告提示词 - 结构化、分章节
      // 注意：详细的命盘信息已通过 formatChartToReadableText 传递给后端
      const reportPrompt = `请为这份紫微斗数命盘生成一份全面、专业、易懂的综合分析报告。

请按照以下结构输出报告，每个章节都要有详细的解读：

# 紫微斗数综合分析报告

## 一、命盘总览

### 1.1 基本信息
请概述命主的基本命盘信息，包括：
- 八字四柱
- 命主、身主、五行局
- 身宫位置、来因宫（如有）

### 1.2 命盘格局
请分析整体命盘格局，包括：
- 命宫主星配置及其特质
- 特殊格局（如杀破狼格局、紫府同宫等）
- 整体运势走向

## 二、命宫深度解析

### 2.1 命宫主星分析
请详细解读命宫主星的特质、优势与挑战

### 2.2 性格特质
根据命宫配置分析命主的性格特点、处世风格

## 三、十二宫位关键解读

请重点解读以下宫位：

### 3.1 财帛宫
财运特点、理财建议

### 3.2 官禄宫
事业发展、适合的职业方向

### 3.3 夫妻宫
婚姻运势、感情特点

### 3.4 福德宫
精神修养、内心快乐来源

## 四、四化分析

请分析命盘中的四化星对命主的影响：
- 化禄：财富和机遇
- 化权：权力和控制
- 化科：名声和学业
- 化忌：挑战和成长

## 五、人生发展建议

根据命盘整体分析，请提供：
- 事业发展规划
- 财富积累建议
- 人际关系处理
- 健康养生提醒
- 人生关键节点提醒

请用专业但通俗的语言，避免过多的术语，让读者能够轻松理解。每部分都要有具体、实用的建议。`;

      // 流式获取响应
      for await (const chunk of streamChat(reportPrompt, chart, 'general', [])) {
        fullContent += chunk;
        setReport(fullContent);
      }

      // 报告生成完成后保存到服务器
      try {
        const chartDetails = formatChartToReadableText(chart);
        const completeReport = `# 紫微斗数命盘分析报告\n\n生成时间: ${new Date().toLocaleString('zh-CN')}\n\n${chartDetails}\n\n## AI 分析报告\n\n${fullContent}`;

        const filename = `紫微斗数分析_${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日_${new Date().toISOString().slice(0, 10)}.md`;
        const result = await saveReportToServer(filename, completeReport);

        if (result.success) {
          console.log('✅ 报告已自动保存到服务器:', result.data);
        } else {
          console.warn('⚠️ 保存报告失败:', result.error);
        }

        // 存储报告内容到 store，供后续对话使用
        setReportContent(fullContent);
      } catch (saveError) {
        console.error('保存报告时出错:', saveError);
        // 即使保存失败，也存储报告内容到 store
        setReportContent(fullContent);
      }

      // 报告生成完成后，添加跟进提问消息（引导用户进行大限和流年分析）
      const currentInfo = getCurrentMajorPeriod(chart);
      if (currentInfo) {
        const followUpMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: buildFollowUpPrompt(currentInfo, chart),
          timestamp: new Date(),
          category: 'general',
        };
        addMessage(followUpMsg);
      }

      // 报告生成完成后进入报告页面
      setStep('report');
    } catch (error) {
      // 显示明确的错误提示
      const errorMsg = error instanceof Error ? error.message : 'API 调用失败';
      alert(`❌ 生成报告失败

${errorMsg}

请确保：
1. 后端服务正在运行（运行 npm run dev:backend）
2. 后端服务配置了正确的 API 密钥（DEEPSEEK_API_KEY 等）`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理分析类别选择
  const handleAnalysisCategorySelect = (category: AnalysisCategory) => {
    setCurrentCategory(category);
    
    // 添加系统消息
    if (messages.length === 0) {
      const systemMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `您好！我已经仔细分析了您的紫微斗数命盘。接下来我将为您解读「${getCategoryName(category)}」方面的运势。请问您有什么具体想了解的吗？`,
        timestamp: new Date(),
        category,
      };
      addMessage(systemMsg);
    }
  };

  // 获取类别名称
  const getCategoryName = (category: AnalysisCategory): string => {
    const names: Record<AnalysisCategory, string> = {
      career: '事业运势',
      wealth: '财运分析',
      relationship: '感情姻缘',
      health: '健康运势',
      family: '家庭亲缘',
      general: '综合分析',
      // 紫微专属
      ziweigeju: '紫微格局',
      sixi: '四化飞星',
      dashun: '大运分析',
      // 八字专属
      geju: '八字格局',
      yongshen: '用神分析',
      shishen: '十神分析',
      dayun: '大运流年',
      // 奇门遁甲专属
      jushi: '局数分析',
      men: '八门',
      xing: '九星',
      shen: '八神',
      // 六爻专属
      gua: '卦象分析',
      liuyaoyin: '六爻印',
      shiyin: '世应',
      // 手相专属
      xian: '手线',
      qiu: '丘位',
      zhi: '指型',
      wen: '纹理',
    };
    return names[category];
  };

  // 处理发送消息
  const handleSendMessage = useCallback(async (content: string) => {
    if (!chart || !currentCategory) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      category: currentCategory,
    };
    addMessage(userMsg);

    // 添加 AI 消息占位
    const aiMsgId = generateId();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      category: currentCategory,
      isStreaming: true,
    };
    addMessage(aiMsg);
    setIsLoading(true);

    try {
      let fullContent = '';

      // 构建对话历史：如果有报告内容，将其作为 system 消息添加到开头
      const messagesWithReport: ChatMessage[] = reportContent
        ? [
            {
              id: generateId(),
              role: 'system',
              content: `【已生成的命盘分析报告】\n\n${reportContent}\n\n请基于以上报告内容回答用户的问题，不要重复生成完整的报告，而是针对用户的具体问题进行分析。`,
              timestamp: new Date(),
            },
            ...messages,
          ]
        : messages;

      // 流式获取响应
      for await (const chunk of streamChat(content, chart, currentCategory, messagesWithReport)) {
        fullContent += chunk;
        updateMessage(aiMsgId, fullContent);
      }
    } catch (error) {
      // 显示明确的错误提示
      const errorMsg = error instanceof Error ? error.message : 'API 调用失败';
      updateMessage(aiMsgId, `❌ **API 调用失败**

${errorMsg}

请确保：
1. 后端服务正在运行（运行 \`npm run dev:backend\`）
2. 后端服务配置了正确的 API 密钥（DEEPSEEK_API_KEY 等）

如果问题持续存在，请联系管理员。`);
    } finally {
      setIsLoading(false);
    }
  }, [chart, currentCategory, messages, addMessage, updateMessage, setIsLoading, reportContent]);

  // 返回上一步
  const handleBack = () => {
    switch (step) {
      case 'birthInfo':
        setStep('category');
        break;
      case 'chart':
        setStep('birthInfo');
        break;
      case 'report':
        setStep('chart');
        setReport(null);
        break;
      case 'analysis':
        setStep('report');
        break;
      case 'palmistryForm':
        setStep('category');
        break;
      case 'palmistryResult':
        setStep('palmistryForm');
        resetPalmistry();
        break;
    }
  };

  // 重新开始
  const handleReset = () => {
    resetAll();
    resetPalmistry();
    setStep('category');
  };

  return (
    <div className="min-h-screen relative">
      {/* 星空背景 */}
      <StarField />

      {/* 主内容 */}
      <div className="relative z-10">
        {/* 顶部导航 */}
        {step !== 'category' && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-cosmic-dark/80 backdrop-blur-xl border-b border-white/10"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </button>

              <h1 className="font-display text-lg font-bold">
                <span className="text-gradient-gold">紫微</span>
                <span className="text-white">斗数</span>
              </h1>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="hidden sm:inline">重新开始</span>
              </button>
            </div>
          </motion.header>
        )}

        {/* 页面内容 */}
        <AnimatePresence mode="wait">
          {step === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CategorySelect onSelect={handleCategorySelect} />
            </motion.div>
          )}

          {step === 'birthInfo' && (
            <motion.div
              key="birthInfo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-16"
            >
              <BirthInfoForm
                onSubmit={handleBirthInfoSubmit}
                onBack={handleBack}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === 'chart' && chart && (
            <motion.div
              key="chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-20 pb-8 px-4"
            >
              <div className="max-w-7xl mx-auto">
                {/* 命盘显示 */}
                <ChartDisplay chart={chart} />

                {/* 进入分析按钮 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="btn-gold text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        生成报告中...
                      </span>
                    ) : '生成综合报告'}
                  </button>
                  <button
                    onClick={handleEnterAnalysis}
                    className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    直接对话解读
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 'report' && chart && report && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ComprehensiveReport
                chart={chart}
                reportContent={report}
                onBack={handleBack}
                onStartAnalysis={handleEnterAnalysis}
              />
            </motion.div>
          )}

          {step === 'analysis' && chart && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen pt-14"
            >
              <div className="h-full flex">
                {/* 侧边栏 - 命盘概览 (桌面端) */}
                <div className="hidden lg:block w-80 flex-shrink-0 border-r border-white/10 overflow-y-auto">
                  <div className="p-4">
                    <h3 className="font-display text-lg font-bold text-white mb-4">命盘概览</h3>

                    {/* 简化的命盘信息 */}
                    <div className="space-y-4">
                      <div className="glass-card p-4">
                        <div className="text-sm text-gray-400 mb-2">基本信息</div>
                        <div className="space-y-1 text-sm">
                          <div>命主：<span className="text-destiny-400">{chart.soulStar}</span></div>
                          <div>身主：<span className="text-cosmic-gold">{chart.bodyStar}</span></div>
                          <div>五行局：<span className="text-cyan-400">{chart.fiveElementType}</span></div>
                        </div>
                      </div>

                      <div className="glass-card p-4">
                        <div className="text-sm text-gray-400 mb-2">命宫主星</div>
                        <div className="flex flex-wrap gap-2">
                          {chart.palaces
                            .find(p => p.name === '命宫')
                            ?.majorStars.map((star, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded bg-destiny-600/30 text-destiny-300 text-sm"
                              >
                                {star.name}
                              </span>
                            )) || (
                              <span className="text-gray-500">空宫</span>
                            )}
                        </div>
                      </div>

                      {/* 分析类别选择 */}
                      <div className="mt-6">
                        <AnalysisCategorySelector
                          onSelect={handleAnalysisCategorySelect}
                          selectedCategory={currentCategory}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 移动端侧边栏 */}
                <AnimatePresence>
                  {isSidebarOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsSidebarOpen(false)}
                      />
                      <motion.div
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        className="lg:hidden fixed left-0 top-14 bottom-0 w-80 bg-cosmic-dark border-r border-white/10 z-50 overflow-y-auto"
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-display text-lg font-bold text-white">命盘概览</h3>
                            <button
                              onClick={() => setIsSidebarOpen(false)}
                              className="p-2 hover:bg-white/10 rounded-lg"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <AnalysisCategorySelector
                            onSelect={(cat) => {
                              handleAnalysisCategorySelect(cat);
                              setIsSidebarOpen(false);
                            }}
                            selectedCategory={currentCategory}
                          />
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* 聊天区域 */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* 移动端菜单按钮 */}
                  <div className="lg:hidden px-4 py-2 border-b border-white/10">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="flex items-center gap-2 text-gray-400"
                    >
                      <Menu className="w-5 h-5" />
                      <span>选择分析类别</span>
                    </button>
                  </div>

                  {/* 聊天界面 */}
                  <div className="flex-1 min-h-0">
                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      currentCategory={currentCategory}
                      onCategoryChange={handleAnalysisCategorySelect}
                      chart={chart}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 手相表单 */}
          {step === 'palmistryForm' && (
            <motion.div
              key="palmistryForm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-16"
            >
              <PalmistryForm
                onSubmit={handlePalmistrySubmit}
              />
            </motion.div>
          )}

          {/* 手相分析结果 */}
          {step === 'palmistryResult' && palmReading && (
            <motion.div
              key="palmistryResult"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PalmistryDisplay
                palmReading={palmReading}
                onBack={handleBack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
