import { motion } from 'framer-motion';
import { MAIN_CATEGORIES } from '@/utils/constants';

interface CategorySelectProps {
  onSelect: (categoryId: string) => void;
}

export function CategorySelect({ onSelect }: CategorySelectProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-5xl w-full">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-gradient-gold">天机</span>
            <span className="text-white">命理</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            探索古老智慧，洞察命运奥秘
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-destiny-500 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-destiny-500" />
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-destiny-500 to-transparent" />
          </div>
        </motion.div>

        {/* 分类卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MAIN_CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              onClick={() => onSelect(category.id)}
              className={`
                relative group p-8 rounded-2xl text-left
                glass-card overflow-hidden
                hover:scale-[1.02] transition-all duration-500
                ${category.id === 'ziwei' ? 'md:col-span-2' : ''}
              `}
            >
              {/* 背景渐变 */}
              <div className={`
                absolute inset-0 opacity-0 group-hover:opacity-20
                bg-gradient-to-br ${category.color}
                transition-opacity duration-500
              `} />

              {/* 光效 */}
              <div className="absolute top-0 right-0 w-64 h-64 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className={`
                  absolute inset-0 blur-3xl
                  bg-gradient-to-br ${category.color}
                  opacity-30
                `} />
              </div>

              <div className="relative z-10">
                <span className="text-5xl mb-4 block">{category.icon}</span>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                  {category.name}
                </h2>
                <p className="text-gray-400 text-base">
                  {category.description}
                </p>

                {/* 特殊标记：紫微斗数 */}
                {category.id === 'ziwei' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destiny-600/30 border border-destiny-500/30">
                    <span className="w-2 h-2 rounded-full bg-destiny-400 animate-pulse" />
                    <span className="text-sm text-destiny-300">推荐体验</span>
                  </div>
                )}

                {/* 特殊标记：梅花易数 */}
                {category.id === 'meihua' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-600/20 border border-cyan-500/30">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-sm text-cyan-200">Beta</span>
                  </div>
                )}

                {/* 其他分类标记：开发中 */}
                {category.id !== 'ziwei' && category.id !== 'meihua' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-sm text-gray-500">即将开放</span>
                  </div>
                )}
              </div>

              {/* 箭头 */}
              <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
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

        {/* 底部装饰 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm">
            基于古典命理学与现代 AI 技术
          </p>
        </motion.div>
      </div>
    </div>
  );
}
