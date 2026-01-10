import { Tool } from './types.js';

/**
 * 日历/黄历工具
 * 提供农历转换和黄历信息查询
 */
export const calendarTool: Tool = {
  name: 'calendar_almanac',
  description: `查询日历和黄历信息，包括农历转换、宜忌事项等。

使用场景：
- 当用户询问特定日期的黄历信息时
- 当需要分析特定日期的宜忌时
- 当需要提供日期相关的命理建议时

参数说明：
- date: 公历日期（格式：YYYY-MM-DD）
- detail: 是否返回详细信息（默认：false）`,

  parameters: [
    {
      name: 'date',
      type: 'string',
      description: '公历日期，格式：YYYY-MM-DD',
      required: true,
    },
    {
      name: 'detail',
      type: 'boolean',
      description: '是否返回详细信息',
      required: false,
      default: false,
    },
  ],

  category: 'external',

  handler: async (params) => {
    const startTime = Date.now();

    try {
      const { date, detail = false } = params as {
        date: string;
        detail?: boolean;
      };

      // 解析日期
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format');
      }

      // 获取基本的日期信息
      const result = {
        solar: {
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          weekday: ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()],
        },
        // TODO: 添加农历转换 - 这里可以集成 lunar-javascript 库
        lunar: {
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          chineseYear: `${dateObj.getFullYear()}年`,
          chineseMonth: `${dateObj.getMonth() + 1}月`,
          chineseDay: `${dateObj.getDate()}日`,
          isLeap: false,
        },
        // TODO: 添加黄历数据 - 这里可以集成黄历数据API
        almanac: {
          yi: ['嫁娶', '出行', '移徙'],
          ji: ['动土', '破土', '安葬'],
          jishen: ['天德', '月德'],
          xiongsha: ['日破', '时冲'],
        },
      };

      return {
        success: true,
        data: detail ? result : { formatted: formatAlmanac(result) },
        toolName: 'calendar_almanac',
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: 'calendar_almanac',
        executionTime: Date.now() - startTime,
      };
    }
  },
};

/**
 * 格式化黄历信息供 AI 使用
 */
function formatAlmanac(data: any): string {
  return `
【日期信息】
公历：${data.solar.year}年${data.solar.month}月${data.solar.day}日 星期${data.solar.weekday}
农历：${data.lunar.chineseYear}${data.lunar.chineseMonth}${data.lunar.chineseDay}

【黄历宜忌】
宜：${data.almanac.yi.join('、')}
忌：${data.almanac.ji.join('、')}

【吉神宜趋】
${data.almanac.jishen.join('、')}

【凶神宜忌】
${data.almanac.xiongsha.join('、')}
  `.trim();
}
