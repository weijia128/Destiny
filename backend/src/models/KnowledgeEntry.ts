/**
 * 知识库条目模型
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  stars?: string[];
  palaces?: string[];
  keywords: string[];
  created_at: number;
  updated_at: number;
}

/**
 * 从数据库行转换为 KnowledgeEntry
 */
export function rowToKnowledgeEntry(row: any): KnowledgeEntry {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    stars: row.stars ? JSON.parse(row.stars) : undefined,
    palaces: row.palaces ? JSON.parse(row.palaces) : undefined,
    keywords: JSON.parse(row.keywords),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * 将 KnowledgeEntry 转换为数据库行（用于插入）
 */
export function knowledgeEntryToRow(entry: KnowledgeEntry): Omit<KnowledgeEntry, 'stars' | 'palaces' | 'keywords'> & {
  stars?: string;
  palaces?: string;
  keywords: string;
} {
  return {
    id: entry.id,
    category: entry.category,
    title: entry.title,
    content: entry.content,
    stars: entry.stars ? JSON.stringify(entry.stars) : undefined,
    palaces: entry.palaces ? JSON.stringify(entry.palaces) : undefined,
    keywords: JSON.stringify(entry.keywords),
    created_at: entry.created_at || Math.floor(Date.now() / 1000),
    updated_at: entry.updated_at || Math.floor(Date.now() / 1000),
  };
}
