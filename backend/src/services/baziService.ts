/**
 * 八字命理服务
 * 基于 lunar-javascript 实现完整的四柱八字计算
 * 包含：四柱、十神、纳音、五行、喜用神推断、大运、流年
 */

import { Solar, LunarUtil } from 'lunar-javascript';
import type { BirthInfo } from '../types/index.js';

// ─── 五行 ──────────────────────────────────────────────────────────────

const WUXING_MAP: Record<string, string> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
  子: '水', 亥: '水',
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 丑: '土', 戌: '土', 未: '土',
  申: '金', 酉: '金',
};

// 纳音五行
const NAYIN_MAP: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

// ─── 十神 ──────────────────────────────────────────────────────────────

// 天干阴阳
const TIANGAN_YIN_YANG: Record<string, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

// 五行相生相克关系（生我、克我、我生、我克）
type WuxingRelation = 'same' | 'sheng_wo' | 'ke_wo' | 'wo_sheng' | 'wo_ke';

function getWuxingRelation(riganWuxing: string, targetWuxing: string): WuxingRelation {
  if (riganWuxing === targetWuxing) return 'same';

  const shengMap: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const keMap: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

  if (shengMap[riganWuxing] === targetWuxing) return 'wo_sheng';
  if (keMap[riganWuxing] === targetWuxing) return 'wo_ke';
  if (shengMap[targetWuxing] === riganWuxing) return 'sheng_wo';
  if (keMap[targetWuxing] === riganWuxing) return 'ke_wo';
  return 'same';
}

function getTenGod(rigan: string, targetGan: string): string {
  const riganWuxing = WUXING_MAP[rigan] || '';
  const targetWuxing = WUXING_MAP[targetGan] || '';
  if (!riganWuxing || !targetWuxing) return '未知';

  const riYinYang = TIANGAN_YIN_YANG[rigan];
  const targetYinYang = TIANGAN_YIN_YANG[targetGan];
  const isSameYinYang = riYinYang === targetYinYang;

  const relation = getWuxingRelation(riganWuxing, targetWuxing);

  switch (relation) {
    case 'same':
      return isSameYinYang ? '比肩' : '劫财';
    case 'wo_sheng':
      return isSameYinYang ? '食神' : '伤官';
    case 'wo_ke':
      return isSameYinYang ? '偏财' : '正财';
    case 'ke_wo':
      return isSameYinYang ? '七杀' : '正官';
    case 'sheng_wo':
      return isSameYinYang ? '偏印' : '正印';
    default:
      return '未知';
  }
}

// 地支藏干 (人元司令)
const DIZHI_HIDDEN_GAN: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

const DIZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SANHE_GROUPS: Array<{ branches: string[]; element: string }> = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
];

// ─── 类型定义 ──────────────────────────────────────────────────────────

export interface BaziPillar {
  readonly gan: string;          // 天干
  readonly zhi: string;          // 地支
  readonly ganWuxing: string;    // 天干五行
  readonly zhiWuxing: string;    // 地支五行
  readonly nayin: string;        // 纳音
  readonly hiddenGan: string[];  // 地支藏干
  readonly tenGod?: string;      // 十神（相对日主）
}

export interface BaziChart {
  readonly yearPillar: BaziPillar;
  readonly monthPillar: BaziPillar;
  readonly dayPillar: BaziPillar;
  readonly hourPillar: BaziPillar;
  readonly rigan: string;           // 日主天干
  readonly riganWuxing: string;     // 日主五行
  readonly wuxingCount: WuxingCount;
  readonly dayunList: DayunInfo[];
  readonly currentDayun?: DayunInfo;
  readonly geju: string;            // 格局
  readonly yongshen: YongshenInfo;  // 喜用神
  readonly summary: string;         // 格式化摘要
}

export interface WuxingCount {
  readonly 木: number;
  readonly 火: number;
  readonly 土: number;
  readonly 金: number;
  readonly 水: number;
}

export interface YongshenInfo {
  readonly yongshenWuxing: ReadonlyArray<string>;
  readonly jishenWuxing: ReadonlyArray<string>;
  readonly seasonAdjust: ReadonlyArray<string>;
  readonly isStrong: boolean;
  readonly hasTonggen: boolean;
  readonly description: string;
}

export interface DayunInfo {
  readonly startAge: number;
  readonly endAge: number;
  readonly gan: string;
  readonly zhi: string;
  readonly ganWuxing: string;
  readonly zhiWuxing: string;
  readonly tenGod: string;
}

// ─── 核心服务 ──────────────────────────────────────────────────────────

export class BaziService {
  /**
   * 根据出生信息生成八字命盘
   */
  static generate(birthInfo: BirthInfo): BaziChart {
    try {
      // 使用 lunar-javascript 获取四柱
      const solar = Solar.fromYmdHms(
        birthInfo.year,
        birthInfo.month,
        birthInfo.day,
        birthInfo.hour,
        0,
        0
      );

      const lunar = solar.getLunar();
      const baziObj = lunar.getEightChar();

      const yearGan = baziObj.getYearGan();
      const yearZhi = baziObj.getYearZhi();
      const monthGan = baziObj.getMonthGan();
      const monthZhi = baziObj.getMonthZhi();
      const dayGan = baziObj.getDayGan();
      const dayZhi = baziObj.getDayZhi();
      const hourGan = baziObj.getTimeGan();
      const hourZhi = baziObj.getTimeZhi();

      const rigan = dayGan;
      const riganWuxing = WUXING_MAP[rigan] || '';

      // 构建四柱
      const yearPillar = this.buildPillar(yearGan, yearZhi, rigan);
      const monthPillar = this.buildPillar(monthGan, monthZhi, rigan, true);
      const dayPillar = this.buildPillar(dayGan, dayZhi, rigan);
      const hourPillar = this.buildPillar(hourGan, hourZhi, rigan);
      const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

      // 统计五行
      const wuxingCount = this.countWuxing(pillars);

      // 计算大运
      const dayunList = this.calcDayun(baziObj, birthInfo);
      const currentAge = new Date().getFullYear() - birthInfo.year;
      const currentDayun = dayunList.find(d => d.startAge <= currentAge && d.endAge > currentAge);

      // 推断格局和喜用神
      const geju = this.inferGeju(rigan, riganWuxing, monthPillar, wuxingCount, pillars);
      const yongshen = this.inferYongshen(rigan, riganWuxing, monthPillar.zhi, wuxingCount, pillars);

      const chart: BaziChart = {
        yearPillar,
        monthPillar,
        dayPillar,
        hourPillar,
        rigan,
        riganWuxing,
        wuxingCount,
        dayunList,
        currentDayun,
        geju,
        yongshen,
        summary: '',
      };

      return {
        ...chart,
        summary: this.formatSummary(chart, birthInfo),
      };
    } catch (error) {
      throw new Error(`八字计算失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建单柱数据
   */
  private static buildPillar(
    gan: string,
    zhi: string,
    rigan: string,
    isMonth = false
  ): BaziPillar {
    const ganWuxing = WUXING_MAP[gan] || '';
    const zhiWuxing = WUXING_MAP[zhi] || '';
    const nayin = NAYIN_MAP[gan + zhi] || '';
    const hiddenGan = DIZHI_HIDDEN_GAN[zhi] || [];
    const tenGod = gan !== rigan ? getTenGod(rigan, gan) : '日主';

    return { gan, zhi, ganWuxing, zhiWuxing, nayin, hiddenGan, tenGod };
  }

  /**
   * 统计四柱五行数量（天干+地支）
   */
  private static countWuxing(pillars: BaziPillar[]): WuxingCount {
    const count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

    for (const pillar of pillars) {
      if (pillar.ganWuxing in count) {
        (count as any)[pillar.ganWuxing]++;
      }
      if (pillar.zhiWuxing in count) {
        (count as any)[pillar.zhiWuxing]++;
      }
      for (const hiddenGan of pillar.hiddenGan) {
        const hiddenWuxing = WUXING_MAP[hiddenGan];
        if (hiddenWuxing in count) {
          (count as any)[hiddenWuxing] += 0.5;
        }
      }
    }

    return count;
  }

  /**
   * 计算大运（10年一换）
   */
  private static calcDayun(baziObj: any, birthInfo: BirthInfo): DayunInfo[] {
    try {
      const yun = baziObj.getYun(birthInfo.gender === 'male' ? 1 : 0);
      if (!yun) return [];
      const rigan = baziObj.getDayGan();
      const daYunList = yun.getDaYun();
      if (!Array.isArray(daYunList)) return [];

      return daYunList
        .map((dy: any) => {
          const ganZhi = String(dy?.getGanZhi?.() || '');
          if (!ganZhi || ganZhi.length < 2) return null;

          const gan = ganZhi[0];
          const zhi = ganZhi[1];
          const startAge = Number(dy?.getStartAge?.() ?? 0);
          const endAge = Number(dy?.getEndAge?.() ?? startAge + 10);

          return {
            startAge,
            endAge,
            gan,
            zhi,
            ganWuxing: WUXING_MAP[gan] || '',
            zhiWuxing: WUXING_MAP[zhi] || '',
            tenGod: getTenGod(rigan, gan),
          } satisfies DayunInfo;
        })
        .filter((item): item is DayunInfo => item !== null);
    } catch {
      return [];
    }
  }

  /**
   * 推断八字格局（简化版，覆盖主要格局）
   */
  private static inferGeju(
    rigan: string,
    riganWuxing: string,
    monthPillar: BaziPillar,
    wuxing: WuxingCount,
    pillars: BaziPillar[]
  ): string {
    const monthHiddenGan = monthPillar.hiddenGan.length > 0
      ? monthPillar.hiddenGan
      : (DIZHI_HIDDEN_GAN[monthPillar.zhi] || []);
    const visibleGans = pillars.map(p => p.gan);
    const transparentMonthGan = monthHiddenGan.filter(gan => visibleGans.includes(gan));
    const transparentTenGod = Array.from(new Set(transparentMonthGan.map(gan => getTenGod(rigan, gan))));
    const monthCommanderGan = monthHiddenGan[0] || monthPillar.gan;
    const baseTenGod = transparentTenGod[0] || getTenGod(rigan, monthCommanderGan);

    // 按月令藏干透出取格
    const gejuMap: Record<string, string> = {
      '正官': '正官格',
      '七杀': '七杀格',
      '正印': '正印格',
      '偏印': '偏印格（枭神格）',
      '正财': '正财格',
      '偏财': '偏财格',
      '食神': '食神格',
      '伤官': '伤官格',
      '比肩': '建禄格',
      '劫财': '羊刃格',
    };

    const baseGeju = gejuMap[baseTenGod] || '月令格';
    const total = Object.values(wuxing).reduce((a, b) => a + b, 0);
    const riganRatio = total > 0 ? (((wuxing as any)[riganWuxing] || 0) / total) : 0;

    const hasYinBiSupport = pillars.some((pillar, index) => {
      if (index === 2) return false;
      const supportGans = [pillar.gan, ...pillar.hiddenGan];
      return supportGans.some(gan => {
        const wuxingValue = WUXING_MAP[gan];
        if (!wuxingValue) return false;
        const relation = getWuxingRelation(riganWuxing, wuxingValue);
        return relation === 'same' || relation === 'sheng_wo';
      });
    });

    const conggeHint = riganRatio < 0.125 && !hasYinBiSupport ? '，疑似从格' : '';
    const monthLingText = transparentTenGod.length > 0
      ? `月令藏干透出：${transparentTenGod.join('、')}`
      : `月令司令：${getTenGod(rigan, monthCommanderGan)}（未透干）`;

    return `${baseGeju}（${monthLingText}${conggeHint}）`;
  }

  /**
   * 推断喜用神（五行平衡法）
   */
  private static inferYongshen(
    rigan: string,
    riganWuxing: string,
    monthZhi: string,
    wuxing: WuxingCount,
    pillars: BaziPillar[]
  ): YongshenInfo {
    const shengMap: Record<string, string> = {
      木: '水', 火: '木', 土: '火', 金: '土', 水: '金',
    };
    const keMap: Record<string, string> = {
      木: '金', 火: '水', 土: '木', 金: '火', 水: '土',
    };

    const wuxingEntries = Object.entries(wuxing) as [string, number][];
    const total = wuxingEntries.reduce((sum, [, v]) => sum + v, 0);
    const hasTonggen = pillars.some(p => p.hiddenGan.includes(rigan));
    const riganCount = (wuxing as any)[riganWuxing] || 0;
    const ratio = total > 0 ? riganCount / total : 0;
    const isStrong = ratio + (hasTonggen ? 0.08 : 0) >= 0.3;

    const seasonAdjust = (() => {
      if (['子', '丑', '亥'].includes(monthZhi)) return ['火'];
      if (['午', '未', '巳'].includes(monthZhi)) return ['水'];
      return [];
    })();

    let yongshenWuxing: string[];
    let jishenWuxing: string[];

    if (isStrong) {
      yongshenWuxing = [keMap[riganWuxing], shengMap[riganWuxing]];
      jishenWuxing = [riganWuxing, shengMap[shengMap[riganWuxing]]];
    } else {
      const yinWuxing = shengMap[riganWuxing];
      yongshenWuxing = [yinWuxing, riganWuxing];
      jishenWuxing = [keMap[riganWuxing], shengMap[riganWuxing]];
    }

    yongshenWuxing = Array.from(new Set([...seasonAdjust, ...yongshenWuxing]));
    jishenWuxing = Array.from(new Set(jishenWuxing.filter(w => !yongshenWuxing.includes(w))));

    const description = [
      `日主${riganWuxing}${isStrong ? '偏旺' : '偏弱'}`,
      hasTonggen ? '地支有通根' : '地支通根不足',
      `喜用${yongshenWuxing.join('、')}`,
      seasonAdjust.length > 0 ? `调候偏重${seasonAdjust.join('、')}` : undefined,
      `忌${jishenWuxing.join('、')}`,
    ].filter(Boolean).join('；');

    return {
      yongshenWuxing,
      jishenWuxing,
      seasonAdjust,
      isStrong,
      hasTonggen,
      description,
    };
  }

  private static getCurrentYearInfo(currentYear: number): {
    yearGanzhi: string;
    yearGan: string;
    yearZhi: string;
  } {
    const jiaZi = (LunarUtil as any).JIA_ZI as string[] | undefined;
    if (!Array.isArray(jiaZi) || jiaZi.length !== 60) {
      return { yearGanzhi: '', yearGan: '', yearZhi: '' };
    }

    const index = ((currentYear - 1984) % 60 + 60) % 60;
    const yearGanzhi = String(jiaZi[index] || '');

    return {
      yearGanzhi,
      yearGan: yearGanzhi[0] || '',
      yearZhi: yearGanzhi[1] || '',
    };
  }

  private static analyzeBranchRelations(
    branches: Array<{ label: string; zhi: string }>
  ): { he: string[]; chong: string[]; xing: string[] } {
    const heRelations: string[] = [];
    const chongRelations: string[] = [];
    const xingRelations: string[] = [];

    const heZhi6 = ((LunarUtil as any).HE_ZHI_6 || []) as string[];
    const chong = ((LunarUtil as any).CHONG || []) as string[];

    const pushUnique = (target: string[], text: string) => {
      if (!target.includes(text)) target.push(text);
    };

    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const a = branches[i];
        const b = branches[j];
        const aIndex = DIZHI_ORDER.indexOf(a.zhi);
        const bIndex = DIZHI_ORDER.indexOf(b.zhi);

        if (
          (aIndex >= 0 && heZhi6[aIndex] === b.zhi) ||
          (bIndex >= 0 && heZhi6[bIndex] === a.zhi)
        ) {
          pushUnique(heRelations, `${a.label}${a.zhi} 合 ${b.label}${b.zhi}`);
        }

        for (const item of SANHE_GROUPS) {
          if (item.branches.includes(a.zhi) && item.branches.includes(b.zhi)) {
            const pair = item.branches.filter(z => z === a.zhi || z === b.zhi).join('');
            pushUnique(
              heRelations,
              `${a.label}${a.zhi} + ${b.label}${b.zhi} = ${pair}${item.element}局（半合）`
            );
          }
        }

        if (
          (aIndex >= 0 && chong[aIndex] === b.zhi) ||
          (bIndex >= 0 && chong[bIndex] === a.zhi)
        ) {
          pushUnique(chongRelations, `${a.label}${a.zhi} 冲 ${b.label}${b.zhi}`);
        }

        const isZiMaoXing = (a.zhi === '子' && b.zhi === '卯') || (a.zhi === '卯' && b.zhi === '子');
        if (isZiMaoXing) {
          pushUnique(xingRelations, `${a.label}${a.zhi} 与 ${b.label}${b.zhi} 子卯相刑`);
        }

        if (['丑', '未', '戌'].includes(a.zhi) && ['丑', '未', '戌'].includes(b.zhi)) {
          pushUnique(xingRelations, `${a.label}${a.zhi} 与 ${b.label}${b.zhi} 属丑未戌三刑`);
        }

        if (['寅', '巳', '申'].includes(a.zhi) && ['寅', '巳', '申'].includes(b.zhi)) {
          pushUnique(xingRelations, `${a.label}${a.zhi} 与 ${b.label}${b.zhi} 属寅巳申三刑`);
        }
      }
    }

    const selfXingCandidates = ['辰', '午', '酉', '亥'];
    for (const zhi of selfXingCandidates) {
      const count = branches.filter(item => item.zhi === zhi).length;
      if (count >= 2) {
        pushUnique(xingRelations, `${zhi}见${count}次，存在自刑`);
      }
    }

    return {
      he: heRelations,
      chong: chongRelations,
      xing: xingRelations,
    };
  }

  /**
   * 格式化八字摘要文本（供 AI 分析使用）
   */
  static formatSummary(chart: BaziChart, birthInfo: BirthInfo): string {
    const gender = birthInfo.gender === 'male' ? '男' : '女';
    const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = chart;
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthInfo.year;
    const { yearGanzhi, yearGan, yearZhi } = this.getCurrentYearInfo(currentYear);
    const branches = [
      { label: '年支', zhi: yp.zhi },
      { label: '月支', zhi: mp.zhi },
      { label: '日支', zhi: dp.zhi },
      { label: '时支', zhi: hp.zhi },
      ...(yearZhi ? [{ label: '流年', zhi: yearZhi }] : []),
    ];
    const relationInfo = this.analyzeBranchRelations(branches);
    const currentDayunText = chart.currentDayun
      ? `${chart.currentDayun.gan}${chart.currentDayun.zhi}（${chart.currentDayun.tenGod}）运，${chart.currentDayun.startAge}岁至${chart.currentDayun.endAge}岁`
      : '暂无匹配大运信息';

    const lines: string[] = [
      '【八字命盘】',
      '',
      `出生信息: ${birthInfo.year}年${birthInfo.month}月${birthInfo.day}日 ${birthInfo.hour}时 ${gender}`,
      '',
      '【四柱八字】',
      `年柱: ${yp.gan}${yp.zhi}（${yp.ganWuxing}/${yp.zhiWuxing}）纳音：${yp.nayin} 十神：${yp.tenGod}`,
      `月柱: ${mp.gan}${mp.zhi}（${mp.ganWuxing}/${mp.zhiWuxing}）纳音：${mp.nayin} 十神：${mp.tenGod}`,
      `日柱: ${dp.gan}${dp.zhi}（${dp.ganWuxing}/${dp.zhiWuxing}）纳音：${dp.nayin} 【日主】`,
      `时柱: ${hp.gan}${hp.zhi}（${hp.ganWuxing}/${hp.zhiWuxing}）纳音：${hp.nayin} 十神：${hp.tenGod}`,
      '',
      '【地支藏干与十神】',
      `年支${yp.zhi}藏干: ${yp.hiddenGan.map(g => `${g}(${getTenGod(chart.rigan, g)})`).join('、') || '无'}`,
      `月支${mp.zhi}藏干: ${mp.hiddenGan.map(g => `${g}(${getTenGod(chart.rigan, g)})`).join('、') || '无'}`,
      `日支${dp.zhi}藏干: ${dp.hiddenGan.map(g => `${g}(${getTenGod(chart.rigan, g)})`).join('、') || '无'}`,
      `时支${hp.zhi}藏干: ${hp.hiddenGan.map(g => `${g}(${getTenGod(chart.rigan, g)})`).join('、') || '无'}`,
      '',
      '【五行统计】',
      `木: ${chart.wuxingCount['木']} | 火: ${chart.wuxingCount['火']} | 土: ${chart.wuxingCount['土']} | 金: ${chart.wuxingCount['金']} | 水: ${chart.wuxingCount['水']}`,
      '',
      '【格局与用神】',
      `格局: ${chart.geju}`,
      `喜用神: ${chart.yongshen.description}`,
      `喜用五行: ${chart.yongshen.yongshenWuxing.join('、')} | 忌神五行: ${chart.yongshen.jishenWuxing.join('、') || '无'}`,
    ];

    if (chart.currentDayun) {
      lines.push('', '【当前大运】');
      lines.push(
        `${chart.currentDayun.gan}${chart.currentDayun.zhi}（${chart.currentDayun.ganWuxing}/${chart.currentDayun.zhiWuxing}）`,
        `大运十神：${chart.currentDayun.tenGod}`,
        `运限：${chart.currentDayun.startAge}岁 ~ ${chart.currentDayun.endAge}岁`
      );
    }

    lines.push('', '【当前年份信息】');
    lines.push(
      `当前年份：${currentYear}年（${yearGanzhi || '未知'}年）/ 流年天干：${yearGan || '未知'} / 流年地支：${yearZhi || '未知'}`,
      `命主当前年龄：${currentAge}岁`,
      `当前大运：${currentDayunText}`
    );

    lines.push('', '【四柱关系】');
    lines.push(
      `主要合：${relationInfo.he.length > 0 ? relationInfo.he.join('；') : '无明显合局'}`,
      `主要冲：${relationInfo.chong.length > 0 ? relationInfo.chong.join('；') : '无明显相冲'}`,
      `主要刑：${relationInfo.xing.length > 0 ? relationInfo.xing.join('；') : '无明显相刑'}`
    );

    if (chart.dayunList.length > 0) {
      lines.push('', '【大运排列】');
      chart.dayunList.slice(0, 8).forEach(d => {
        lines.push(`${d.startAge}-${d.endAge}岁: ${d.gan}${d.zhi}（${d.tenGod}）`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 格式化为 AI 分析用的简短摘要
   */
  static formatForAI(chart: BaziChart, birthInfo: BirthInfo): string {
    return this.formatSummary(chart, birthInfo);
  }
}
