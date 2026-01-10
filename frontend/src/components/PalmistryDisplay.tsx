import { motion } from 'framer-motion';
import { ArrowLeft, Download, Heart, Briefcase, DollarSign, Brain, Activity } from 'lucide-react';
import type { PalmReading } from '@/types';

interface PalmistryDisplayProps {
  palmReading: PalmReading;
  onBack: () => void;
}

export function PalmistryDisplay({ palmReading, onBack }: PalmistryDisplayProps) {
  const handleExport = () => {
    const content = `# 手相占卜分析报告

## 基本信息
- 出生日期：${palmReading.birthInfo.year}年${palmReading.birthInfo.month}月${palmReading.birthInfo.day}日
- 性别：${palmReading.birthInfo.gender === 'male' ? '男' : '女'}
- 历法：${palmReading.birthInfo.isLunar ? '农历' : '阳历'}

## 总体分析
${palmReading.overallAnalysis}

## 性格特质
${palmReading.personalityAnalysis}

## 事业运势
${palmReading.careerAnalysis}

## 财运分析
${palmReading.wealthAnalysis}

## 感情运势
${palmReading.relationshipAnalysis}

## 健康运势
${palmReading.healthAnalysis}

## 建议
${palmReading.recommendations.map(rec => `- ${rec}`).join('\n')}

---
生成时间：${palmReading.createdAt.toLocaleString()}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `手相分析_${palmReading.birthInfo.year}年${palmReading.birthInfo.month}月${palmReading.birthInfo.day}日.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const features = [
    {
      title: '性格特质',
      icon: Brain,
      content: palmReading.personalityAnalysis,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      title: '事业运势',
      icon: Briefcase,
      content: palmReading.careerAnalysis,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: '财运分析',
      icon: DollarSign,
      content: palmReading.wealthAnalysis,
      color: 'from-yellow-500 to-orange-600'
    },
    {
      title: '感情运势',
      icon: Heart,
      content: palmReading.relationshipAnalysis,
      color: 'from-pink-500 to-rose-600'
    },
    {
      title: '健康运势',
      icon: Activity,
      content: palmReading.healthAnalysis,
      color: 'from-green-500 to-emerald-600'
    },
  ];

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-cosmic-dark/80 backdrop-blur-xl border-b border-emerald-700/30 px-4 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <h1 className="text-white font-bold text-lg">手相分析报告</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 基本信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <span className="text-2xl">✋</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">手相分析报告</h2>
              <p className="text-gray-400">基于传统手相学理论的智能分析</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
              <div className="text-sm text-gray-400">出生日期</div>
              <div className="text-emerald-300 font-bold">
                {palmReading.birthInfo.year}.{palmReading.birthInfo.month}.{palmReading.birthInfo.day}
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
              <div className="text-sm text-gray-400">性别</div>
              <div className="text-blue-300 font-bold">
                {palmReading.birthInfo.gender === 'male' ? '男' : '女'}
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
              <div className="text-sm text-gray-400">历法</div>
              <div className="text-purple-300 font-bold">
                {palmReading.birthInfo.isLunar ? '农历' : '阳历'}
              </div>
            </div>
            <div className="text-center p-4 rounded-xl bg-orange-900/20 border border-orange-500/30">
              <div className="text-sm text-gray-400">分析项目</div>
              <div className="text-orange-300 font-bold">{palmReading.features.length}</div>
            </div>
          </div>
        </motion.div>

        {/* 总体分析 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🔮</span>
            总体分析
          </h3>
          <div className="prose prose-invert prose-emerald max-w-none">
            <p className="text-gray-300 leading-relaxed">{palmReading.overallAnalysis}</p>
          </div>
        </motion.div>

        {/* 详细分析网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-gray-300 leading-relaxed">{feature.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 手相特征 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            手相特征识别
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {palmReading.features.map((feature, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {feature.type === 'line' ? '📏' :
                     feature.type === 'mount' ? '⛰️' :
                     feature.type === 'mark' ? '⭐' : '👆'}
                  </span>
                  <span className="font-medium text-white">{feature.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    feature.strength === 'strong' ? 'bg-red-500/20 text-red-300' :
                    feature.strength === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {feature.strength === 'strong' ? '强' :
                     feature.strength === 'medium' ? '中' : '弱'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{feature.description}</p>
                <p className="text-emerald-300 text-sm mt-2">{feature.meaning}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 建议 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            人生建议
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {palmReading.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-emerald-100">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-300 text-sm">
              ⚠️ 手相分析结果仅供参考，命运掌握在自己手中
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
