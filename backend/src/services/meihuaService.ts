/**
 * 梅花易数（占位实现）
 * 先跑通前后端链路：起卦/盘面算法后续再补
 */

import type { BirthInfo } from '../types/index.js';

export interface MeihuaChart {
  readonly divinationTime: string;
  readonly seed: number;
}

export class MeihuaService {
  /**
   * 用 birthInfo 作为“占测时间”生成最小盘面（占位）
   */
  static generate(birthInfo: BirthInfo): MeihuaChart {
    const divinationTime = `${birthInfo.year}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')} ${String(birthInfo.hour).padStart(2, '0')}:00`;
    const seed = Number(`${birthInfo.year}${String(birthInfo.month).padStart(2, '0')}${String(birthInfo.day).padStart(2, '0')}${String(birthInfo.hour).padStart(2, '0')}`);
    return { divinationTime, seed };
  }

  /**
   * 格式化为 AI 可读文本（占位）
   */
  static formatForAI(chart: MeihuaChart): string {
    return [
      '【梅花易数起卦信息（占位）】',
      `占测时间：${chart.divinationTime}`,
      `起卦种子：${chart.seed}`,
      '',
      '注：当前为占位实现，仅用于跑通链路；后续将补齐上下卦/动爻/体用等算法。',
    ].join('\n');
  }
}

