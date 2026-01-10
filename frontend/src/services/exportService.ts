import type { ZiweiChart, ChatMessage } from '@/types';
import { formatChartToReadableText, getHourName } from './chartService';

/**
 * 导出服务 - 用于生成 Markdown 格式的报告
 */
export class ExportService {
  /**
   * 生成完整的 Markdown 报告
   */
  static generateMarkdownReport(
    chart: ZiweiChart,
    analysisType: string,
    analysisContent: string,
    messages: ChatMessage[],
    executionTime?: number,
    tokenCount?: number
  ): string {
    const lines: string[] = [];

    // 标题
    lines.push('# 紫微斗数命盘分析报告\n');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

    // 基本信息
    lines.push('## 基本信息\n');
    lines.push(`- 出生日期: ${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日`);
    lines.push(`- 出生时辰: ${getHourName(chart.birthInfo.hour)}`);
    lines.push(`- 性别: ${chart.birthInfo.gender === 'male' ? '男' : '女'}`);
    lines.push(`- 历法: ${chart.birthInfo.isLunar ? '农历' : '阳历'}`);
    if (chart.bazi) {
      lines.push(`- 八字: ${chart.bazi.year} ${chart.bazi.month} ${chart.bazi.day} ${chart.bazi.hour}`);
      if (chart.bazi.solarDate) lines.push(`- 阳历: ${chart.bazi.solarDate}`);
      if (chart.bazi.lunarDate) lines.push(`- 阴历: ${chart.bazi.lunarDate}`);
    }
    if (chart.zodiacSign) lines.push(`- 星座: ${chart.zodiacSign}`);
    if (chart.zodiacAnimal) lines.push(`- 生肖: ${chart.zodiacAnimal}`);
    lines.push(`- 命主: ${chart.soulStar}`);
    lines.push(`- 身主: ${chart.bodyStar}`);
    lines.push(`- 五行局: ${chart.fiveElementType}`);
    if (chart.bodyPalaceBranch) lines.push(`- 身宫位置: ${chart.bodyPalaceBranch}`);
    if (chart.originalPalace) lines.push(`- 来因宫: ${chart.originalPalace}`);
    lines.push('');

    // 命盘数据
    lines.push('## 命盘数据\n');
    lines.push('### 十二宫位配置\n');
    chart.palaces.forEach(palace => {
      const flags = [
        palace.isBodyPalace ? '[身宫]' : '',
        palace.isOriginalPalace ? '[来因宫]' : '',
      ].filter(Boolean).join(' ');

      lines.push(`**${palace.name}** ${flags ? `*${flags}*` : ''} [${palace.stem}${palace.branch}]:`);

      const majorStars = palace.majorStars.map(s => {
        let str = s.name;
        if (s.brightness) str += `(${s.brightness})`;
        return str;
      }).join('、') || '无主星';
      if (majorStars) lines.push(`- 主星: ${majorStars}`);

      const minorStars = palace.minorStars.map(s => s.name).join('、');
      if (minorStars) lines.push(`- 辅星: ${minorStars}`);

      const otherStars = palace.otherStars.map(s => s.name).join('、');
      if (otherStars) lines.push(`- 杂耀: ${otherStars}`);

      const transformations = palace.transformations.map(t => `${t.star}${t.type}`).join('、');
      if (transformations) lines.push(`- 四化: ${transformations}`);

      if (palace.majorPeriod) {
        lines.push(`- 大限: ${palace.majorPeriod.startAge}-${palace.majorPeriod.endAge}岁 (${palace.majorPeriod.stem}${palace.majorPeriod.branch})`);
      }

      lines.push('');
    });

    // AI 分析结果
    lines.push(`## ${analysisType}\n`);

    if (executionTime || tokenCount) {
      lines.push('**分析统计**');
      if (executionTime) lines.push(`- 推理耗时: ${executionTime.toFixed(2)}秒`);
      if (tokenCount) lines.push(`- Token 数量: ${tokenCount}`);
      lines.push('');
    }

    lines.push(analysisContent);

    // 对话历史
    if (messages.length > 0) {
      lines.push('\n## 对话记录\n');
      messages.forEach((msg) => {
        const role = msg.role === 'user' ? '用户' : '天机大师';
        lines.push(`### ${role}\n`);
        lines.push(`${msg.content}\n`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 下载 Markdown 文件
   */
  static downloadMarkdown(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出当前报告
   */
  static exportReport(
    chart: ZiweiChart,
    analysisType: string,
    analysisContent: string,
    messages: ChatMessage[],
    executionTime?: number,
    tokenCount?: number
  ): void {
    const markdown = this.generateMarkdownReport(
      chart,
      analysisType,
      analysisContent,
      messages,
      executionTime,
      tokenCount
    );

    // 生成文件名
    const dateStr = `${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日`;
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `紫微斗数分析_${dateStr}_${timestamp}.md`;

    this.downloadMarkdown(markdown, filename);
  }

  /**
   * 简化的导出（仅报告内容，但包含完整的 convert.py 风格命盘信息）
   */
  static exportSimpleReport(
    chart: ZiweiChart,
    reportContent: string
  ): void {
    const lines: string[] = [];

    lines.push('# 紫微斗数命盘分析报告\n');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

    // 使用 formatChartToReadableText 生成完整的 convert.py 风格命盘信息
    const chartDetails = formatChartToReadableText(chart);
    lines.push(chartDetails);
    lines.push('');

    // 分析内容
    lines.push('## 命盘分析\n');
    lines.push(reportContent);

    const dateStr = `${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日`;
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `紫微斗数分析_${dateStr}_${timestamp}.md`;

    this.downloadMarkdown(lines.join('\n'), filename);
  }
}
