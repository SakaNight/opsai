import { Injectable, Logger } from '@nestjs/common';
import { QdrantService, VectorPoint } from './qdrant.service';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    title?: string;
    chunkIndex: number;
    totalChunks: number;
    timestamp: Date;
    tags?: string[];
    [key: string]: any;
  };
}

export interface ProcessedDocument {
  originalContent: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  processingTime: number;
}

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private readonly defaultChunkSize = 1000; // 字符数
  private readonly overlapSize = 200; // 重叠字符数

  constructor(private readonly qdrantService: QdrantService) {}

  /**
   * 处理文档：分块、向量化、存储
   */
  async processDocument(
    content: string,
    metadata: {
      source: string;
      title?: string;
      tags?: string[];
      [key: string]: any;
    }
  ): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      // 1. 文本分块
      const chunks = this.chunkText(content, metadata);
      
      // 2. 向量化（这里使用简单的哈希向量，实际项目中应该使用 OpenAI 或其他 embedding 服务）
      const vectorPoints = await this.vectorizeChunks(chunks);
      
      // 3. 存储到 Qdrant
      await this.qdrantService.upsertPoints('opsai-knowledge', vectorPoints);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`Document processed: ${chunks.length} chunks in ${processingTime}ms`);
      
      return {
        originalContent: content,
        chunks,
        totalChunks: chunks.length,
        processingTime,
      };
    } catch (error) {
      this.logger.error('Failed to process document:', error);
      throw error;
    }
  }

  /**
   * 文本分块处理
   */
  private chunkText(
    content: string,
    metadata: {
      source: string;
      title?: string;
      tags?: string[];
      [key: string]: any;
    }
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const words = content.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (potentialChunk.length > this.defaultChunkSize && currentChunk) {
        // 创建当前块
        chunks.push(this.createChunk(currentChunk, chunkIndex, metadata));
        chunkIndex++;
        
        // 处理重叠
        if (this.overlapSize > 0) {
          const overlapWords = currentChunk.split(/\s+/).slice(-Math.floor(this.overlapSize / 5));
          currentChunk = overlapWords.join(' ') + ' ' + word;
        } else {
          currentChunk = word;
        }
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // 添加最后一个块
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, metadata));
    }
    
    // 更新总块数
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  /**
   * 创建文档块
   */
  private createChunk(
    content: string,
    chunkIndex: number,
    metadata: {
      source: string;
      title?: string;
      tags?: string[];
      [key: string]: any;
    }
  ): DocumentChunk {
    return {
      id: `${metadata.source}-${Date.now()}-${chunkIndex}`,
      content: content.trim(),
      metadata: {
        ...metadata,
        chunkIndex,
        totalChunks: 0, // 将在 chunkText 方法中更新
        timestamp: new Date(),
      },
    };
  }

  /**
   * 向量化文档块（简单实现，实际应使用 OpenAI embedding）
   */
  private async vectorizeChunks(chunks: DocumentChunk[]): Promise<VectorPoint[]> {
    return chunks.map(chunk => ({
      id: chunk.id,
      vector: this.simpleHashVector(chunk.content),
      payload: {
        content: chunk.content,
        ...chunk.metadata,
      },
    }));
  }

  /**
   * 简单的哈希向量化（用于测试，实际应使用 OpenAI embedding）
   */
  private simpleHashVector(text: string): number[] {
    const vector = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, index) => {
      const hash = this.hashString(word);
      const position = hash % 1536;
      vector[position] = (vector[position] + 1) / (index + 1);
    });
    
    // 归一化向量
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      vector.forEach((val, i) => {
        vector[i] = val / magnitude;
      });
    }
    
    return vector;
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash);
  }

  /**
   * 搜索相似文档
   */
  async searchSimilarDocuments(
    query: string,
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<Array<{ id: string; score: number; content: string; metadata: any }>> {
    try {
      const queryVector = this.simpleHashVector(query);
      const results = await this.qdrantService.searchSimilar(
        'opsai-knowledge',
        queryVector,
        limit,
        scoreThreshold
      );
      
      return results.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload.content,
        metadata: result.payload,
      }));
    } catch (error) {
      this.logger.error('Failed to search similar documents:', error);
      throw error;
    }
  }

  /**
   * 批量处理文档
   */
  async processDocumentsBatch(
    documents: Array<{ content: string; metadata: any }>
  ): Promise<ProcessedDocument[]> {
    const results: ProcessedDocument[] = [];
    
    for (const doc of documents) {
      try {
        const result = await this.processDocument(doc.content, doc.metadata);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to process document: ${doc.metadata.title || doc.metadata.source}`, error);
      }
    }
    
    return results;
  }

  /**
   * 获取知识库统计信息
   */
  async getKnowledgeBaseStats(): Promise<any> {
    try {
      const collections = await this.qdrantService.listCollections();
      const stats = {};
      
      for (const collection of collections) {
        if (collection.includes('opsai-knowledge')) {
          stats[collection] = await this.qdrantService.getCollectionStats(collection);
        }
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to get knowledge base stats:', error);
      throw error;
    }
  }
}
