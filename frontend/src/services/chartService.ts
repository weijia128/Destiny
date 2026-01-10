import { astro } from 'iztro';
import type { BirthInfo, ZiweiChart, Palace, Star, Transformation } from '@/types';
import { PALACE_NAMES, HOURS } from '@/utils/constants';

/**
 * 使用 iztro 生成紫微斗数命盘
 */
export function generateZiweiChart(birthInfo: BirthInfo): ZiweiChart {
  try {
    const dateStr = `${birthInfo.year}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')}`;
    const gender = birthInfo.gender; // 'male' | 'female'
    const isLeapMonth = birthInfo.leapMonth || false;

    // 将小时数转换为时辰索引 (0-12)
    const timeIndex = Math.floor(birthInfo.hour / 2);

    // 根据历法类型选择不同的 iztro API
    let result;
    if (birthInfo.isLunar) {
      result = astro.byLunar(
        dateStr,
        timeIndex,
        gender,
        isLeapMonth
      );
    } else {
      result = astro.bySolar(
        dateStr,
        timeIndex,
        gender,
        isLeapMonth
      );
    }

    // 提取八字信息（从 iztro 原始数据中）
    const chineseDate = result.chineseDate || '';
    const baziPillars = chineseDate.split(' ').filter(s => s);

    // 转换为我们的类型格式
    const palaces: Palace[] = result.palaces.map((palace, index) => ({
      name: palace.name || PALACE_NAMES[index],
      branch: palace.earthlyBranch || '',
      stem: palace.heavenlyStem || '',
      isBodyPalace: palace.isBodyPalace || false,
      isOriginalPalace: palace.isOriginalPalace || false,
      majorStars: extractStars(palace.majorStars || [], 'major'),
      minorStars: extractStars(palace.minorStars || [], 'minor'),
      otherStars: extractStars(palace.adjectiveStars || [], 'other'),
      transformations: extractTransformations(palace),
      // 12神信息
      changsheng12: palace.changsheng12,
      boshi12: palace.boshi12,
      jiangqian12: palace.jiangqian12,
      suiqian12: palace.suiqian12,
      // 大限信息
      majorPeriod: palace.ages && palace.ages.length > 0 ? {
        startAge: palace.ages[0] || 0,
        endAge: palace.ages[palace.ages.length - 1] || 0,
        stem: palace.heavenlyStem || '',
        branch: palace.earthlyBranch || '',
      } : undefined,
      // 小限信息
      minorPeriods: palace.ages,
    }));

    // 找出身宫位置
    const bodyPalace = palaces.find(p => p.isBodyPalace);
    const originalPalace = palaces.find(p => p.isOriginalPalace);

    // 计算星座
    const zodiacSign = getZodiacSign(birthInfo.month, birthInfo.day);

    // 计算生肖
    const zodiacAnimal = getZodiacAnimal(birthInfo.year);

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
function extractStars(stars: Array<{ name: string; brightness?: string; mutagen?: string }>, type: Star['type']): Star[] {
  return stars.map((star) => ({
    name: star.name,
    brightness: star.brightness as Star['brightness'],
    type,
    nature: getStarNature(star.name),
  }));
}

/**
 * 提取四化信息
 */
function extractTransformations(palace: { majorStars?: Array<{ name: string; mutagen?: string }> }): Transformation[] {
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
function getStarNature(starName: string): Star['nature'] {
  const goodStars = ['紫微', '天府', '太阳', '太阴', '天同', '天机', '天相', '天梁', '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存'];
  const badStars = ['七杀', '破军', '火星', '铃星', '擎羊', '陀罗', '地空', '地劫'];

  if (goodStars.includes(starName)) return 'good';
  if (badStars.includes(starName)) return 'bad';
  return 'neutral';
}

/**
 * 获取星座
 */
function getZodiacSign(month: number, day: number): string {
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
function getZodiacAnimal(year: number): string {
  const animals = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
  return animals[year % 12];
}

/**
 * 获取命宫主星
 */
export function getLifePalaceMajorStars(chart: ZiweiChart): string[] {
  const lifePalace = chart.palaces.find(p => p.name === '命宫');
  return lifePalace?.majorStars.map(s => s.name) || [];
}

/**
 * 获取特定宫位信息
 */
export function getPalaceByName(chart: ZiweiChart, palaceName: string): Palace | undefined {
  return chart.palaces.find(p => p.name === palaceName);
}

/**
 * 获取命盘摘要
 */
export function getChartSummary(chart: ZiweiChart): string {
  const lifePalace = getPalaceByName(chart, '命宫');
  const majorStars = lifePalace?.majorStars.map(s => s.name).join('、') || '无主星';
  
  return `
命主: ${chart.soulStar}
身主: ${chart.bodyStar}
五行局: ${chart.fiveElementType}
命宫主星: ${majorStars}
命宫位置: ${lifePalace?.stem}${lifePalace?.branch}
  `.trim();
}

/**
 * 格式化命盘为文本（用于 AI 分析）
 */
export function formatChartForAI(chart: ZiweiChart): string {
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
 * 将单个宫位转换为可读文本（完全对齐 Python convert.py 的格式）
 */
function formatPalaceToReadableText(palace: Palace, index: number): string {
  const lines: string[] = [];

  // 宫位基本信息 - 对齐 convert.py 格式
  lines.push(`宫位${index + 1}号位，宫位名称是${palace.name}。`);
  lines.push(`宫位天干为${palace.stem}，宫位地支为${palace.branch}。`);
  lines.push(`${palace.isBodyPalace ? '是' : '不是'}身宫，${palace.isOriginalPalace ? '是' : '不是'}来因宫。`);

  // 主星 - 对齐 convert.py 格式
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

  // 辅星 - 对齐 convert.py 格式
  if (palace.minorStars.length > 0) {
    const minorStarsDesc = palace.minorStars.map(star => `${star.name}（本命星耀）`).join('，');
    lines.push(`辅星：${minorStarsDesc}`);
  } else {
    lines.push('辅星：无');
  }

  // 杂耀 - 对齐 convert.py 格式
  if (palace.otherStars.length > 0) {
    const otherStarsDesc = palace.otherStars.map(star => `${star.name}（本命星耀）`).join('，');
    lines.push(`杂耀:${otherStarsDesc}`);
  } else {
    lines.push('杂耀:无');
  }

  // 12神信息 - 对齐 convert.py 格式（带空格）
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
 * 将命盘转换为可读文本（完全对齐 Python convert.py 的格式，用于详细命盘报告）
 */
export function formatChartToReadableText(chart: ZiweiChart): string {
  const lines: string[] = [];

  // 基本信息 - 对齐 convert.py 格式
  lines.push('----------基本信息----------');
  lines.push(`命主性别：${chart.birthInfo.gender === 'male' ? '男' : '女'}`);
  if (chart.bazi?.solarDate) lines.push(`阳历生日：${chart.bazi.solarDate}`);
  if (chart.bazi?.lunarDate) lines.push(`阴历生日：${chart.bazi.lunarDate}`);
  if (chart.bazi) {
    lines.push(`八字：${chart.bazi.year} ${chart.bazi.month} ${chart.bazi.day} ${chart.bazi.hour}`);
  }
  lines.push(`生辰时辰：${getHourName(chart.birthInfo.hour)} (${chart.birthInfo.hour}点)`);
  if (chart.zodiacSign) lines.push(`星座：${chart.zodiacSign}`);
  if (chart.zodiacAnimal) lines.push(`生肖：${chart.zodiacAnimal}`);
  if (chart.bodyPalaceBranch) lines.push(`身宫地支：${chart.bodyPalaceBranch}`);
  if (chart.palaces[0]?.branch) lines.push(`命宫地支：${chart.palaces.find(p => p.name === '命宫')?.branch || ''}`);
  lines.push(`命主星：${chart.soulStar}`);
  lines.push(`身主星：${chart.bodyStar}`);
  lines.push(`五行局：${chart.fiveElementType}`);
  lines.push('----------宫位信息----------');

  // 宫位信息
  chart.palaces.forEach((palace, index) => {
    lines.push(formatPalaceToReadableText(palace, index));
    if (index < chart.palaces.length - 1) {
      lines.push('----------');
    }
  });

  return lines.join('\n');
}

/**
 * 根据小时值获取时辰名称
 * @param hour - 小时值（0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22）
 * @returns 时辰名称，如 '子时', '丑时', '午时' 等
 */
export function getHourName(hour: number): string {
  const hourOption = HOURS.find(h => h.value === hour);
  return hourOption?.label.split(' ')[0] || '未知时辰';
}

/**
 * 计算当前年龄
 * @param birthYear - 出生年份
 * @returns 当前年龄（虚岁）
 */
export function getCurrentAge(birthYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear + 1; // 虚岁计算：当前年份 - 出生年份 + 1
}

/**
 * 当前大限信息
 */
export interface CurrentMajorPeriodInfo {
  palace: Palace;           // 大限宫位
  age: number;              // 当前年龄
  startAge: number;         // 大限起始年龄
  endAge: number;           // 大限结束年龄
  yearsRemaining: number;   // 距离大限结束还有几年
}

/**
 * 获取当前大限宫位
 * @param chart - 紫微命盘
 * @returns 当前大限信息，如果未找到则返回 undefined
 */
export function getCurrentMajorPeriod(chart: ZiweiChart): CurrentMajorPeriodInfo | undefined {
  const age = getCurrentAge(chart.birthInfo.year);

  const palace = chart.palaces.find(p =>
    p.majorPeriod &&
    age >= p.majorPeriod.startAge &&
    age <= p.majorPeriod.endAge
  );

  if (!palace || !palace.majorPeriod) {
    return undefined;
  }

  return {
    palace,
    age,
    startAge: palace.majorPeriod.startAge,
    endAge: palace.majorPeriod.endAge,
    yearsRemaining: palace.majorPeriod.endAge - age,
  };
}

/**
 * 流年信息
 */
export interface YearlyFortuneInfo {
  year: number;               // 流年年份
  lunarDate: string;          // 流年农历日期
  solarDate: string;          // 流年阳历日期
  yearlyPalaces: Palace[];    // 流年十二宫
  yearlyMutagens?: {          // 流年四化
    lu?: string;              // 化禄星
    quan?: string;            // 化权星
    ke?: string;              // 化科星
    ji?: string;              // 化忌星
  };
}

/**
 * 获取当前流年信息
 * @param chart - 紫微命盘
 * @returns 流年信息
 */
export function getCurrentYearlyFortune(chart: ZiweiChart): YearlyFortuneInfo | undefined {
  try {
    // 使用 iztro rawData 中的 horoscope 方法
    const rawChart = chart.rawData as any;

    if (!rawChart || typeof rawChart.horoscope !== 'function') {
      console.warn('流年计算功能不可用：chart.rawData.horoscope 不是函数');
      return undefined;
    }

    // 获取当前日期的运限
    const currentDate = new Date();
    const horoscope = rawChart.horoscope(currentDate);

    if (!horoscope || !horoscope.yearly) {
      console.warn('无法获取流年数据');
      return undefined;
    }

    const yearly = horoscope.yearly;

    // 转换流年宫位数据
    const yearlyPalaces: Palace[] = (yearly.palaces || []).map((p: any, index: number) => ({
      name: p.name || PALACE_NAMES[index],
      branch: p.earthlyBranch || '',
      stem: p.heavenlyStem || '',
      isBodyPalace: false,
      isOriginalPalace: false,
      majorStars: extractStars(p.majorStars || [], 'major'),
      minorStars: extractStars(p.minorStars || [], 'minor'),
      otherStars: extractStars(p.adjectiveStars || [], 'other'),
      transformations: extractTransformations(p),
    }));

    // 提取流年四化
    const yearlyMutagens: YearlyFortuneInfo['yearlyMutagens'] = {};
    if (yearly.mutagen && Array.isArray(yearly.mutagen)) {
      yearly.mutagen.forEach((m: any) => {
        if (m.type === '禄' || m.type === '化禄') yearlyMutagens.lu = m.star;
        if (m.type === '权' || m.type === '化权') yearlyMutagens.quan = m.star;
        if (m.type === '科' || m.type === '化科') yearlyMutagens.ke = m.star;
        if (m.type === '忌' || m.type === '化忌') yearlyMutagens.ji = m.star;
      });
    }

    return {
      year: currentDate.getFullYear(),
      lunarDate: horoscope.lunarDate || '',
      solarDate: horoscope.solarDate || '',
      yearlyPalaces,
      yearlyMutagens,
    };
  } catch (error) {
    console.error('计算流年信息失败:', error);
    return undefined;
  }
}

