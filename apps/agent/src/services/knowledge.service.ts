import axios from 'axios';
import { KnowledgeRetrieval } from '../schemas/agent.schema';

// 知识检索服务
export class KnowledgeService {
  private qdrantUrl: string;
  private qdrantApiKey: string;

  constructor() {
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.qdrantApiKey = process.env.QDRANT_API_KEY || '';
  }

  // 从向量数据库检索相关知识
  async searchKnowledge(
    query: string, 
    filters?: Record<string, any>, 
    limit: number = 20
  ): Promise<KnowledgeRetrieval> {
    try {
      console.log(`[Knowledge] Searching for: "${query}"`);
      
      // 构建搜索请求
      const searchRequest = {
        vector: await this.getQueryEmbedding(query),
        limit,
        with_payload: true,
        with_vectors: false,
        score_threshold: 0.5,
        filter: this.buildSearchFilter(filters),
      };

      // 调用Qdrant搜索API
      const response = await axios.post(
        `${this.qdrantUrl}/collections/opsai_knowledge/points/search`,
        searchRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );

      const results = response.data.result || [];
      
      // 转换结果格式
      const knowledgeResults = results.map((item: any) => ({
        id: item.id,
        title: item.payload?.title || 'Untitled',
        content: item.payload?.content || '',
        source: item.payload?.source || 'unknown',
        relevance: item.score || 0,
        metadata: {
          ...item.payload,
          score: item.score,
        },
      }));

      console.log(`[Knowledge] Found ${knowledgeResults.length} results`);
      
      return {
        query,
        results: knowledgeResults,
        totalResults: knowledgeResults.length,
        searchTime: Date.now(),
        metadata: {
          filters,
          limit,
          scoreThreshold: 0.5,
        },
      };
    } catch (error) {
      console.error('[Knowledge] Search failed:', error);
      throw new Error(`Knowledge search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 获取查询的向量表示
  private async getQueryEmbedding(query: string): Promise<number[]> {
    try {
      // 这里应该调用OpenAI的embedding API
      // 简化版本，返回随机向量用于演示
      console.log(`[Knowledge] Getting embedding for query: "${query}"`);
      
      // TODO: 实现真实的embedding调用
      // const response = await openai.embeddings.create({
      //   model: 'text-embedding-ada-002',
      //   input: query,
      // });
      // return response.data[0].embedding;
      
      // 临时返回随机向量
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    } catch (error) {
      console.error('[Knowledge] Embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 构建搜索过滤器
  private buildSearchFilter(filters?: Record<string, any>): any {
    if (!filters || Object.keys(filters).length === 0) {
      return undefined;
    }

    const filterConditions = [];

    if (filters.service) {
      filterConditions.push({
        key: 'service',
        match: { value: filters.service },
      });
    }

    if (filters.severity) {
      filterConditions.push({
        key: 'severity',
        match: { value: filters.severity },
      });
    }

    if (filters.source) {
      filterConditions.push({
        key: 'source',
        match: { value: filters.source },
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filterConditions.push({
        key: 'tags',
        match: { any: filters.tags },
      });
    }

    if (filterConditions.length === 0) {
      return undefined;
    }

    return {
      must: filterConditions,
    };
  }

  // 获取特定服务的知识
  async getServiceKnowledge(service: string, limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { service }, limit);
  }

  // 获取特定严重程度的知识
  async getSeverityKnowledge(severity: string, limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { severity }, limit);
  }

  // 获取相关标签的知识
  async getTaggedKnowledge(tags: string[], limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { tags }, limit);
  }

  // 获取知识统计信息
  async getKnowledgeStats(): Promise<Record<string, any>> {
    try {
      const response = await axios.get(
        `${this.qdrantUrl}/collections/opsai_knowledge`,
        {
          headers: {
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );

      const collection = response.data.result;
      
      return {
        totalPoints: collection.points_count,
        vectorsCount: collection.vectors_count,
        status: collection.status,
        config: collection.config,
      };
    } catch (error) {
      console.error('[Knowledge] Failed to get stats:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 验证知识库连接
  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.qdrantUrl}/collections`,
        {
          headers: {
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );
      
      const collections = response.data.result?.collections || [];
      const hasKnowledgeCollection = collections.some((col: any) => col.name === 'opsai_knowledge');
      
      console.log(`[Knowledge] Connection validated. Found ${collections.length} collections.`);
      return hasKnowledgeCollection;
    } catch (error) {
      console.error('[Knowledge] Connection validation failed:', error);
      return false;
    }
  }
}
