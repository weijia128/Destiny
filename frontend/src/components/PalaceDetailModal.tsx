import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Star, Crown } from 'lucide-react';
import type { Palace } from '@/types';
import { BRIGHTNESS_LEVELS } from '@/utils/constants';

interface PalaceDetailModalProps {
  palace: Palace | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PalaceDetailModal({ palace, isOpen, onClose }: PalaceDetailModalProps) {
  if (!palace) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* 标题栏 */}
              <div className="sticky top-0 bg-cosmic-dark/95 backdrop-blur-sm border-b border-destiny-700/30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destiny-600 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{palace.name}</h3>
                    <p className="text-sm text-gray-400">
                      {palace.stem}{palace.branch}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-6">
                {/* 主星 */}
                {palace.majorStars.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <h4 className="text-sm font-bold text-yellow-300">主星</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {palace.majorStars.map((star, i) => {
                        const brightness = star.brightness ? BRIGHTNESS_LEVELS[star.brightness] : null;
                        return (
                          <div
                            key={i}
                            className={`
                              p-3 rounded-xl border
                              ${brightness
                                ? `${brightness.color.replace('text-', 'border-').replace('text-', 'bg-')} bg-opacity-10`
                                : 'border-gray-700 bg-gray-800/30'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white">{star.name}</span>
                              {star.brightness && (
                                <span className={`text-xs ${brightness?.color || 'text-gray-400'}`}>
                                  {star.brightness}
                                </span>
                              )}
                            </div>
                            {brightness && (
                              <div className="text-xs text-gray-400">
                                {brightness.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 辅星 */}
                {palace.minorStars.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-cyan-300">辅星</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {palace.minorStars.map((star, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm"
                        >
                          {star.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 杂耀 */}
                {palace.otherStars.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-3">杂耀</h4>
                    <div className="flex flex-wrap gap-2">
                      {palace.otherStars.map((star, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-md bg-gray-700/30 text-gray-400 text-xs"
                        >
                          {star.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 四化 */}
                {palace.transformations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-3">四化</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {palace.transformations.map((t, i) => {
                        const colors = {
                          '化禄': 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-300',
                          '化权': 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-300',
                          '化科': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300',
                          '化忌': 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-300',
                        };
                        return (
                          <div
                            key={i}
                            className={`
                              px-4 py-2 rounded-lg border bg-gradient-to-r
                              ${colors[t.type] || 'bg-gray-700/30 border-gray-600'}
                            `}
                          >
                            <div className="font-bold">{t.star}</div>
                            <div className="text-xs opacity-80">{t.type}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 大限 */}
                {palace.majorPeriod && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-2">大限</h4>
                    <div className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <span className="text-purple-300">
                        {palace.majorPeriod.startAge} - {palace.majorPeriod.endAge} 岁
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
