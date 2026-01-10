/**
 * 知识库种子数据运行器
 * 将内存中的知识库数据导入到 SQLite 数据库
 */

import { knowledgeBase } from '../../knowledge/index.js';
import { getDatabase } from '../connection.js';
import type { KnowledgeEntry } from '../../models/KnowledgeEntry.js';

/**
 * 种子知识库数据
 */
export function seedKnowledgeBase(): void {
  const db = getDatabase();

  // 检查是否已经种子过
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM knowledge_entries');
  const { count } = countStmt.get() as { count: number };

  if (count > 0) {
    console.log(`✅ Knowledge base already seeded with ${count} entries`);
    return;
  }

  console.log('🌱 Seeding knowledge base...');

  const stmt = db.prepare(`
    INSERT INTO knowledge_entries (id, category, title, content, stars, palaces, keywords, created_at, updated_at)
    VALUES (@id, @category, @title, @content, @stars, @palaces, @keywords, @created_at, @updated_at)
  `);

  const insertMany = db.transaction((entries: typeof knowledgeBase) => {
    for (const entry of entries) {
      // 兼容处理：新格式有 destinyType 和 subCategory，旧格式有 category
      const categoryValue = (entry as any).subCategory || (entry as any).category || 'general';

      const row = {
        id: entry.id,
        category: categoryValue,  // 使用 subCategory 作为 category
        title: entry.title,
        content: entry.content,
        stars: entry.stars ? JSON.stringify(entry.stars) : null,
        palaces: entry.palaces ? JSON.stringify(entry.palaces) : null,
        keywords: JSON.stringify(entry.keywords),
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };
      stmt.run(row);
    }
  });

  insertMany(knowledgeBase);

  console.log(`✅ Seeded ${knowledgeBase.length} knowledge entries`);
}

/**
 * 重置并重新种子知识库
 */
export function reseedKnowledgeBase(): void {
  const db = getDatabase();

  // 删除所有知识条目
  db.prepare('DELETE FROM knowledge_entries').run();

  console.log('⚠️  Knowledge base cleared');

  // 重新种子
  seedKnowledgeBase();
}
