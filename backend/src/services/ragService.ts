/**
 * RAG Service - Node.js 客户端
 * 连接 Python RAG 服务的客户端
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8001';

// ============= 类型定义 =============

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  title: string;
  destiny_type: string;
  category: string;
  level: string;
  source: string;
  distance?: number;
}

export interface RAGSource {
  id: string;
  title: string;
  score: number;
}

export interface RAGResponse {
  response: string;
  sources: SearchResult[];
  strategy: string;
  entities: string[];
  query_time_ms: number;
}

export interface SearchRequest {
  query: string;
  destiny_types: string[];
  categories?: string[];
  strategy?: string;
  top_k?: number;
}

export interface RAGRequest {
  query: string;
  destiny_type: string;
  category?: string;
  chat_history?: Array<{ role: string; content: string }>;
  top_k?: number;
}

export interface DocumentRecord {
  id: string;
  file_path: string;
  title: string;
  destiny_type: string;
  category: string;
  chunks: number;
  indexed_at: string;
}

export interface KnowledgeStats {
  total_documents: number;
  total_chunks: number;
  by_destiny_type: Record<string, { documents: number; chunks: number }>;
}

// ============= RAG Service 类 =============

export class RAGService {
  private client: AxiosInstance;
  private fallbackMode: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: RAG_SERVICE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('RAG Service Error:', error.message);
        this.fallbackMode = true;
        throw error;
      }
    );
  }

  /**
   * 检查服务是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * 知识库检索
   */
  async search(params: SearchRequest): Promise<SearchResult[]> {
    if (this.fallbackMode) {
      return this.fallbackSearch(params);
    }

    try {
      const response = await this.client.post('/api/rag/search', {
        query: params.query,
        destiny_types: params.destiny_types,
        categories: params.categories,
        strategy: params.strategy || 'hybrid_vector',
        top_k: params.top_k || 10,
      });

      return response.data.results || [];
    } catch (error) {
      console.error('RAG search failed, using fallback');
      return this.fallbackSearch(params);
    }
  }

  /**
   * RAG 问答
   */
  async query(request: RAGRequest): Promise<RAGResponse> {
    if (this.fallbackMode) {
      return this.fallbackQuery(request);
    }

    try {
      const response = await this.client.post('/api/rag/query', {
        query: request.query,
        destiny_type: request.destiny_type,
        category: request.category,
        chat_history: request.chat_history,
        top_k: request.top_k || 10,
      });

      return response.data;
    } catch (error) {
      console.error('RAG query failed, using fallback');
      return this.fallbackQuery(request);
    }
  }

  /**
   * 简单的 GET 请求 RAG 问答
   */
  async chat(
    question: string,
    destinyType: string = 'ziwei',
    category?: string,
    topK: number = 10
  ): Promise<RAGResponse> {
    if (this.fallbackMode) {
      return this.fallbackQuery({
        query: question,
        destiny_type: destinyType,
        category,
        top_k: topK,
      });
    }

    try {
      const response = await this.client.get('/api/rag/chat', {
        params: {
          q: question,
          destiny_type: destinyType,
          category,
          top_k: topK,
        },
      });

      return response.data;
    } catch (error) {
      console.error('RAG chat failed, using fallback');
      return this.fallbackQuery({
        query: question,
        destiny_type: destinyType,
        category,
        top_k: topK,
      });
    }
  }

  /**
   * 上传文档到知识库
   */
  async uploadDocument(
    filePath: string,
    destinyType: string,
    category: string,
    title?: string
  ): Promise<{ chunks: number; documentId: string }> {
    if (this.fallbackMode) {
      throw new Error('RAG service unavailable');
    }

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('destiny_type', destinyType);
      form.append('category', category);
      if (title) form.append('title', title);

      const response = await this.client.post('/api/knowledge/upload', form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      return {
        chunks: response.data.chunks_created,
        documentId: response.data.document_id,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * 直接添加文本到知识库
   */
  async addTextKnowledge(
    title: string,
    content: string,
    destinyType: string,
    category: string,
    keywords?: string[]
  ): Promise<{ chunks: number }> {
    if (this.fallbackMode) {
      throw new Error('RAG service unavailable');
    }

    try {
      const response = await this.client.post('/api/knowledge/text', {
        title,
        content,
        destiny_type: destinyType,
        category,
        keywords,
      });

      return { chunks: response.data.chunks_created };
    } catch (error) {
      console.error('Add text failed:', error);
      throw error;
    }
  }

  /**
   * 获取知识库统计
   */
  async getStats(): Promise<KnowledgeStats> {
    if (this.fallbackMode) {
      return {
        total_documents: 0,
        total_chunks: 0,
        by_destiny_type: {},
      };
    }

    try {
      const response = await this.client.get('/api/knowledge/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats failed:', error);
      return {
        total_documents: 0,
        total_chunks: 0,
        by_destiny_type: {},
      };
    }
  }

  /**
   * 列出已索引的文档
   */
  async listDocuments(destinyType?: string): Promise<DocumentRecord[]> {
    if (this.fallbackMode) {
      return [];
    }

    try {
      const response = await this.client.get('/api/knowledge/documents', {
        params: { destiny_type: destinyType },
      });
      return response.data.documents || [];
    } catch (error) {
      console.error('List documents failed:', error);
      return [];
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    if (this.fallbackMode) {
      return false;
    }

    try {
      await this.client.delete(`/api/knowledge/${documentId}`);
      return true;
    } catch (error) {
      console.error('Delete document failed:', error);
      return false;
    }
  }

  /**
   * 重建知识索引
   */
  async reindexKnowledge(destinyType: string): Promise<number> {
    if (this.fallbackMode) {
      return 0;
    }

    try {
      const response = await this.client.post(
        `/api/knowledge/reindex/${destinyType}`
      );
      return response.data.indexed || 0;
    } catch (error) {
      console.error('Reindex failed:', error);
      return 0;
    }
  }

  /**
   * 列出所有集合
   */
  async listCollections(): Promise<Array<{ name: string; count: number }>> {
    if (this.fallbackMode) {
      return [];
    }

    try {
      const response = await this.client.get('/api/collections');
      return response.data.collections || [];
    } catch (error) {
      console.error('List collections failed:', error);
      return [];
    }
  }

  /**
   * 降级搜索 - 使用原有知识库
   */
  private async fallbackSearch(params: SearchRequest): Promise<SearchResult[]> {
    // 这里可以调用原有的 KnowledgeService
    // 暂时返回空结果
    console.warn('Using fallback search - RAG service unavailable');
    return [];
  }

  /**
   * 降级问答 - 使用原有知识库和 LLM
   */
  private async fallbackQuery(request: RAGRequest): Promise<RAGResponse> {
    console.warn('Using fallback query - RAG service unavailable');
    return {
      response: '抱歉，RAG 服务暂时不可用。请稍后再试。',
      sources: [],
      strategy: 'fallback',
      entities: [],
      query_time_ms: 0,
    };
  }
}

// ============= 单例导出 =============

export const ragService = new RAGService();

// ============= 便捷函数 =============

/**
 * 快速检索知识
 */
export async function quickSearch(
  query: string,
  destinyType: string = 'ziwei',
  topK: number = 5
): Promise<SearchResult[]> {
  return ragService.search({
    query,
    destiny_types: [destinyType],
    top_k: topK,
  });
}

/**
 * 快速问答
 */
export async function quickQuery(
  question: string,
  destinyType: string = 'ziwei'
): Promise<RAGResponse> {
  return ragService.chat(question, destinyType);
}

/**
 * 上传并索引文档
 */
export async function indexDocument(
  filePath: string,
  destinyType: string,
  category: string
): Promise<{ chunks: number }> {
  const title = filePath.split('/').pop()?.split('.')[0];
  return ragService.uploadDocument(filePath, destinyType, category, title);
}

// ============= 原有知识库兼容 =============

/**
 * 兼容原有接口 - 获取知识库条目
 */
export function getLegacyKnowledge(category: string): string {
  const legacyKnowledge: Record<string, string> = {
    career: `【事业运势分析要点】
1. 官禄宫主星分析
2. 命宫主星与事业宫的配合
3. 四化对事业的影响（化禄增运，化忌受阻）
4. 大运流年走势

【紫微星在官禄宫】
- 主贵显，适合公职、管理岗位
- 有领导才能，宜向上发展

【武曲星在官禄宫】
- 主财星入官禄，财官双美
- 适合金融、财务、商业`,
    wealth: `【财运分析要点】
1. 财帛宫主星分析
2. 禄存星位置
3. 四化对财运的影响
4. 大运流年财运走势

【武曲星在财帛宫】
- 理财能力强，财运较好
- 善于投资，适合财务相关工作

【太阴星在财帛宫】
- 财运平稳，适合稳健投资
- 有理财观念，但需注意守财`,
    relationship: `【感情婚姻分析要点】
1. 夫妻宫主星分析
2. 桃花星状态
3. 四化对感情的影响
4. 大运流年感情走势

【紫微星在夫妻宫】
- 对配偶要求较高
- 晚婚为宜

【贪狼星在夫妻宫】
- 桃花运势旺盛
- 感情丰富，需注意专一`,
    health: `【健康分析要点】
1. 疾厄宫主星分析
2. 五行生克关系
3. 四化对健康的影响
4. 注意防范的疾病类型

【廉贞星在疾厄宫】
- 注意心血管、血压问题
- 需注意情绪调节

【天机星在疾厄宫】
- 注意神经系统、失眠问题
- 需注意用脑过度`,
    family: `【家庭子女分析要点】
1. 兄弟宫、子女宫、田宅宫综合分析
2. 与家人的关系
3. 子女缘分
4. 家庭环境`,
    general: `【综合分析框架】
1. 命宫：先天运势、性格特征
2. 事业：官禄宫、迁移宫
3. 财运：财帛宫、禄存
4. 感情：夫妻宫、桃花星
5. 健康：疾厄宫、五行平衡
6. 家庭：兄弟宫、田宅宫
7. 大运流年走势`,
  };

  return legacyKnowledge[category] || legacyKnowledge['general'] || '';
}

export default ragService;
