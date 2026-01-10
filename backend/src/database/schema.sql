-- Ziwei Destiny Analysis System - Database Schema
-- SQLite Database Schema

-- =====================================================
-- 知识库表
-- =====================================================
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  stars TEXT,              -- JSON array: ["紫微", "武曲"]
  palaces TEXT,            -- JSON array: ["官禄宫"]
  keywords TEXT NOT NULL,  -- JSON array for search
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 知识库索引
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);

-- =====================================================
-- 分析缓存表
-- =====================================================
CREATE TABLE IF NOT EXISTS analysis_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chart_key TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  result TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  token_count INTEGER,
  execution_time REAL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER
);

-- 缓存索引 - 复合索引用于高效查找
CREATE INDEX IF NOT EXISTS idx_cache_lookup ON analysis_cache(chart_key, analysis_type, timestamp DESC);

-- 缓存索引 - 用于过期清理
CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON analysis_cache(timestamp);

-- 缓存索引 - 用于按命盘清理
CREATE INDEX IF NOT EXISTS idx_cache_chart ON analysis_cache(chart_key);
