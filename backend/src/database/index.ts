/**
 * 数据库初始化和迁移管理
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './connection';
import { seedKnowledgeBase } from './seeds/seed.js';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 执行 SQL 文件
 */
function executeSqlFile(db: ReturnType<typeof import('./connection').getDatabase>, filename: string): void {
  try {
    const sql = readFileSync(join(__dirname, filename), 'utf-8');
    db.exec(sql);
    console.log(`✅ Executed: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to execute ${filename}:`, error);
    throw error;
  }
}

/**
 * 运行数据库迁移
 */
function runMigrations(): void {
  const db = getDatabase();
  executeSqlFile(db, 'schema.sql');
  console.log('✅ Database migrations completed');
}

/**
 * 初始化数据库
 */
export function initDatabase(): ReturnType<typeof getDatabase> {
  console.log('🔧 Initializing database...');

  // 运行迁移
  runMigrations();

  // 导入知识库种子数据
  seedKnowledgeBase();

  const db = getDatabase();

  console.log('✅ Database initialized successfully');

  return db;
}

/**
 * 重置数据库（仅用于开发/测试）
 */
export function resetDatabase(): void {
  const db = getDatabase();

  // 删除所有表
  db.exec('DROP TABLE IF EXISTS analysis_cache');
  db.exec('DROP TABLE IF EXISTS knowledge_entries');

  console.log('⚠️  Database reset - all tables dropped');

  // 重新运行迁移
  runMigrations();

  // 重新种子知识库
  seedKnowledgeBase();
}

// 导出数据库获取函数
export { getDatabase, closeDatabase, checkDatabaseHealth } from './connection';
