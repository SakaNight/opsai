import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async getConnectionStatus(): Promise<boolean> {
    try {
      const state = this.connection.readyState;
      return state === 1; // 1 = connected
    } catch (error) {
      this.logger.error('Failed to get connection status:', error);
      return false;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    try {
      // Use any type to bypass TypeScript compilation issues with MongoDB types
      const collection: any = this.connection.db.collection(collectionName);
      const stats: any = await collection.stats();
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        indexSize: stats.totalIndexSize,
      };
    } catch (error) {
      this.logger.error(`Failed to get collection stats for ${collectionName}:`, error);
      throw error;
    }
  }

  async ping(): Promise<number> {
    try {
      const start = Date.now();
      await this.connection.db.admin().ping();
      const end = Date.now();
      return end - start;
    } catch (error) {
      this.logger.error('Database ping failed:', error);
      throw error;
    }
  }
}
