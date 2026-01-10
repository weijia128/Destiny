import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'dist/',
        'src/database/seeds/',
      ],
    },
    // 允许使用相对路径导入
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
