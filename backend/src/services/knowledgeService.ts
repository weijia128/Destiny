/**
 * 知识服务
 * 负责知识检索、搜索和相关性排序
 * 使用动态导入加载模块化知识库
 */

import type { DestinyType, SubCategory, AnalysisCategory, KnowledgeEntry } from '../types/index.js';

/**
 * 知识服务类
 */
export class KnowledgeService {
  /**
   * 根据命理大类和子分类检索知识（新版）
   *
   * @param destinyType - 命理大类
   * @param subCategory - 子分类
   * @param chartText - 命盘文本
   * @param query - 用户查询
   * @returns 匹配的知识条目
   */
  static async retrieveByCategory(
    destinyType: DestinyType,
    subCategory: SubCategory,
    chartText: string,
    query: string
  ): Promise<KnowledgeEntry[]> {
    try {
      // 1. 加载共享知识
      const sharedEntries = await this.loadSharedKnowledge(subCategory);

      // 2. 加载大类专属知识
      const specificEntries = await this.loadSpecificKnowledge(
        destinyType,
        subCategory,
        chartText,
        query
      );

      // 3. 合并并排序
      const allEntries = [...sharedEntries, ...specificEntries];
      return this.rank(allEntries, chartText + ' ' + query);
    } catch (error) {
      console.error(`Failed to retrieve knowledge for ${destinyType}/${subCategory}:`, error);
      return [];
    }
  }

  /**
   * 加载共享知识库
   */
  private static async loadSharedKnowledge(subCategory: SubCategory): Promise<KnowledgeEntry[]> {
    try {
      const sharedModule = await import('../knowledge/shared/index.js');
      return sharedModule.retrieve(subCategory.toString());
    } catch (error) {
      // 共享知识库加载失败不影响主流程
      return [];
    }
  }

  /**
   * 加载大类专属知识库
   */
  private static async loadSpecificKnowledge(
    destinyType: DestinyType,
    subCategory: SubCategory,
    chartText: string,
    query: string
  ): Promise<KnowledgeEntry[]> {
    try {
      // 动态导入: ../knowledge/{destinyType}/{subCategory}.js
      const module = await import(`../knowledge/${destinyType}/${subCategory}.js`);

      // 调用模块的 retrieve 函数
      if (module.retrieve) {
        return module.retrieve(chartText, query);
      }

      return module.entries || [];
    } catch (error) {
      console.error(`Failed to load ${destinyType}/${subCategory} knowledge:`, error);

      // 回退到该大类的 general 知识库
      try {
        const generalModule = await import(`../knowledge/${destinyType}/general.js`);
        return generalModule.retrieve ? generalModule.retrieve(chartText, query) : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * 获取大类可用的子分类列表
   */
  static getAvailableSubCategories(destinyType: DestinyType): SubCategory[] {
    const commonCategories: SubCategory[] = [
      'career',
      'wealth',
      'relationship',
      'health',
      'family',
      'general',
    ];

    const exclusiveCategories: Record<DestinyType, SubCategory[]> = {
      ziwei: ['ziweigeju', 'sixi', 'dashun'],
      bazi: ['geju', 'yongshen', 'shishen', 'dayun'],
      meihua: [],
      qimen: ['jushi', 'men', 'xing', 'shen'],
      liuyao: ['gua', 'liuyaoyin', 'shiyin'],
      shouxiang: ['xian', 'qiu', 'zhi', 'wen'],
    };

    return [...commonCategories, ...(exclusiveCategories[destinyType] || [])];
  }

  /**
   * 根据类别检索知识（旧版，保持兼容）
   * 默认使用紫微斗数大类
   *
   * @param category - 分析类别
   * @param chartText - 命盘文本
   * @param query - 用户查询
   * @returns 匹配的知识条目
   */
  static async retrieve(
    category: AnalysisCategory,
    chartText: string,
    query: string
  ): Promise<KnowledgeEntry[]> {
    // 默认为紫微斗数大类，保持向后兼容
    return this.retrieveByCategory('ziwei', category, chartText, query);
  }

  /**
   * 关键词搜索 (跨类别搜索)
   *
   * @param category - 分析类别
   * @param keywords - 关键词数组
   * @returns 匹配的知识条目
   */
  static async search(
    category: AnalysisCategory,
    keywords: string[]
  ): Promise<KnowledgeEntry[]> {
    try {
      const module = await import(`../knowledge/${category}.js`);

      // 检查模块是否有 searchByKeywords 方法
      if (module.searchByKeywords) {
        return module.searchByKeywords(keywords);
      }

      // 回退到简单的关键词匹配
      return module.entries?.filter((entry: KnowledgeEntry) =>
        keywords.some(keyword =>
          entry.title.includes(keyword) ||
          entry.keywords.some(k => k.includes(keyword))
        )
      ) || [];
    } catch (error) {
      console.error(`Failed to search knowledge for ${category}:`, error);
      return [];
    }
  }

  /**
   * 相关性排序
   * 根据关键词匹配度对知识条目进行排序
   *
   * @param entries - 知识条目数组
   * @param query - 查询文本
   * @returns 排序后的知识条目（最多返回 5 条）
   */
  static rank(entries: KnowledgeEntry[], query: string): Array<KnowledgeEntry & { score: number }> {
    const queryLower = query.toLowerCase();

    return entries
      .map(entry => ({
        ...entry,
        score: this.calculateRelevance(entry, queryLower),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * 计算相关性分数
   *
   * 评分规则:
   * - 标题完全匹配: +10 分
   * - 关键词匹配: +5 分
   * - 星曜匹配: +3 分
   * - 宫位匹配: +2 分
   *
   * @param entry - 知识条目
   * @param query - 查询文本（小写）
   * @returns 相关性分数
   */
  private static calculateRelevance(
    entry: KnowledgeEntry,
    query: string
  ): number {
    let score = 0;

    // 标题匹配权重最高
    if (entry.title.toLowerCase().includes(query)) {
      score += 10;
    }

    // 关键词匹配
    entry.keywords.forEach(keyword => {
      if (query.includes(keyword.toLowerCase())) {
        score += 5;
      }
    });

    // 星曜匹配
    entry.stars?.forEach(star => {
      if (query.includes(star)) {
        score += 3;
      }
    });

    // 宫位匹配
    entry.palaces?.forEach(palace => {
      if (query.includes(palace)) {
        score += 2;
      }
    });

    return score;
  }

  /**
   * 格式化知识库内容供 AI 使用
   *
   * @param entries - 知识条目数组
   * @returns 格式化后的文本
   */
  static formatForAI(entries: KnowledgeEntry[]): string {
    if (entries.length === 0) {
      return '未找到相关知识库内容';
    }

    return entries
      .map(entry => `【${entry.title}】\n${entry.content}`)
      .join('\n\n---\n\n');
  }

  /**
   * 从文本中提取关键词
   *
   * @param text - 输入文本
   * @returns 提取的关键词数组
   */
  static extractKeywords(text: string): string[] {
    const keywordPatterns = [
      // 14 主星
      '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
      '天府', '太阴', '贪狼', '巨门', '天相', '天梁',
      '七杀', '破军',
      // 辅星
      '文昌', '文曲', '左辅', '右弼', '天魁', '天钺',
      '禄存', '天马',
      // 4 化
      '化禄', '化权', '化科', '化忌',
      // 12 宫位
      '命宫', '兄弟宫', '夫妻宫', '子女宫',
      '财帛宫', '疾厄宫', '迁移宫', '交友宫',
      '官禄宫', '田宅宫', '福德宫', '父母宫',
      // 领域关键词
      '事业', '财运', '感情', '健康', '家庭',
      '工作', '投资', '婚姻', '桃花', '养生',
      '四化', '格局', '运势', '命运', '人生',
    ];

    return keywordPatterns.filter(keyword => text.includes(keyword));
  }

  /**
   * 获取所有可用的知识类别
   *
   * @returns 所有支持的分析类别
   */
  static getAvailableCategories(): AnalysisCategory[] {
    return [
      'career',
      'wealth',
      'relationship',
      'health',
      'family',
      'general',
    ];
  }

  /**
   * 批量检索多个类别的知识
   *
   * @param categories - 分析类别数组
   * @param chartText - 命盘文本
   * @param query - 用户查询
   * @returns 类别到知识条目的映射
   */
  static async retrieveBatch(
    categories: AnalysisCategory[],
    chartText: string,
    query: string
  ): Promise<Map<AnalysisCategory, KnowledgeEntry[]>> {
    const results = new Map<AnalysisCategory, KnowledgeEntry[]>();

    await Promise.all(
      categories.map(async (category) => {
        const entries = await this.retrieve(category, chartText, query);
        results.set(category, entries);
      })
    );

    return results;
  }
}
