import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://:opsai123@localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      this.logger.log('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.connect();
      this.logger.log('Redis service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis service:', error);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      this.isConnected = false;
    } catch (error) {
      this.logger.error('Error disconnecting from Redis:', error);
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set expiry for key ${key}:`, error);
      throw error;
    }
  }

  async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    try {
      const current = await this.incr(key);
      if (current === 1) {
        await this.expire(key, window);
      }
      return current <= limit;
    } catch (error) {
      this.logger.error(`Rate limit check failed for key ${key}:`, error);
      return false; // Allow pass on failure
    }
  }

  async getStatus(): Promise<any> {
    try {
      const info = await this.client.info();
      const memory = await this.client.memoryUsage('default');
      
      return {
        isConnected: this.isConnected,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            acc[key] = value;
          }
          return acc;
        }, {}),
        memory,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis status:', error);
      return { isConnected: this.isConnected, error: error.message };
    }
  }
}
