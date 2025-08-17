import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface VectorPoint {
  id: number;
  vector: number[];
  payload: Record<string, any>;
}

export interface CollectionInfo {
  name: string;
  vector_size: number;
  distance: string;
  points_count: number;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async onModuleInit() {
    this.logger.log('Qdrant Service initialized');
    await this.ensureDefaultCollections();
  }

  /**
   * 确保默认集合存在
   */
  private async ensureDefaultCollections() {
    try {
      const collections = ['opsai-knowledge', 'opsai-events-embeddings'];
      
      for (const collectionName of collections) {
        await this.createCollectionIfNotExists(collectionName, 1536); // OpenAI embedding dimension
      }
      
      this.logger.log('Default collections ensured');
    } catch (error) {
      this.logger.error('Failed to ensure default collections:', error);
    }
  }

  /**
   * 创建集合（如果不存在）
   */
  async createCollectionIfNotExists(name: string, vectorSize: number): Promise<void> {
    try {
      const exists = await this.collectionExists(name);
      if (!exists) {
        await this.createCollection(name, vectorSize);
        this.logger.log(`Collection ${name} created successfully`);
      }
    } catch (error) {
      this.logger.error(`Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * 检查集合是否存在
   */
  async collectionExists(name: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/collections/${name}`);
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 创建新集合
   */
  async createCollection(name: string, vectorSize: number): Promise<void> {
    const payload = {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    };

    await this.client.put(`/collections/${name}`, payload);
  }

  /**
   * 删除集合
   */
  async deleteCollection(name: string): Promise<void> {
    await this.client.delete(`/collections/${name}`);
    this.logger.log(`Collection ${name} deleted successfully`);
  }

  /**
   * 获取集合信息
   */
  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const response = await this.client.get(`/collections/${name}`);
    return response.data.result;
  }

  /**
   * 列出所有集合
   */
  async listCollections(): Promise<string[]> {
    const response = await this.client.get('/collections');
    return response.data.result.collections.map((col: any) => col.name);
  }

  /**
   * 插入向量点
   */
  async upsertPoints(collectionName: string, points: VectorPoint[]): Promise<void> {
    const payload = {
      points: points.map(point => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      })),
    };

    await this.client.put(`/collections/${collectionName}/points`, payload);
    this.logger.debug(`Upserted ${points.length} points to collection ${collectionName}`);
  }

  /**
   * 搜索相似向量
   */
  async searchSimilar(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<Array<{ id: number; score: number; payload: Record<string, any> }>> {
    try {
      // 确保向量维度正确
      if (vector.length !== 1536) {
        throw new Error(`Vector dimension mismatch: expected 1536, got ${vector.length}`);
      }

      const payload = {
        vector,
        limit: Math.max(1, Math.min(100, limit)), // 限制范围1-100
        score_threshold: Math.max(0, Math.min(1, scoreThreshold)), // 限制范围0-1
        with_payload: true,
      };

      this.logger.debug(`Searching in collection ${collectionName} with payload:`, payload);

      const response = await this.client.post(`/collections/${collectionName}/points/search`, payload);
      
      if (!response.data.result) {
        this.logger.warn('No search results returned from Qdrant');
        return [];
      }

      return response.data.result.map((item: any) => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
      }));
    } catch (error) {
      this.logger.error(`Search failed in collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * 删除向量点
   */
  async deletePoints(collectionName: string, pointIds: string[]): Promise<void> {
    const payload = {
      points: pointIds,
    };

    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
    this.logger.debug(`Deleted ${pointIds.length} points from collection ${collectionName}`);
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats(name: string): Promise<any> {
    const response = await this.client.get(`/collections/${name}`);
    return response.data.result;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Qdrant health check failed:', error);
      return false;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isConnected: true,
      baseUrl: this.baseUrl,
      service: 'qdrant',
    };
  }
}
