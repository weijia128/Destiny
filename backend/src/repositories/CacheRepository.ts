/**
 * 分析缓存数据访问层
 */

import { getDatabase } from '../database/connection';
import type { AnalysisCache } from '../models/AnalysisCache';
import { rowToAnalysisCache } from '../models/AnalysisCache';

export class CacheRepository {
  private db = getDatabase();

  /**
   * 获取缓存（最新的一条）
   */
  get(chartKey: string, analysisType: string): AnalysisCache | null {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis_cache
      WHERE chart_key = ? AND analysis_type = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const row = stmt.get(chartKey, analysisType) as any;
    return row ? rowToAnalysisCache(row) : null;
  }

  /**
   * 保存或更新缓存
   */
  save(chartKey: string, analysisType: string, result: string, metadata?: {
    tokenCount?: number;
    executionTime?: number;
  }): number {
    const timestamp = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp, token_count, execution_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      chartKey,
      analysisType,
      result,
      timestamp,
      metadata?.tokenCount,
      metadata?.executionTime
    );

    return info.lastInsertRowid as number;
  }

  /**
   * 获取命盘的所有缓存
   */
  getByChart(chartKey: string): AnalysisCache[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis_cache
      WHERE chart_key = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(chartKey) as any[];
    return rows.map(rowToAnalysisCache);
  }

  /**
   * 清除指定命盘的所有缓存
   */
  clearChart(chartKey: string): number {
    const stmt = this.db.prepare('DELETE FROM analysis_cache WHERE chart_key = ?');
    const info = stmt.run(chartKey);
    return info.changes;
  }

  /**
   * 清除过期缓存
   * @param days 过期天数（默认7天）
   */
  clearExpired(days: number = 7): number {
    const expireTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    const stmt = this.db.prepare('DELETE FROM analysis_cache WHERE timestamp < ?');
    const info = stmt.run(expireTime);
    return info.changes;
  }

  /**
   * 增加缓存命中计数
   */
  incrementHitCount(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE analysis_cache
      SET hit_count = hit_count + 1, last_hit_at = ?
      WHERE id = ?
    `);
    stmt.run(Math.floor(Date.now() / 1000), id);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    total: number;
    totalHits: number;
    byType: Record<string, number>;
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM analysis_cache');
    const { count } = totalStmt.get() as { count: number };

    const hitsStmt = this.db.prepare('SELECT SUM(hit_count) as hits FROM analysis_cache');
    const { hits } = hitsStmt.get() as { hits: number | null };

    const typeStmt = this.db.prepare(`
      SELECT analysis_type, COUNT(*) as count FROM analysis_cache GROUP BY analysis_type
    `);
    const typeRows = typeStmt.all() as { analysis_type: string; count: number }[];

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.analysis_type] = row.count;
    }

    return { total: count, totalHits: hits || 0, byType };
  }

  /**
   * 获取最近的缓存条目
   */
  getRecent(limit: number = 10): AnalysisCache[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analysis_cache
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(rowToAnalysisCache);
  }
}

// 导出单例
export const cacheRepository = new CacheRepository();
