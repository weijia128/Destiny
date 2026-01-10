import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, ArrowLeft, Sparkles } from 'lucide-react';
import type { BirthInfo } from '@/types';
import { HOURS, YEAR_RANGE } from '@/utils/constants';

interface BirthInfoFormProps {
  onSubmit: (info: BirthInfo) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BirthInfoForm({ onSubmit, onBack, isLoading }: BirthInfoFormProps) {
  const [year, setYear] = useState<number>(1990);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [hour, setHour] = useState<number>(12);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [isLunar, setIsLunar] = useState<boolean>(false);

  // 生成年份选项
  const years = useMemo(() => {
    const arr = [];
    for (let y = YEAR_RANGE.max; y >= YEAR_RANGE.min; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  // 根据年月计算天数
  const daysInMonth = useMemo(() => {
    if (isLunar) return 30; // 农历简化处理
    return new Date(year, month, 0).getDate();
  }, [year, month, isLunar]);

  // 生成日期选项
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      year,
      month,
      day: Math.min(day, daysInMonth),
      hour,
      gender,
      isLunar,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>

        {/* 卡片 */}
        <div className="glass-card p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destiny-600/20 border border-destiny-500/30 mb-4">
              <Sparkles className="w-8 h-8 text-destiny-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              紫微斗数排盘
            </h2>
            <p className="text-gray-400">
              请输入出生信息以生成命盘
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 历法选择 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">历法</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsLunar(false)}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${!isLunar
                      ? 'bg-destiny-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  阳历（公历）
                </button>
                <button
                  type="button"
                  onClick={() => setIsLunar(true)}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${isLunar
                      ? 'bg-destiny-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  农历（阴历）
                </button>
              </div>
            </div>

            {/* 出生日期 */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                出生日期
              </label>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="select-cosmic"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="select-cosmic"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="select-cosmic"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 出生时辰 */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                出生时辰
              </label>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="select-cosmic"
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
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
                  onClick={() => setGender('male')}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${gender === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`
                    py-3 px-4 rounded-xl font-medium transition-all
                    ${gender === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }
                  `}
                >
                  女
                </button>
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  排盘中...
                </span>
              ) : (
                '开始排盘'
              )}
            </button>
          </form>
        </div>

        {/* 提示 */}
        <p className="text-center text-gray-500 text-sm mt-6">
          出生时间越准确，命盘分析越精准
        </p>
      </motion.div>
    </div>
  );
}
