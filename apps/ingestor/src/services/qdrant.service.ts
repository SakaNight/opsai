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
   * Ensure default collection exists
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
   * Create collection (if it doesn't exist)
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
   * Check if collection exists
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
   * Create new collection
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
   * Delete collection
   */
  async deleteCollection(name: string): Promise<void> {
    await this.client.delete(`/collections/${name}`);
    this.logger.log(`Collection ${name} deleted successfully`);
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(name: string): Promise<CollectionInfo> {
    const response = await this.client.get(`/collections/${name}`);
    return response.data.result;
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    const response = await this.client.get('/collections');
    return response.data.result.collections.map((col: any) => col.name);
  }

  /**
   * Insert vector points
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
   * Search similar vectors
   */
  async searchSimilar(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7,
    filters?: any
  ): Promise<Array<{ id: number; score: number; payload: Record<string, any> }>> {
    try {
      // Ensure vector dimensions are correct
      if (vector.length !== 1536) {
        throw new Error(`Vector dimension mismatch: expected 1536, got ${vector.length}`);
      }

      const payload: any = {
        vector,
        limit: Math.max(1, Math.min(100, limit)), // Limit range 1-100
        score_threshold: Math.max(0, Math.min(1, scoreThreshold)), // Limit range 0-1
        with_payload: true,
      };

      // Add filters
      if (filters) {
        payload.filter = filters;
      }

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
   * Delete vector points
   */
  async deletePoints(collectionName: string, pointIds: string[]): Promise<void> {
    const payload = {
      points: pointIds,
    };

    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
    this.logger.debug(`Deleted ${pointIds.length} points from collection ${collectionName}`);
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(name: string): Promise<any> {
    const response = await this.client.get(`/collections/${name}`);
    return response.data.result;
  }

  /**
   * Health check
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
   * Get service status
   */
  getStatus() {
    return {
      isConnected: true,
      baseUrl: this.baseUrl,
      service: 'qdrant',
    };
  }
}
