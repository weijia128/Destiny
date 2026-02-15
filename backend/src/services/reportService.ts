import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 报告保存目录（项目相对路径）
const REPORTS_DIR = join(__dirname, '../../reports');

/**
 * 确保报告目录存在
 */
async function ensureReportsDir(): Promise<void> {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create reports directory:', error);
    throw error;
  }
}

/**
 * 保存报告到服务器文件系统
 * @param filename - 文件名
 * @param content - 报告内容（Markdown 格式）
 * @returns 保存的文件路径
 */
export async function saveReportToFile(filename: string, content: string): Promise<string> {
  await ensureReportsDir();

  const filepath = join(REPORTS_DIR, filename);

  try {
    await fs.writeFile(filepath, content, 'utf-8');
    console.log(`✅ Report saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Failed to save report:', error);
    throw error;
  }
}

/**
 * 列出所有报告
 */
export async function listReports(): Promise<string[]> {
  await ensureReportsDir();

  try {
    const files = await fs.readdir(REPORTS_DIR);
    return files.filter(file => file.endsWith('.md'));
  } catch (error) {
    console.error('Failed to list reports:', error);
    return [];
  }
}

/**
 * 读取报告内容
 */
export async function readReport(filename: string): Promise<string> {
  const filepath = join(REPORTS_DIR, filename);

  try {
    return await fs.readFile(filepath, 'utf-8');
  } catch (error) {
    console.error('Failed to read report:', error);
    throw error;
  }
}

/**
 * 删除报告
 */
export async function deleteReport(filename: string): Promise<void> {
  const filepath = join(REPORTS_DIR, filename);

  try {
    await fs.unlink(filepath);
    console.log(`✅ Report deleted: ${filepath}`);
  } catch (error) {
    console.error('Failed to delete report:', error);
    throw error;
  }
}
