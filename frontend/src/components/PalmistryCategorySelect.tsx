import { motion } from 'framer-motion';
import { PALM_ANALYSIS_CATEGORIES } from '@/utils/constants';
import type { PalmAnalysisCategory } from '@/types';

interface PalmistryCategorySelectProps {
  onSelect: (categoryId: PalmAnalysisCategory) => void;
}

export function PalmistryCategorySelect({ onSelect }: PalmistryCategorySelectProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="text-6xl mb-4">✋</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="text-gradient-gold">手相</span>
            <span className="text-white">占卜</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            观手识人，解读命运密码
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          </div>
        </motion.div>

        {/* 分析类别网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PALM_ANALYSIS_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => onSelect(category.id)}
              className="group p-6 rounded-2xl text-left glass-card overflow-hidden hover:scale-[1.02] transition-all duration-500"
            >
              {/* 背景渐变 */}
              <div className={`
                absolute inset-0 opacity-0 group-hover:opacity-20
                bg-gradient-to-br ${category.color}
                transition-opacity duration-500
              `} />

              <div className="relative z-10">
                <div className="text-3xl mb-3">{category.icon}</div>
                <h3 className="font-bold text-white text-lg mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  {category.description}
                </p>
              </div>

              {/* 箭头 */}
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          ))}
        </div>

        {/* 底部说明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-12 text-center"
        >
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
            <h3 className="text-emerald-300 font-bold mb-3">🔮 手相占卜须知</h3>
            <div className="text-gray-400 text-sm space-y-2">
              <p>• 手相分析基于传统手相学理论与现代心理学</p>
              <p>• 建议在光线充足的环境下观察手相特征</p>
              <p>• 分析结果仅供参考，命运掌握在自己手中</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
