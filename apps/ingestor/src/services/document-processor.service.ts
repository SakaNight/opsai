import { Injectable, Logger } from '@nestjs/common';
import { QdrantService, VectorPoint } from './qdrant.service';

export interface DocumentChunk {
  id: number;
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
      this.logger.log(`Starting document processing for source: ${metadata.source}`);
      
      // 1. 文本分块
      this.logger.log('Step 1: Text chunking...');
      const chunks = this.chunkText(content, metadata);
      this.logger.log(`Created ${chunks.length} chunks`);
      
      // 2. 向量化
      this.logger.log('Step 2: Vectorization...');
      const vectorPoints = await this.vectorizeChunks(chunks);
      this.logger.log(`Vectorized ${vectorPoints.length} chunks`);
      
      // 3. 存储到 Qdrant
      this.logger.log('Step 3: Storing to Qdrant...');
      await this.qdrantService.upsertPoints('opsai-knowledge', vectorPoints);
      this.logger.log('Successfully stored to Qdrant');
      
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
      this.logger.error('Error stack:', error.stack);
      this.logger.error('Error details:', {
        contentLength: content?.length,
        metadata,
        errorName: error.name,
        errorMessage: error.message
      });
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
    
    // 如果内容为空或太短，直接创建一个块
    if (!content || content.trim().length === 0) {
      chunks.push(this.createChunk('', 0, metadata));
      chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
      return chunks;
    }
    
    // 如果内容长度小于默认块大小，直接创建一个块
    if (content.length <= this.defaultChunkSize) {
      chunks.push(this.createChunk(content, 0, metadata));
      chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
      return chunks;
    }
    
    // 正常分块逻辑
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
    
    // 确保至少有一个块
    if (chunks.length === 0) {
      chunks.push(this.createChunk(content, 0, metadata));
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
      id: Date.now() + chunkIndex, // 使用纯数字ID，符合Qdrant要求
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
  ): Promise<Array<{ id: number; score: number; content: string; metadata: any }>> {
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
