/**
 * 命盘服务
 * 负责命盘生成、格式化和验证
 */

import { astro } from 'iztro';
import type { BirthInfo, ZiweiChart, Palace, Star, Transformation } from '../types/index.js';

// 十二宫位名称
const PALACE_NAMES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫',
  '财帛宫', '疾厄宫', '迁移宫', '交友宫',
  '官禄宫', '田宅宫', '福德宫', '父母宫',
];

// 时辰映射表 - 与前端保持一致
const HOUR_NAMES: Record<number, string> = {
  0: '子时', 2: '丑时', 4: '寅时', 6: '卯时',
  8: '辰时', 10: '巳时', 12: '午时', 14: '未时',
  16: '申时', 18: '酉时', 20: '戌时', 22: '亥时',
};

/**
 * 命盘服务类
 */
export class ChartService {
  /**
   * 使用 iztro 生成紫微斗数命盘
   */
  static generate(birthInfo: BirthInfo): ZiweiChart {
    try {
      const dateStr = `${birthInfo.year}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')}`;
      // iztro 需要 '男' 或 '女'
      const gender = birthInfo.gender === 'male' ? '男' : '女';
      const isLeapMonth = birthInfo.leapMonth || false;

      // 将小时数转换为时辰索引 (0-12)
      const timeIndex = Math.floor(birthInfo.hour / 2);

      // 根据历法类型选择不同的 iztro API
      const result = birthInfo.isLunar
        ? astro.byLunar(dateStr, timeIndex, gender, isLeapMonth)
        : astro.bySolar(dateStr, timeIndex, gender, isLeapMonth);

      // 提取八字信息
      const chineseDate = result.chineseDate || '';
      const baziPillars = chineseDate.split(' ').filter(s => s);

      // 转换宫位数据
      const palaces: Palace[] = result.palaces.map((palace: any, index: number) => ({
        name: palace.name || PALACE_NAMES[index],
        branch: palace.earthlyBranch || '',
        stem: palace.heavenlyStem || '',
        isBodyPalace: palace.isBodyPalace || false,
        isOriginalPalace: palace.isOriginalPalace || false,
        majorStars: this.extractStars(palace.majorStars || [], 'major'),
        minorStars: this.extractStars(palace.minorStars || [], 'minor'),
        otherStars: this.extractStars(palace.adjectiveStars || [], 'other'),
        transformations: this.extractTransformations(palace),
        changsheng12: palace.changsheng12,
        boshi12: palace.boshi12,
        jiangqian12: palace.jiangqian12,
        suiqian12: palace.suiqian12,
        majorPeriod: palace.ages && palace.ages.length > 0 ? {
          startAge: palace.ages[0] || 0,
          endAge: palace.ages[palace.ages.length - 1] || 0,
          stem: palace.heavenlyStem || '',
          branch: palace.earthlyBranch || '',
        } : undefined,
        minorPeriods: palace.ages,
      }));

      // 找出身宫位置
      const bodyPalace = palaces.find(p => p.isBodyPalace);
      const originalPalace = palaces.find(p => p.isOriginalPalace);

      // 计算星座
      const zodiacSign = this.getZodiacSign(birthInfo.month, birthInfo.day);

      // 计算生肖
      const zodiacAnimal = this.getZodiacAnimal(birthInfo.year);

      return {
        birthInfo,
        bazi: {
          year: baziPillars[0] || '',
          month: baziPillars[1] || '',
          day: baziPillars[2] || '',
          hour: baziPillars[3] || '',
          solarDate: result.solarDate,
          lunarDate: result.lunarDate,
        },
        zodiacSign,
        zodiacAnimal,
        bodyPalaceBranch: bodyPalace?.branch,
        originalPalace: originalPalace?.name,
        palaces,
        soulStar: result.soul || '',
        bodyStar: result.body || '',
        fiveElementType: result.fiveElementsClass || '',
        rawData: result as unknown as Record<string, unknown>,
      };
    } catch (error) {
      console.error('生成命盘失败:', error);
      throw new Error('命盘生成失败，请检查出生信息是否正确');
    }
  }

  /**
   * 提取星曜信息
   */
  private static extractStars(
    stars: Array<{ name: string; brightness?: string; mutagen?: string }>,
    type: Star['type']
  ): Star[] {
    return stars.map((star) => ({
      name: star.name,
      brightness: star.brightness as Star['brightness'],
      type,
      nature: this.getStarNature(star.name),
    }));
  }

  /**
   * 提取四化信息
   */
  private static extractTransformations(
    palace: { majorStars?: Array<{ name: string; mutagen?: string }> }
  ): Transformation[] {
    const transformations: Transformation[] = [];

    palace.majorStars?.forEach((star) => {
      if (star.mutagen) {
        transformations.push({
          star: star.name,
          type: star.mutagen as Transformation['type'],
        });
      }
    });

    return transformations;
  }

  /**
   * 判断星曜性质
   */
  private static getStarNature(starName: string): Star['nature'] {
    const goodStars = ['紫微', '天府', '太阳', '太阴', '天同', '天机', '天相', '天梁', '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存'];
    const badStars = ['七杀', '破军', '火星', '铃星', '擎羊', '陀罗', '地空', '地劫'];

    if (goodStars.includes(starName)) return 'good';
    if (badStars.includes(starName)) return 'bad';
    return 'neutral';
  }

  /**
   * 获取星座
   */
  private static getZodiacSign(month: number, day: number): string {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座';
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
    if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座';
    if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '双鱼座';
    return '';
  }

  /**
   * 获取生肖
   */
  private static getZodiacAnimal(year: number): string {
    const animals = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
    return animals[year % 12];
  }

  /**
   * 获取时辰名称
   */
  static getHourName(hour: number): string {
    return HOUR_NAMES[hour] || '未知时辰';
  }

  /**
   * 格式化命盘为紧凑文本 (用于 AI 快速分析)
   */
  static formatForAI(chart: ZiweiChart): string {
    const lines: string[] = [
      '【紫微斗数命盘】',
      '',
      '【基本信息】',
      `出生信息: ${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日 ${chart.birthInfo.gender === 'male' ? '男' : '女'}`,
      chart.bazi?.solarDate ? `阳历: ${chart.bazi.solarDate}` : '',
      chart.bazi?.lunarDate ? `阴历: ${chart.bazi.lunarDate}` : '',
      chart.bazi ? `八字: ${chart.bazi.year} ${chart.bazi.month} ${chart.bazi.day} ${chart.bazi.hour}` : '',
      chart.zodiacSign ? `星座: ${chart.zodiacSign}` : '',
      chart.zodiacAnimal ? `生肖: ${chart.zodiacAnimal}` : '',
      `命主: ${chart.soulStar}`,
      `身主: ${chart.bodyStar}`,
      `五行局: ${chart.fiveElementType}`,
      chart.bodyPalaceBranch ? `身宫位置: ${chart.bodyPalaceBranch}` : '',
      chart.originalPalace ? `来因宫: ${chart.originalPalace}` : '',
      '',
      '【十二宫位详情】',
    ];

    chart.palaces.forEach((palace) => {
      const majorStars = palace.majorStars.map(s => {
        let str = s.name;
        if (s.brightness) str += `(${s.brightness})`;
        return str;
      }).join('、') || '无主星';

      const minorStars = palace.minorStars.map(s => s.name).join('、') || '无';
      const otherStars = palace.otherStars.map(s => s.name).join('、') || '无';
      const transformations = palace.transformations.map(t => `${t.star}${t.type}`).join('、') || '无';

      const flags = [
        palace.isBodyPalace ? '[身宫]' : '',
        palace.isOriginalPalace ? '[来因宫]' : '',
      ].filter(Boolean).join('');

      lines.push(
        `${palace.name} [${palace.stem}${palace.branch}]${flags ? ' ' + flags : ''}:`,
        `  主星: ${majorStars}`,
        `  辅星: ${minorStars}`,
        `  杂耀: ${otherStars}`,
        `  四化: ${transformations}`,
        palace.changsheng12 ? `  长生12神: ${palace.changsheng12}` : '',
        palace.boshi12 ? `  博士12神: ${palace.boshi12}` : '',
        palace.jiangqian12 ? `  流年将前12神: ${palace.jiangqian12}` : '',
        palace.suiqian12 ? `  流年岁前12神: ${palace.suiqian12}` : '',
        palace.majorPeriod ? `  大限: ${palace.majorPeriod.startAge}-${palace.majorPeriod.endAge}岁 (${palace.majorPeriod.stem}${palace.majorPeriod.branch})` : '',
        palace.minorPeriods && palace.minorPeriods.length > 0 ? `  小限: ${palace.minorPeriods.slice(0, 5).join(', ')}...` : '',
        ''
      );
    });

    return lines.filter(line => line !== '').join('\n');
  }

  /**
   * 格式化命盘为详细可读文本 (用于报告生成，对齐 convert.py 格式)
   */
  static formatToReadableText(chart: ZiweiChart): string {
    const lines: string[] = [];

    // 基本信息
    lines.push('----------基本信息----------');
    lines.push(`命主性别：${chart.birthInfo.gender === 'male' ? '男' : '女'}`);
    if (chart.bazi?.solarDate) lines.push(`阳历生日：${chart.bazi.solarDate}`);
    if (chart.bazi?.lunarDate) lines.push(`阴历生日：${chart.bazi.lunarDate}`);
    if (chart.bazi) {
      lines.push(`八字：${chart.bazi.year} ${chart.bazi.month} ${chart.bazi.day} ${chart.bazi.hour}`);
    }
    lines.push(`生辰时辰：${this.getHourName(chart.birthInfo.hour)} (${chart.birthInfo.hour}点)`);
    if (chart.zodiacSign) lines.push(`星座：${chart.zodiacSign}`);
    if (chart.zodiacAnimal) lines.push(`生肖：${chart.zodiacAnimal}`);
    if (chart.bodyPalaceBranch) lines.push(`身宫地支：${chart.bodyPalaceBranch}`);
    const lifePalace = chart.palaces.find(p => p.name === '命宫');
    if (lifePalace?.branch) lines.push(`命宫地支：${lifePalace.branch}`);
    lines.push(`命主星：${chart.soulStar}`);
    lines.push(`身主星：${chart.bodyStar}`);
    lines.push(`五行局：${chart.fiveElementType}`);
    lines.push('----------宫位信息----------');

    // 宫位信息
    chart.palaces.forEach((palace, index) => {
      lines.push(this.formatPalaceToReadableText(palace, index));
      if (index < chart.palaces.length - 1) {
        lines.push('----------');
      }
    });

    return lines.join('\n');
  }

  /**
   * 格式化单个宫位为可读文本
   */
  private static formatPalaceToReadableText(palace: Palace, index: number): string {
    const lines: string[] = [];

    lines.push(`宫位${index + 1}号位，宫位名称是${palace.name}。`);
    lines.push(`宫位天干为${palace.stem}，宫位地支为${palace.branch}。`);
    lines.push(`${palace.isBodyPalace ? '是' : '不是'}身宫，${palace.isOriginalPalace ? '是' : '不是'}来因宫。`);

    // 主星
    if (palace.majorStars.length > 0) {
      const majorStarsDesc = palace.majorStars.map(star => {
        const brightnessDesc = star.brightness ? `亮度为${star.brightness}` : '无亮度标志';
        const transformation = palace.transformations.find(t => t.star === star.name);
        const mutagenDesc = transformation ? `，${transformation.type}四化星` : '，无四化星';
        return `${star.name}（本命星耀，${brightnessDesc}${mutagenDesc}）`;
      }).join('，');
      lines.push(`主星:${majorStarsDesc}`);
    } else {
      lines.push('主星:无');
    }

    // 辅星
    if (palace.minorStars.length > 0) {
      const minorStarsDesc = palace.minorStars.map(star => `${star.name}（本命星耀）`).join('，');
      lines.push(`辅星：${minorStarsDesc}`);
    } else {
      lines.push('辅星：无');
    }

    // 杂耀
    if (palace.otherStars.length > 0) {
      const otherStarsDesc = palace.otherStars.map(star => `${star.name}（本命星耀）`).join('，');
      lines.push(`杂耀:${otherStarsDesc}`);
    } else {
      lines.push('杂耀:无');
    }

    // 12神信息
    if (palace.changsheng12) lines.push(`长生 12 神:${palace.changsheng12}。`);
    if (palace.boshi12) lines.push(`博士 12 神:${palace.boshi12}。`);
    if (palace.jiangqian12) lines.push(`流年将前 12 神:${palace.jiangqian12}。`);
    if (palace.suiqian12) lines.push(`流年岁前 12 神:${palace.suiqian12}。`);

    // 大限
    if (palace.majorPeriod) {
      lines.push(`大限: ${palace.majorPeriod.startAge}至${palace.majorPeriod.endAge}岁（运限天干为${palace.majorPeriod.stem}，运限地支为${palace.majorPeriod.branch}）。`);
    }

    // 小限
    if (palace.minorPeriods && palace.minorPeriods.length > 0) {
      lines.push(`小限: ${palace.minorPeriods.join('、')}`);
    }

    return lines.join('\n');
  }

  /**
   * 验证命盘完整性
   */
  static validate(chart: ZiweiChart): boolean {
    return (
      !!chart.birthInfo &&
      !!chart.palaces &&
      chart.palaces.length === 12 &&
      !!chart.soulStar &&
      !!chart.bodyStar &&
      !!chart.fiveElementType
    );
  }

  /**
   * 获取命宫主星
   */
  static getLifePalaceMajorStars(chart: ZiweiChart): string[] {
    const lifePalace = chart.palaces.find(p => p.name === '命宫');
    return lifePalace?.majorStars.map(s => s.name) || [];
  }

  /**
   * 获取特定宫位信息
   */
  static getPalaceByName(chart: ZiweiChart, palaceName: string): Palace | undefined {
    return chart.palaces.find(p => p.name === palaceName);
  }

  /**
   * 获取命盘摘要
   */
  static getChartSummary(chart: ZiweiChart): string {
    const lifePalace = this.getPalaceByName(chart, '命宫');
    const majorStars = lifePalace?.majorStars.map(s => s.name).join('、') || '无主星';

    return `
命主: ${chart.soulStar}
身主: ${chart.bodyStar}
五行局: ${chart.fiveElementType}
命宫主星: ${majorStars}
命宫位置: ${lifePalace?.stem}${lifePalace?.branch}
    `.trim();
  }
}
