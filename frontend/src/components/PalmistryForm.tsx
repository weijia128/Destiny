import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Camera } from 'lucide-react';
import type { BirthInfo, PalmAnalysisCategory } from '@/types';

interface PalmistryFormProps {
  onSubmit: (birthInfo: BirthInfo, category: PalmAnalysisCategory) => void;
}

export function PalmistryForm({ onSubmit }: PalmistryFormProps) {
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    year: 1990,
    month: 1,
    day: 1,
    hour: 12,
    gender: 'male',
    isLunar: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(birthInfo, 'overall');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="text-5xl mb-4">✋</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient-gold">手相</span>
            <span className="text-white">占卜</span>
          </h1>
          <p className="text-gray-400">
            请提供准确的出生信息以获得更精准的手相分析
          </p>
        </motion.div>

        {/* 表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 出生日期 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  年
                </label>
                <select
                  value={birthInfo.year}
                  onChange={(e) => setBirthInfo({ ...birthInfo, year: Number(e.target.value) })}
                  className="select-cosmic"
                >
                  {Array.from({ length: 100 }, (_, i) => 1924 + i).map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">月</label>
                <select
                  value={birthInfo.month}
                  onChange={(e) => setBirthInfo({ ...birthInfo, month: Number(e.target.value) })}
                  className="select-cosmic"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">日</label>
                <select
                  value={birthInfo.day}
                  onChange={(e) => setBirthInfo({ ...birthInfo, day: Number(e.target.value) })}
                  className="select-cosmic"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 历法选择 */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">历法类型</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBirthInfo({ ...birthInfo, isLunar: false })}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${!birthInfo.isLunar
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  阳历
                </button>
                <button
                  type="button"
                  onClick={() => setBirthInfo({ ...birthInfo, isLunar: true })}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${birthInfo.isLunar
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  农历
                </button>
              </div>
            </div>

            {/* 性别 */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <User className="w-4 h-4" />
                性别
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'male' })}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${birthInfo.gender === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => setBirthInfo({ ...birthInfo, gender: 'female' })}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${birthInfo.gender === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  女
                </button>
              </div>
            </div>

            {/* 手相上传提示 */}
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">手相拍照指南</span>
              </div>
              <div className="text-gray-400 text-sm space-y-1">
                <p>• 确保手部清晰，光线充足</p>
                <p>• 手掌平展，五指自然分开</p>
                <p>• 建议同时拍摄左右手</p>
                <p>• 照片将用于AI智能分析</p>
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-emerald disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  分析中...
                </span>
              ) : (
                '开始手相分析'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
