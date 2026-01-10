import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { AnalysisCategory } from '@/types';
import { ANALYSIS_CATEGORIES } from '@/utils/constants';

interface AnalysisCategorySelectorProps {
  onSelect: (category: AnalysisCategory) => void;
  selectedCategory?: AnalysisCategory | null;
}

export function AnalysisCategorySelector({ onSelect, selectedCategory }: AnalysisCategorySelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-300 mb-4 text-center">
        选择要分析的方面
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ANALYSIS_CATEGORIES.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(category.id)}
            className={`
              relative group p-4 rounded-xl text-left transition-all duration-300
              ${selectedCategory === category.id
                ? 'bg-destiny-600/30 border-destiny-500/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
              }
              border
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white mb-1">{category.name}</h4>
                <p className="text-xs text-gray-400 line-clamp-2">{category.description}</p>
              </div>
            </div>
            
            {/* 选中指示 */}
            {selectedCategory === category.id && (
              <motion.div
                layoutId="category-indicator"
                className="absolute inset-0 rounded-xl border-2 border-destiny-500 pointer-events-none"
              />
            )}
            
            {/* 箭头 */}
            <ArrowRight className={`
              absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
              transition-all duration-300
              ${selectedCategory === category.id 
                ? 'text-destiny-400 translate-x-0 opacity-100' 
                : 'text-gray-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
              }
            `} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
