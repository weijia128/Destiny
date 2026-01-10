/**
 * 基于后端 SQLite 的缓存服务
 * 通过 HTTP API 调用后端缓存接口
 */

const API_BASE = '/api/cache';

interface CacheEntry {
  id?: number;
  chartKey: string;
  analysisType: string;
  result: string;
  timestamp: number;
  tokenCount?: number;
  executionTime?: number;
  hitCount?: number;
  lastHitAt?: number;
  fromCache?: boolean;
}

export class CacheService {
  /**
   * 初始化（不再需要，后端处理）
   */
  async init(): Promise<void> {
    // No-op - backend handles initialization
  }

  /**
   * 生成命盘唯一标识符
   */
  private generateChartKey(chart: any): string {
    const birthInfo = chart.birthInfo || chart;
    return `${birthInfo.year}-${birthInfo.month}-${birthInfo.day}-${birthInfo.hour}-${birthInfo.gender}`;
  }

  /**
   * 获取缓存的分析结果
   */
  async getAnalysis(chart: any, analysisType: string): Promise<CacheEntry | null> {
    const chartKey = this.generateChartKey(chart);

    try {
      const response = await fetch(`${API_BASE}/${chartKey}/${analysisType}`);

      if (response.status === 404) {
        return null; // 缓存未找到是正常情况
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return {
          ...data.data,
          fromCache: true
        };
      }
      return null;
    } catch (error) {
      console.warn('Cache query failed:', error);
      return null;
    }
  }

  /**
   * 保存分析结果到缓存
   */
  async saveAnalysis(
    chart: any,
    analysisType: string,
    result: string,
    tokenCount?: number,
    executionTime?: number
  ): Promise<void> {
    const chartKey = this.generateChartKey(chart);

    try {
      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartKey,
          analysisType,
          result,
          tokenCount,
          executionTime
        })
      });
    } catch (error) {
      console.warn('Cache save failed:', error);
      // Silent fail - cache is optional
    }
  }

  /**
   * 获取命盘的所有缓存分析
   */
  async getAllAnalysis(chart: any): Promise<CacheEntry[]> {
    const chartKey = this.generateChartKey(chart);

    try {
      const response = await fetch(`${API_BASE}/chart/${chartKey}`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.warn('Get all cache failed:', error);
      return [];
    }
  }

  /**
   * 清除过期缓存（7天前）
   */
  async clearExpiredCache(): Promise<void> {
    try {
      await fetch(`${API_BASE}/expired/7`, { method: 'DELETE' });
    } catch (error) {
      console.warn('Clear expired cache failed:', error);
    }
  }

  /**
   * 清除指定命盘的所有缓存
   */
  async clearChartCache(chart: any): Promise<void> {
    const chartKey = this.generateChartKey(chart);

    try {
      await fetch(`${API_BASE}/chart/${chartKey}`, { method: 'DELETE' });
    } catch (error) {
      console.warn('Clear chart cache failed:', error);
    }
  }
}

// 导出单例
export const cacheService = new CacheService();
