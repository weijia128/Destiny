/**
 * 八字命盘展示组件
 * 展示四柱、五行统计、大运、喜用神
 */

import { motion } from 'framer-motion';
import type { BaziChartData } from '@/services/api';

const WUXING_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  木: { text: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/40' },
  火: { text: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/40' },
  土: { text: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
  金: { text: 'text-gray-300', bg: 'bg-gray-300/20', border: 'border-gray-300/40' },
  水: { text: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/40' },
};

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'];

interface Props {
  chart: BaziChartData;
  onStartAnalysis: () => void;
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
}

export function BaziChartDisplay({ chart, onStartAnalysis, birthYear, birthMonth = 1, birthDay = 1 }: Props) {
  const pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  const now = new Date();
  const hadBirthdayThisYear =
    now.getMonth() + 1 > birthMonth ||
    (now.getMonth() + 1 === birthMonth && now.getDate() >= birthDay);
  const currentAge = now.getFullYear() - birthYear - (hadBirthdayThisYear ? 0 : 1);
  const wuxingTotal = Object.values(chart.wuxingCount).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-5 px-4 pb-12"
    >
      {/* 标题 */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-white mb-1">八字命盘</h2>
        <p className="text-gray-400 text-sm">
          日主：<span className="text-cosmic-gold font-bold">{chart.rigan}（{chart.riganWuxing}）</span>
          　格局：<span className="text-destiny-300">{chart.geju}</span>
        </p>
      </div>

      {/* 四柱表格 */}
      <div className="glass-card p-4 overflow-x-auto">
        <table className="w-full text-center min-w-[280px]">
          <thead>
            <tr className="text-gray-500 text-sm border-b border-white/10">
              {PILLAR_LABELS.map((label) => (
                <th key={label} className="py-2 font-normal">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 天干行 */}
            <tr className="border-b border-white/5">
              {pillars.map((data, i) => {
                const colors = WUXING_COLORS[data.ganWuxing] || {};
                return (
                  <td key={i} className="py-3">
                    <div className={`text-2xl font-bold font-display ${colors.text}`}>
                      {data.gan}
                    </div>
                    {data.tenGod && (
                      <div className="text-xs text-gray-500 mt-1">{data.tenGod}</div>
                    )}
                  </td>
                );
              })}
            </tr>
            {/* 地支行 */}
            <tr className="border-b border-white/5">
              {pillars.map((data, i) => {
                const colors = WUXING_COLORS[data.zhiWuxing] || {};
                return (
                  <td key={i} className="py-3">
                    <div className={`text-2xl font-bold font-display ${colors.text}`}>
                      {data.zhi}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data.hiddenGan.slice(0, 2).join(' ')}
                    </div>
                  </td>
                );
              })}
            </tr>
            {/* 纳音行 */}
            <tr>
              {pillars.map((data, i) => (
                <td key={i} className="py-2 text-xs text-gray-500">{data.nayin}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 五行分布 */}
      <div className="glass-card p-4">
        <h3 className="text-sm text-gray-400 mb-3">五行分布</h3>
        <div className="flex gap-2">
          {(Object.entries(chart.wuxingCount) as [string, number][]).map(([wx, count]) => {
            const colors = WUXING_COLORS[wx] || {};
            const pct = wuxingTotal > 0 ? Math.round((count / wuxingTotal) * 100) : 0;
            return (
              <div
                key={wx}
                className={`flex-1 rounded-lg border ${colors.bg} ${colors.border} p-2 text-center`}
              >
                <div className={`text-base font-bold ${colors.text}`}>{wx}</div>
                <div className="text-white font-bold text-lg">{count}</div>
                <div className="text-gray-500 text-xs">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 喜用神 */}
      <div className="glass-card p-4">
        <h3 className="text-sm text-gray-400 mb-2">喜用神分析</h3>
        <p className="text-sm text-gray-300 leading-relaxed mb-3">{chart.yongshen.description}</p>
        <div className="flex gap-2 flex-wrap">
          {chart.yongshen.yongshenWuxing.map((wx) => {
            const colors = WUXING_COLORS[wx] || {};
            return (
              <span key={wx} className={`px-3 py-1 rounded-full text-sm font-bold ${colors.text} ${colors.bg} border ${colors.border}`}>
                {wx}（喜）
              </span>
            );
          })}
          {chart.yongshen.jishenWuxing.map((wx) => (
            <span key={wx} className="px-3 py-1 rounded-full text-sm text-gray-400 bg-gray-800/50 border border-gray-700">
              {wx}（忌）
            </span>
          ))}
        </div>
      </div>

      {/* 大运走势 */}
      {chart.dayunList.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm text-gray-400 mb-3">大运走势</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {chart.dayunList.slice(0, 9).map((dayun) => {
              const isCurrent = currentAge >= dayun.startAge && currentAge < dayun.endAge;
              const colors = WUXING_COLORS[dayun.ganWuxing] || {};
              return (
                <div
                  key={dayun.startAge}
                  className={`flex-shrink-0 rounded-lg p-3 text-center min-w-[60px] border transition-all ${
                    isCurrent
                      ? `${colors.bg} ${colors.border} ring-1 ring-cosmic-gold/50`
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className={`text-base font-bold font-display ${isCurrent ? colors.text : 'text-gray-300'}`}>
                    {dayun.gan}{dayun.zhi}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{dayun.tenGod}</div>
                  <div className="text-xs text-gray-600 mt-1">{dayun.startAge}岁</div>
                  {isCurrent && (
                    <div className="text-xs text-cosmic-gold mt-1">当前</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 开始分析按钮 */}
      <div className="flex justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStartAnalysis}
          className="btn-gold text-lg px-10 py-4"
        >
          开始AI分析
        </motion.button>
      </div>
    </motion.div>
  );
}
