/**
 * 环境变量配置 - 必须最先加载
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量（从 backend 目录查找 .env）
const result = config({ path: resolve(__dirname, '../../.env') });

if (result.error) {
  console.warn('Failed to load .env file:', result.error.message);
}

export const env = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  MINIMAX_BASE_URL: process.env.MINIMAX_BASE_URL,
  MINIMAX_MODEL: process.env.MINIMAX_MODEL,
  PORT: process.env.PORT || '8000',
  DB_PATH: process.env.DB_PATH,
  CACHE_EXPIRE_DAYS: process.env.CACHE_EXPIRE_DAYS,
};
