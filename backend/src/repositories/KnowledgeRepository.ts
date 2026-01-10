/**
 * 知识库数据访问层
 */

import { getDatabase } from '../database/connection';
import type { KnowledgeEntry } from '../models/KnowledgeEntry';
import { rowToKnowledgeEntry, knowledgeEntryToRow } from '../models/KnowledgeEntry';

export class KnowledgeRepository {
  private db = getDatabase();

  /**
   * 根据 ID 获取知识条目
   */
  findById(id: string): KnowledgeEntry | null {
    const stmt = this.db.prepare('SELECT * FROM knowledge_entries WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? rowToKnowledgeEntry(row) : null;
  }

  /**
   * 根据分类获取知识条目
   */
  findByCategory(category: string): KnowledgeEntry[] {
    const stmt = this.db.prepare('SELECT * FROM knowledge_entries WHERE category = ? ORDER BY created_at DESC');
    const rows = stmt.all(category) as any[];
    return rows.map(rowToKnowledgeEntry);
  }

  /**
   * 根据关键词搜索知识条目
   */
  searchByKeywords(keywords: string[]): KnowledgeEntry[] {
    if (keywords.length === 0) return [];

    // 构建 WHERE 条件：keywords 字段包含任何关键词
    const conditions = keywords.map(() => 'keywords LIKE ?').join(' OR ');
    const params = keywords.map(kw => `%${kw}%`);

    const stmt = this.db.prepare(
      `SELECT * FROM knowledge_entries WHERE ${conditions} ORDER BY created_at DESC`
    );

    const rows = stmt.all(...params) as any[];
    return rows.map(rowToKnowledgeEntry);
  }

  /**
   * 获取所有知识条目
   */
  getAll(): KnowledgeEntry[] {
    const stmt = this.db.prepare('SELECT * FROM knowledge_entries ORDER BY category, created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(rowToKnowledgeEntry);
  }

  /**
   * 创建新知识条目
   */
  create(entry: KnowledgeEntry): void {
    const row = knowledgeEntryToRow(entry);
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_entries (id, category, title, content, stars, palaces, keywords, created_at, updated_at)
      VALUES (@id, @category, @title, @content, @stars, @palaces, @keywords, @created_at, @updated_at)
    `);
    stmt.run(row);
  }

  /**
   * 更新知识条目
   */
  update(entry: KnowledgeEntry): void {
    const row = knowledgeEntryToRow({ ...entry, updated_at: Math.floor(Date.now() / 1000) });
    const stmt = this.db.prepare(`
      UPDATE knowledge_entries
      SET category = @category, title = @title, content = @content,
          stars = @stars, palaces = @palaces, keywords = @keywords, updated_at = @updated_at
      WHERE id = @id
    `);
    stmt.run(row);
  }

  /**
   * 删除知识条目
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM knowledge_entries WHERE id = ?');
    stmt.run(id);
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    const stmt = this.db.prepare('SELECT DISTINCT category FROM knowledge_entries ORDER BY category');
    const rows = stmt.all() as { category: string }[];
    return rows.map(r => r.category);
  }

  /**
   * 获取统计信息
   */
  getStats(): { total: number; byCategory: Record<string, number> } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM knowledge_entries');
    const { count: total } = totalStmt.get() as { count: number };

    const categoryStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count FROM knowledge_entries GROUP BY category
    `);
    const categoryRows = categoryStmt.all() as { category: string; count: number }[];

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    return { total, byCategory };
  }
}

// 导出单例
export const knowledgeRepository = new KnowledgeRepository();
