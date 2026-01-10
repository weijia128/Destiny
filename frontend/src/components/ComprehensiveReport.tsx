import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Sparkles, Calendar, User, Clock, Star as StarIcon, SparklesIcon, Download } from 'lucide-react';
import type { ZiweiChart } from '@/types';
import { ExportService } from '@/services/exportService';
import { getHourName } from '@/services/chartService';

interface ComprehensiveReportProps {
  chart: ZiweiChart;
  reportContent: string;
  onBack: () => void;
  onStartAnalysis: () => void;
}

export function ComprehensiveReport({
  chart,
  reportContent,
  onBack,
  onStartAnalysis,
}: ComprehensiveReportProps) {
  // 导出 Markdown 文件
  const handleExport = () => {
    ExportService.exportSimpleReport(chart, reportContent);
  };

  // 格式化报告内容，将标题高亮
  const formatReportContent = (content: string) => {
    // 将 Markdown 格式转换为 HTML
    return content
      // 处理分隔线
      .replace(/^----------$/gim, '<hr class="my-4 border-destiny-700/50" />')
      // 处理标题
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-destiny-300 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-destiny-300 to-cosmic-gold mt-6 mb-4">$1</h1>')
      // 处理宫位标题（格式：【宫位名称】）
      .replace(/【(.*?)】/g, '<span class="text-lg font-bold text-cosmic-gold">【$1】</span>')
      // 处理加粗
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-destiny-200">$1</strong>')
      // 处理斜体
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
      // 处理列表项（以 - 开头或数字开头）
      .replace(/^[\-•]\s*(.*$)/gim, '<li class="ml-4 text-gray-300 my-1">$1</li>')
      // 处理编号列表
      .replace(/^\d+\.\s*(.*$)/gim, '<li class="ml-4 text-gray-300 my-1">$1</li>')
      // 处理冒号开头的行（键值对格式）
      .replace(/^(.*?)[：:]\s*(.*$)/gim, '<div class="my-2"><span class="text-destiny-300">$1：</span><span class="text-gray-200">$2</span></div>')
      // 处理段落
      .replace(/\n\n+/g, '</p><p class="text-gray-300 my-3">')
      // 处理单个换行
      .replace(/\n/g, '<br />')
      // 处理剩余的纯文本段落
      .replace(/^(?!<[h|l|d|s|p])/gm, '<p class="text-gray-300 my-3">');
  };

  return (
    <div className="min-h-screen">
      {/* 顶部导航栏 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-cosmic-dark/80 backdrop-blur-xl border-b border-destiny-700/30 px-4 py-4"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回命盘</span>
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-destiny-400" />
            <span className="text-white font-bold">命盘综合报告</span>
          </div>
          <div className="w-20"></div>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 命盘基本信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destiny-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">紫微斗数综合分析报告</h2>
              <p className="text-gray-400 text-sm">基于您的出生信息生成的命理解读</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-destiny-400" />
              <div>
                <div className="text-xs text-gray-500">出生日期</div>
                <div className="text-white text-sm">
                  {chart.birthInfo.year}年{chart.birthInfo.month}月{chart.birthInfo.day}日
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs text-gray-500">出生时辰</div>
                <div className="text-white text-sm">
                  {getHourName(chart.birthInfo.hour)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-pink-400" />
              <div>
                <div className="text-xs text-gray-500">性别</div>
                <div className="text-white text-sm">
                  {chart.birthInfo.gender === 'male' ? '男' : '女'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cosmic-gold" />
              <div>
                <div className="text-xs text-gray-500">命主</div>
                <div className="text-white text-sm">{chart.soulStar}</div>
              </div>
            </div>
            {chart.zodiacSign && (
              <div className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs text-gray-500">星座</div>
                  <div className="text-white text-sm">{chart.zodiacSign}</div>
                </div>
              </div>
            )}
            {chart.zodiacAnimal && (
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs text-gray-500">生肖</div>
                  <div className="text-white text-sm">{chart.zodiacAnimal}</div>
                </div>
              </div>
            )}
          </div>

          {/* 八字信息 */}
          {chart.bazi && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
              <div className="text-xs text-gray-400 mb-2">八字四柱</div>
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-[10px] text-gray-500">年柱</div>
                  <div className="text-lg font-bold text-purple-300">{chart.bazi.year}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">月柱</div>
                  <div className="text-lg font-bold text-indigo-300">{chart.bazi.month}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">日柱</div>
                  <div className="text-lg font-bold text-blue-300">{chart.bazi.day}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">时柱</div>
                  <div className="text-lg font-bold text-cyan-300">{chart.bazi.hour}</div>
                </div>
              </div>
            </div>
          )}

          {/* 更多命盘信息 */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-cosmic-dark/40 border border-destiny-700/30">
              <div className="text-[10px] text-gray-500 mb-1">身主</div>
              <div className="text-sm font-bold text-cosmic-gold">{chart.bodyStar}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-cosmic-dark/40 border border-destiny-700/30">
              <div className="text-[10px] text-gray-500 mb-1">五行局</div>
              <div className="text-sm font-bold text-cyan-300">{chart.fiveElementType}</div>
            </div>
            {chart.bodyPalaceBranch && (
              <div className="text-center p-3 rounded-lg bg-cosmic-dark/40 border border-destiny-700/30">
                <div className="text-[10px] text-gray-500 mb-1">身宫位置</div>
                <div className="text-sm font-bold text-purple-300">{chart.bodyPalaceBranch}</div>
              </div>
            )}
            {chart.originalPalace && (
              <div className="text-center p-3 rounded-lg bg-cosmic-dark/40 border border-destiny-700/30">
                <div className="text-[10px] text-gray-500 mb-1">来因宫</div>
                <div className="text-sm font-bold text-pink-300">{chart.originalPalace}</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI 分析报告内容 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 sm:p-8"
        >
          <div
            className="prose prose-invert prose-purple max-w-none"
            dangerouslySetInnerHTML={{
              __html: formatReportContent(reportContent),
            }}
          />
        </motion.div>

        {/* 底部操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={onStartAnalysis}
            className="btn-gold text-lg px-8 py-4"
          >
            开始详细对话解读
          </button>
          <button
            onClick={handleExport}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            导出报告
          </button>
          <button
            onClick={onBack}
            className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            返回查看命盘
          </button>
        </motion.div>
      </div>
    </div>
  );
}
