import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheRepository } from './CacheRepository.js';
import Database from 'better-sqlite3';

describe('CacheRepository', () => {
  let repository: CacheRepository;
  let db: Database.Database;

  beforeEach(() => {
    // 创建独立的内存数据库
    db = new Database(':memory:');

    // 创建测试表结构
    db.exec(`
      CREATE TABLE analysis_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chart_key TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        result TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        token_count INTEGER,
        execution_time REAL,
        hit_count INTEGER DEFAULT 0,
        last_hit_at INTEGER
      )
    `);

    // 注入测试数据库到 repository
    repository = new CacheRepository();
    (repository as any).db = db;
  });

  afterEach(() => {
    db.close();
  });

  describe('save', () => {
    it('应该成功保存缓存', () => {
      const chartKey = 'test-chart-123';
      const analysisType = 'career';
      const result = '测试分析结果';

      const id = repository.save(chartKey, analysisType, result);

      expect(id).toBeGreaterThan(0);
    });

    it('应该保存元数据', () => {
      const chartKey = 'test-chart-456';
      const analysisType = 'wealth';
      const result = '财运分析';
      const metadata = {
        tokenCount: 1000,
        executionTime: 2.5,
      };

      repository.save(chartKey, analysisType, result, metadata);

      const cached = repository.get(chartKey, analysisType);
      expect(cached).toBeTruthy();
      expect(cached!.result).toBe(result);
    });
  });

  describe('get', () => {
    it('应该获取最新的缓存', () => {
      const chartKey = 'test-chart-789';
      const analysisType = 'career';

      // 手动插入数据，确保时间戳不同
      const timestamp1 = Math.floor(Date.now() / 1000) - 10;
      const timestamp2 = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, analysisType, '第一次结果', timestamp1);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, analysisType, '第二次结果', timestamp2);

      const cached = repository.get(chartKey, analysisType);

      expect(cached).toBeTruthy();
      expect(cached!.result).toBe('第二次结果');
    });

    it('未找到缓存时应返回 null', () => {
      const cached = repository.get('nonexistent', 'career');
      expect(cached).toBeNull();
    });
  });

  describe('getByChart', () => {
    it('应该获取指定命盘的所有缓存', () => {
      const chartKey = 'test-chart-multi';

      repository.save(chartKey, 'career', '事业分析');
      repository.save(chartKey, 'wealth', '财运分析');
      repository.save(chartKey, 'relationship', '感情分析');

      const caches = repository.getByChart(chartKey);

      expect(caches.length).toBe(3);
    });

    it('应该按时间倒序返回', () => {
      const chartKey = 'test-chart-order';
      const baseTime = Math.floor(Date.now() / 1000);

      // 手动插入数据，确保时间戳递增
      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, 'career', '第一次', baseTime - 20);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, 'career', '第二次', baseTime - 10);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, 'career', '第三次', baseTime);

      const caches = repository.getByChart(chartKey);

      expect(caches[0].result).toBe('第三次');
      expect(caches[1].result).toBe('第二次');
      expect(caches[2].result).toBe('第一次');
    });
  });

  describe('clearChart', () => {
    it('应该清除指定命盘的所有缓存', () => {
      const chartKey = 'test-chart-clear';

      repository.save(chartKey, 'career', '事业');
      repository.save(chartKey, 'wealth', '财运');

      const deleted = repository.clearChart(chartKey);

      expect(deleted).toBe(2);
      expect(repository.getByChart(chartKey).length).toBe(0);
    });

    it('清除不存在的命盘应返回 0', () => {
      const deleted = repository.clearChart('nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('clearExpired', () => {
    it('应该清除过期缓存', () => {
      const chartKey = 'test-chart-expired';

      // 插入一条旧数据
      const oldTimestamp = Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60); // 10天前
      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(chartKey, 'career', '旧数据', oldTimestamp);

      // 插入一条新数据
      repository.save(chartKey, 'wealth', '新数据');

      // 清除7天前的数据
      const deleted = repository.clearExpired(7);

      expect(deleted).toBe(1);
      expect(repository.getByChart(chartKey).length).toBe(1);
      expect(repository.get(chartKey, 'wealth')).toBeTruthy();
    });
  });

  describe('incrementHitCount', () => {
    it('应该增加缓存命中计数', () => {
      const chartKey = 'test-chart-hits';
      const id = repository.save(chartKey, 'career', '测试');

      repository.incrementHitCount(id);
      repository.incrementHitCount(id);

      // 验证 hit_count 增加
      const stmt = db.prepare('SELECT hit_count FROM analysis_cache WHERE id = ?');
      const { hit_count } = stmt.get(id) as { hit_count: number };

      expect(hit_count).toBe(2);
    });
  });

  describe('getStats', () => {
    it('应该返回缓存统计信息', () => {
      const now = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp, hit_count)
        VALUES (?, ?, ?, ?, ?)
      `).run('chart1', 'career', '1', now, 0);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp, hit_count)
        VALUES (?, ?, ?, ?, ?)
      `).run('chart2', 'career', '2', now, 0);

      db.prepare(`
        INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp, hit_count)
        VALUES (?, ?, ?, ?, ?)
      `).run('chart3', 'wealth', '3', now, 0);

      const stats = repository.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byType['career']).toBe(2);
      expect(stats.byType['wealth']).toBe(1);
    });

    it('空数据库应返回零统计', () => {
      const stats = repository.getStats();

      expect(stats.total).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(Object.keys(stats.byType).length).toBe(0);
    });
  });

  describe('getRecent', () => {
    it('应该返回最近的缓存条目', () => {
      const baseTime = Math.floor(Date.now() / 1000);

      // 插入 15 条数据，确保时间戳递增
      for (let i = 1; i <= 15; i++) {
        db.prepare(`
          INSERT INTO analysis_cache (chart_key, analysis_type, result, timestamp)
          VALUES (?, ?, ?, ?)
        `).run(`chart${i}`, 'career', `结果${i}`, baseTime + i);
      }

      const recent = repository.getRecent(5);

      expect(recent.length).toBe(5);
      expect(recent[0].result).toBe('结果15');
      expect(recent[4].result).toBe('结果11');
    });
  });
});
