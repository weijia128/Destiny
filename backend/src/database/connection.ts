/**
 * SQLite 数据库连接管理
 * 使用单例模式确保只有一个数据库连接
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

let dbInstance: Database.Database | null = null;

/**
 * 获取数据库单例实例
 */
export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // 从环境变量获取数据库路径，默认为 ./data/ziwei-destiny.db
  const dbPath = process.env.DB_PATH || './data/ziwei-destiny.db';
  const absolutePath = join(process.cwd(), dbPath);

  // 确保数据目录存在
  const dbDir = dirname(absolutePath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // 创建数据库连接
  const db = new Database(absolutePath);

  // 启用 WAL 模式以获得更好的并发性能
  db.pragma('journal_mode = WAL');

  // 设置性能优化选项
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');

  dbInstance = db;

  console.log(`✅ SQLite database connected: ${absolutePath}`);

  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * 检查数据库健康状态
 */
export function checkDatabaseHealth(): boolean {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 as health').get() as { health: number };
    return result.health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// 进程退出时关闭数据库连接
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
