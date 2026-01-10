import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ZiweiChart, Palace, Star } from '@/types';
import { BRIGHTNESS_LEVELS } from '@/utils/constants';
import { PalaceDetailModal } from './PalaceDetailModal';

interface ChartDisplayProps {
  chart: ZiweiChart;
}

export function ChartDisplay({ chart }: ChartDisplayProps) {
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 紫微斗数命盘布局：4x4 格子，中间空
  const layout = [
    ['巳', '午', '未', '申'],
    ['辰', null, null, '酉'],
    ['卯', null, null, '戌'],
    ['寅', '丑', '子', '亥'],
  ];

  const getPalaceByBranch = (branch: string): Palace | undefined => {
    return chart.palaces.find(p => p.branch === branch);
  };

  const handlePalaceClick = (palace: Palace) => {
    setSelectedPalace(palace);
    setIsModalOpen(true);
  };

  const renderStar = (star: Star, index: number, showBrightness = true) => {
    const brightness = star.brightness ? BRIGHTNESS_LEVELS[star.brightness] : null;

    // 根据星曜类型和亮度选择颜色
    const getStarColor = () => {
      const level = brightness?.level ?? 0;
      if (star.type === 'major') {
        if (level >= 5) return 'text-yellow-300 drop-shadow-[0_0_3px_rgba(253,224,71,0.5)]';
        if (level >= 3) return 'text-yellow-200';
        return 'text-yellow-100/70';
      }
      if (star.type === 'minor') {
        if (level >= 5) return 'text-cyan-300';
        return 'text-cyan-200/70';
      }
      return 'text-gray-400/70';
    };

    return (
      <span
        key={`${star.name}-${index}`}
        className={`
          text-[11px] font-medium inline-block
          ${getStarColor()}
        `}
        title={`${star.name}${star.brightness ? ` - ${star.brightness}（${brightness?.description}）` : ''}`}
      >
        {star.name}
        {showBrightness && star.brightness && (
          <sup className="text-[9px] ml-0.5 opacity-60">{star.brightness.charAt(0)}</sup>
        )}
      </span>
    );
  };

  const renderPalace = (palace: Palace) => {
    const isLifePalace = palace.name === '命宫';

    // 计算星曜总数
    const totalStars = palace.majorStars.length + palace.minorStars.length + palace.otherStars.length;

    return (
      <motion.div
        whileHover={{ scale: 1.03, zIndex: 10 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handlePalaceClick(palace)}
        className={`
          relative aspect-square palace-cell cursor-pointer overflow-hidden
          transition-all duration-300
          ${isLifePalace
            ? 'border-2 border-destiny-500/60 bg-gradient-to-br from-destiny-900/40 to-purple-900/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
            : 'border border-destiny-700/40 bg-cosmic-dark/40'
          }
          hover:border-destiny-500/40 hover:bg-destiny-900/20
        `}
      >
        {/* 宫位名称 */}
        <div className="flex justify-between items-start mb-1.5">
          <span className={`
            text-xs font-bold tracking-wider
            ${isLifePalace ? 'text-destiny-300' : 'text-gray-300'}
          `}>
            {palace.name}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {palace.stem}{palace.branch}
          </span>
        </div>

        {/* 主星区域 */}
        {palace.majorStars.length > 0 ? (
          <div className="flex flex-wrap gap-0.5 mb-1">
            {palace.majorStars.map((star, i) => renderStar(star, i, false))}
          </div>
        ) : (
          <div className="text-[10px] text-gray-600 mb-1">空宫</div>
        )}

        {/* 辅星和四化 */}
        <div className="space-y-0.5">
          {/* 辅星（最多显示3颗） */}
          {palace.minorStars.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {palace.minorStars.slice(0, 3).map((star, i) => (
                <span key={i} className="text-[9px] text-cyan-300/70">
                  {star.name}
                </span>
              ))}
              {palace.minorStars.length > 3 && (
                <span className="text-[9px] text-gray-500">+{palace.minorStars.length - 3}</span>
              )}
            </div>
          )}

          {/* 四化标签 */}
          {palace.transformations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {palace.transformations.map((t, i) => {
                const colors = {
                  '化禄': 'bg-green-500/25 text-green-300 border-green-500/40',
                  '化权': 'bg-orange-500/25 text-orange-300 border-orange-500/40',
                  '化科': 'bg-blue-500/25 text-blue-300 border-blue-500/40',
                  '化忌': 'bg-red-500/25 text-red-300 border-red-500/40',
                };
                return (
                  <span
                    key={i}
                    className={`
                      text-[8px] px-1 py-0.5 rounded border
                      ${colors[t.type] || 'bg-gray-500/20 text-gray-400'}
                    `}
                  >
                    {t.star.slice(0, 1)}{t.type.slice(1)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 大限年龄 */}
        {palace.majorPeriod && (
          <div className="absolute bottom-1 right-1 text-[9px] text-purple-400/70 font-mono">
            {palace.majorPeriod.startAge}-{palace.majorPeriod.endAge}
          </div>
        )}

        {/* 星曜数量指示 */}
        {totalStars > 0 && (
          <div className="absolute top-1 right-1 text-[8px] text-gray-600">
            {totalStars}
          </div>
        )}

        {/* 命宫/身宫标识 */}
        {isLifePalace && (
          <div className="absolute bottom-1 left-1">
            <span className="text-[8px] px-1 py-0.5 rounded bg-destiny-500/30 text-destiny-300 border border-destiny-500/50">
              命
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* 命盘标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="font-display text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-destiny-300 via-purple-300 to-cosmic-gold mb-4">
          紫微斗数命盘
        </h2>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm">
          <div className="px-4 py-2 rounded-lg bg-destiny-900/30 border border-destiny-700/30">
            <span className="text-gray-400">命主：</span>
            <span className="ml-1 text-destiny-300 font-bold">{chart.soulStar}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-cosmic-gold/10 border border-cosmic-gold/30">
            <span className="text-gray-400">身主：</span>
            <span className="ml-1 text-cosmic-gold font-bold">{chart.bodyStar}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-cyan-900/30 border border-cyan-700/30">
            <span className="text-gray-400">五行局：</span>
            <span className="ml-1 text-cyan-300 font-bold">{chart.fiveElementType}</span>
          </div>
        </div>
      </motion.div>

      {/* 命盘格子 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="grid grid-cols-4 gap-1.5 bg-gradient-to-br from-cosmic-purple/20 via-cosmic-dark/40 to-destiny-900/20 p-3 rounded-2xl border border-destiny-700/40 shadow-2xl">
          {layout.flat().map((branch, index) => {
            if (branch === null) {
              // 中间空格 - 显示基本信息
              const isTopLeft = index === 5;
              const isTopRight = index === 6;
              const isBottomLeft = index === 9;
              const isBottomRight = index === 10;

              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square bg-cosmic-dark/60 backdrop-blur-sm flex items-center justify-center p-2 rounded-lg border border-destiny-700/20"
                >
                  {isTopLeft && (
                    <div className="text-center text-xs text-gray-400">
                      <div className="text-destiny-400 font-display text-sm mb-1.5">出生信息</div>
                      <div className="text-white font-bold">{chart.birthInfo.year}年</div>
                      <div className="text-gray-300">{chart.birthInfo.month}月{chart.birthInfo.day}日</div>
                    </div>
                  )}
                  {isTopRight && (
                    <div className="text-center text-xs">
                      <div className="text-cosmic-gold font-display text-sm mb-1.5">性别</div>
                      <div className="text-lg font-bold">
                        {chart.birthInfo.gender === 'male' ? '♂ 男' : '♀ 女'}
                      </div>
                    </div>
                  )}
                  {isBottomLeft && (
                    <div className="text-center text-xs text-gray-400">
                      <div className="text-cyan-400 font-display text-sm mb-1.5">五行局</div>
                      <div className="text-white font-bold">{chart.fiveElementType}</div>
                    </div>
                  )}
                  {isBottomRight && (
                    <div className="text-center text-xs text-gray-400">
                      <div className="text-pink-400 font-display text-sm mb-1.5">命身主</div>
                      <div className="text-white font-bold">{chart.soulStar}</div>
                      <div className="text-gray-300">{chart.bodyStar}</div>
                    </div>
                  )}
                </div>
              );
            }

            const palace = getPalaceByBranch(branch);
            if (!palace) {
              return (
                <div
                  key={branch}
                  className="aspect-square palace-cell flex items-center justify-center"
                >
                  <span className="text-gray-600 text-lg font-mono">{branch}</span>
                </div>
              );
            }

            return (
              <div key={branch} className="aspect-square">
                {renderPalace(palace)}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 图例 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-6 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-yellow-300/40 border border-yellow-500/50 shadow-[0_0_8px_rgba(253,224,71,0.3)]"></span>
          <span className="text-gray-400">主星</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-cyan-300/40 border border-cyan-500/50"></span>
          <span className="text-gray-400">辅星</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-green-500/40 border border-green-500/50"></span>
          <span className="text-gray-400">化禄</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-orange-500/40 border border-orange-500/50"></span>
          <span className="text-gray-400">化权</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-500/50"></span>
          <span className="text-gray-400">化科</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500/50"></span>
          <span className="text-gray-400">化忌</span>
        </div>
      </motion.div>

      {/* 提示信息 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-center text-xs text-gray-500"
      >
        点击宫位查看详细信息
      </motion.div>

      {/* 宫位详情模态框 */}
      <PalaceDetailModal
        palace={selectedPalace}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
