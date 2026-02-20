/**
 * 梅花易数服务
 * 实现邵雍时间起卦法（正宗梅花易数算法）
 */

import type { BirthInfo } from '../types/index.js';

// ─── 八卦数据 ──────────────────────────────────────────────────────────

interface TrigramInfo {
  readonly name: string;    // 卦名
  readonly symbol: string;  // 卦符（八卦符号）
  readonly wuxing: string;  // 五行属性
  readonly nature: string;  // 卦象自然象
  readonly number: number;  // 先天数 1-8
}

/** 先天八卦数对应表：1=乾 2=兑 3=离 4=震 5=巽 6=坎 7=艮 8=坤 */
const TRIGRAMS: Readonly<Record<number, TrigramInfo>> = {
  1: { name: '乾', symbol: '☰', wuxing: '金', nature: '天', number: 1 },
  2: { name: '兑', symbol: '☱', wuxing: '金', nature: '泽', number: 2 },
  3: { name: '离', symbol: '☲', wuxing: '火', nature: '火', number: 3 },
  4: { name: '震', symbol: '☳', wuxing: '木', nature: '雷', number: 4 },
  5: { name: '巽', symbol: '☴', wuxing: '木', nature: '风', number: 5 },
  6: { name: '坎', symbol: '☵', wuxing: '水', nature: '水', number: 6 },
  7: { name: '艮', symbol: '☶', wuxing: '土', nature: '山', number: 7 },
  8: { name: '坤', symbol: '☷', wuxing: '土', nature: '地', number: 8 },
};

// ─── 五行生克关系 ──────────────────────────────────────────────────────

/** 五行相生：木→火→土→金→水→木 */
const WUXING_SHENG: Readonly<Record<string, string>> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

/** 五行相克：木→土 火→金 土→水 金→木 水→火 */
const WUXING_KE: Readonly<Record<string, string>> = {
  木: '土', 火: '金', 土: '水', 金: '木', 水: '火',
};

// ─── 类型定义 ──────────────────────────────────────────────────────────

/** 体用关系类型 */
export type BodyUseRelation = '用生体' | '比和' | '体克用' | '体生用' | '用克体';

/** 梅花卦象结果 */
export interface MeihuaChart {
  readonly upperTrigram: TrigramInfo;     // 上卦
  readonly lowerTrigram: TrigramInfo;     // 下卦
  readonly movingLine: number;            // 动爻 1-6
  readonly bodyTrigram: 'upper' | 'lower'; // 体卦位置
  readonly useTrigram: 'upper' | 'lower';  // 用卦位置
  readonly bodyWuxing: string;            // 体卦五行
  readonly useWuxing: string;             // 用卦五行
  readonly bodyUsRelation: BodyUseRelation; // 体用关系
  readonly judgment: '大吉' | '吉' | '平' | '凶'; // 吉凶断语
  readonly divinationTime: string;        // 起卦时间
  readonly hexagramName: string;          // 卦名（上卦+下卦）
}

// ─── 核心服务 ──────────────────────────────────────────────────────────

export class MeihuaService {
  /**
   * 时间起卦法（邵雍正宗）
   * 上卦数 = (年 + 月 + 日) % 8  → 0 映射为 8
   * 下卦数 = (年 + 月 + 日 + 时) % 8
   * 动爻   = (年 + 月 + 日 + 时) % 6  → 0 映射为 6
   */
  static generate(birthInfo: BirthInfo): MeihuaChart {
    const { year, month, day, hour } = birthInfo;

    // 年取后两位，与梅花易数传统一致（也可用完整年份，此处用完整年保持可验证性）
    const sum3 = year + month + day;
    const sum4 = year + month + day + hour;

    const upperNum = sum3 % 8 || 8;
    const lowerNum = sum4 % 8 || 8;
    const movingLine = sum4 % 6 || 6;

    const upperTrigram = TRIGRAMS[upperNum]!;
    const lowerTrigram = TRIGRAMS[lowerNum]!;

    // 体用判断：动爻 1-3 在下卦 → 下卦为用，上卦为体
    //           动爻 4-6 在上卦 → 上卦为用，下卦为体
    const bodyTrigram: 'upper' | 'lower' = movingLine >= 4 ? 'lower' : 'upper';
    const useTrigram: 'upper' | 'lower' = movingLine >= 4 ? 'upper' : 'lower';

    const bodyWuxing = (bodyTrigram === 'upper' ? upperTrigram : lowerTrigram).wuxing;
    const useWuxing = (useTrigram === 'upper' ? upperTrigram : lowerTrigram).wuxing;

    const bodyUsRelation = this.calcBodyUseRelation(bodyWuxing, useWuxing);
    const judgment = this.calcJudgment(bodyUsRelation);

    const divinationTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00`;
    const hexagramName = `${upperTrigram.name}上${lowerTrigram.name}下`;

    return {
      upperTrigram,
      lowerTrigram,
      movingLine,
      bodyTrigram,
      useTrigram,
      bodyWuxing,
      useWuxing,
      bodyUsRelation,
      judgment,
      divinationTime,
      hexagramName,
    };
  }

  /**
   * 计算体用关系
   */
  private static calcBodyUseRelation(bodyWuxing: string, useWuxing: string): BodyUseRelation {
    if (bodyWuxing === useWuxing) return '比和';
    if (WUXING_SHENG[useWuxing] === bodyWuxing) return '用生体';
    if (WUXING_KE[bodyWuxing] === useWuxing) return '体克用';
    if (WUXING_SHENG[bodyWuxing] === useWuxing) return '体生用';
    if (WUXING_KE[useWuxing] === bodyWuxing) return '用克体';
    return '比和'; // fallback（同五行已在上方处理）
  }

  /**
   * 吉凶断语
   * 用生体 → 大吉
   * 比和   → 吉
   * 体克用 → 吉（我有主动权）
   * 体生用 → 平（耗力费心）
   * 用克体 → 凶
   */
  private static calcJudgment(relation: BodyUseRelation): '大吉' | '吉' | '平' | '凶' {
    switch (relation) {
      case '用生体': return '大吉';
      case '比和':   return '吉';
      case '体克用': return '吉';
      case '体生用': return '平';
      case '用克体': return '凶';
    }
  }

  /**
   * 格式化为 AI 可读文字，供 LLM 解读
   */
  static formatForAI(chart: MeihuaChart): string {
    const body = chart.bodyTrigram === 'upper' ? chart.upperTrigram : chart.lowerTrigram;
    const use  = chart.useTrigram  === 'upper' ? chart.upperTrigram : chart.lowerTrigram;

    return [
      '【梅花易数起卦信息】',
      `起卦时间：${chart.divinationTime}`,
      '',
      '【卦象】',
      `上卦：${chart.upperTrigram.symbol} ${chart.upperTrigram.name}（${chart.upperTrigram.nature}，${chart.upperTrigram.wuxing}）`,
      `下卦：${chart.lowerTrigram.symbol} ${chart.lowerTrigram.name}（${chart.lowerTrigram.nature}，${chart.lowerTrigram.wuxing}）`,
      `卦名：${chart.hexagramName}`,
      `动爻：第 ${chart.movingLine} 爻`,
      '',
      '【体用】',
      `体卦：${body.symbol} ${body.name}（${body.wuxing}）—— 代表问卦者或所问之事的主体`,
      `用卦：${use.symbol} ${use.name}（${use.wuxing}）—— 代表外部环境或对方`,
      `体用关系：${chart.bodyUsRelation}`,
      '',
      '【断语】',
      `吉凶：${chart.judgment}`,
      `解析：${this.getJudgmentExplanation(chart.bodyUsRelation)}`,
    ].join('\n');
  }

  private static getJudgmentExplanation(relation: BodyUseRelation): string {
    const map: Record<BodyUseRelation, string> = {
      '用生体': '外部环境生助主体，主事顺遂，贵人相助，所求大吉。',
      '比和':   '体用同五行，力量相当，同类相助，所问之事顺遂，吉。',
      '体克用': '主体克制外部，我有主动权，可积极推进，吉。',
      '体生用': '主体生助外部，耗费心力而外部受益，需量力而行，平。',
      '用克体': '外部环境克制主体，阻力较大，宜守不宜进，凶。',
    };
    return map[relation];
  }
}
