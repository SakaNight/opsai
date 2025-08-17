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
   * 改进的哈希向量化（用于测试，实际应使用 OpenAI embedding）
   */
  private simpleHashVector(text: string): number[] {
    const vector = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    // 特征提取：词频、字符频率、位置信息
    const wordFreq: { [key: string]: number } = {};
    const charFreq: { [key: string]: number } = {};
    
    // 计算词频和字符频率
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
      for (const char of word) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
    });
    
    // 生成向量
    let vectorIndex = 0;
    
    // 1. 词频特征 (前256维)
    for (const [word, freq] of Object.entries(wordFreq)) {
      if (vectorIndex < 256) {
        const hash = this.hashString(word);
        vector[vectorIndex] = (freq / words.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 2. 字符频率特征 (256-512维)
    for (const [char, freq] of Object.entries(charFreq)) {
      if (vectorIndex < 512) {
        const hash = this.hashString(char);
        vector[vectorIndex] = (freq / text.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 3. 位置特征 (512-768维)
    for (let i = 0; i < 256 && vectorIndex < 768; i++) {
      if (i < words.length) {
        const word = words[i];
        const hash = this.hashString(word);
        vector[vectorIndex] = (i / words.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 4. 语义特征 (768-1024维)
    const semanticWords = ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'automation', 'monitoring', 'system', 'data', 'analysis', '运维', '自动化', '监控', '系统', '数据', '分析'];
    for (let i = 0; i < 256 && vectorIndex < 1024; i++) {
      const semanticWord = semanticWords[i % semanticWords.length];
      const hasWord = words.some(word => word.includes(semanticWord));
      vector[vectorIndex] = hasWord ? 0.8 : 0.2;
      vectorIndex++;
    }
    
    // 5. 长度特征 (1024-1280维)
    for (let i = 0; i < 256 && vectorIndex < 1280; i++) {
      if (i < words.length) {
        const word = words[i];
        vector[vectorIndex] = Math.min(word.length / 20, 1.0); // 归一化单词长度
        vectorIndex++;
      }
    }
    
    // 6. 随机特征 (1280-1536维)
    for (let i = 0; i < 256 && vectorIndex < 1536; i++) {
      const hash = this.hashString(text + i.toString());
      vector[vectorIndex] = (hash % 1000) / 1000;
      vectorIndex++;
    }
    
    // 确保向量被完全填充
    while (vectorIndex < 1536) {
      const hash = this.hashString(text + vectorIndex.toString());
      vector[vectorIndex] = (hash % 1000) / 1000;
      vectorIndex++;
    }
    
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
    scoreThreshold: number = 0.7,
    filters?: {
      source?: string;
      tags?: string[];
      dateRange?: { start?: Date; end?: Date };
      metadata?: Record<string, any>;
    }
  ): Promise<Array<{ id: number; score: number; content: string; metadata: any }>> {
    try {
      this.logger.debug(`Searching for query: "${query}" with limit: ${limit}, threshold: ${scoreThreshold}, filters:`, filters);
      
      // 验证输入参数
      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }
      
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      
      if (scoreThreshold < 0 || scoreThreshold > 1) {
        throw new Error('Score threshold must be between 0 and 1');
      }

      const queryVector = this.simpleHashVector(query);
      this.logger.debug(`Generated query vector with dimension: ${queryVector.length}`);
      
      // 构建搜索过滤器
      const searchFilters = this.buildSearchFilters(filters);
      
      const results = await this.qdrantService.searchSimilar(
        'opsai-knowledge',
        queryVector,
        limit,
        scoreThreshold,
        searchFilters
      );
      
      this.logger.debug(`Search returned ${results.length} results`);
      
      // 应用后处理过滤器
      const filteredResults = this.applyPostSearchFilters(results, filters);
      
      return filteredResults.map(result => ({
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
   * 构建搜索过滤器
   */
  private buildSearchFilters(filters?: {
    source?: string;
    tags?: string[];
    dateRange?: { start?: Date; end?: Date };
    metadata?: Record<string, any>;
  }): any {
    const qdrantFilters: any[] = [];
    
    if (filters?.source) {
      qdrantFilters.push({
        key: 'source',
        match: { value: filters.source }
      });
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      qdrantFilters.push({
        key: 'tags',
        match: { any: filters.tags }
      });
    }
    
    if (filters?.dateRange?.start || filters?.dateRange?.end) {
      const dateFilter: any = { key: 'timestamp' };
      if (filters.dateRange.start) {
        dateFilter.range = { ...dateFilter.range, gte: filters.dateRange.start.toISOString() };
      }
      if (filters.dateRange.end) {
        dateFilter.range = { ...dateFilter.range, lte: filters.dateRange.end.toISOString() };
      }
      qdrantFilters.push(dateFilter);
    }
    
    return qdrantFilters.length > 0 ? { must: qdrantFilters } : undefined;
  }

  /**
   * 应用后搜索过滤器
   */
  private applyPostSearchFilters(
    results: Array<{ id: number; score: number; payload: Record<string, any> }>,
    filters?: {
      source?: string;
      tags?: string[];
      dateRange?: { start?: Date; end?: Date };
      metadata?: Record<string, any>;
    }
  ): Array<{ id: number; score: number; payload: Record<string, any> }> {
    if (!filters) return results;
    
    return results.filter(result => {
      // 应用元数据过滤器
      if (filters.metadata) {
        for (const [key, value] of Object.entries(filters.metadata)) {
          if (result.payload[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  /**
   * 高级语义搜索
   */
  async advancedSearch(
    query: string,
    options: {
      limit?: number;
      scoreThreshold?: number;
      filters?: any;
      sortBy?: 'relevance' | 'date' | 'source';
      includeMetadata?: boolean;
    } = {}
  ): Promise<{
    results: Array<{ id: number; score: number; content: string; metadata: any }>;
    total: number;
    searchTime: number;
    queryVector: number[];
  }> {
    const startTime = Date.now();
    
    try {
      const {
        limit = 10,
        scoreThreshold = 0.5,
        filters,
        sortBy = 'relevance',
        includeMetadata = true
      } = options;

      this.logger.debug(`Advanced search for query: "${query}" with options:`, options);

      // 生成查询向量
      const queryVector = this.simpleHashVector(query);
      
      // 执行搜索
      const results = await this.qdrantService.searchSimilar(
        'opsai-knowledge',
        queryVector,
        limit * 2, // 获取更多结果用于排序
        scoreThreshold,
        filters
      );

      // 应用后处理过滤器
      let filteredResults = this.applyPostSearchFilters(results, filters);

      // 根据排序选项排序结果
      if (sortBy === 'date') {
        filteredResults.sort((a, b) => {
          const dateA = new Date(a.payload.timestamp || 0);
          const dateB = new Date(b.payload.timestamp || 0);
          return dateB.getTime() - dateA.getTime();
        });
      } else if (sortBy === 'source') {
        filteredResults.sort((a, b) => {
          const sourceA = a.payload.source || '';
          const sourceB = b.payload.source || '';
          return sourceA.localeCompare(sourceB);
        });
      }
      // relevance 排序保持Qdrant的相似度排序

      // 限制结果数量
      const finalResults = filteredResults.slice(0, limit);

      const searchTime = Date.now() - startTime;

      this.logger.debug(`Advanced search completed in ${searchTime}ms, returned ${finalResults.length} results`);

      return {
        results: finalResults.map(result => ({
          id: result.id,
          score: result.score,
          content: result.payload.content,
          metadata: includeMetadata ? result.payload : undefined,
        })),
        total: finalResults.length,
        searchTime,
        queryVector,
      };
    } catch (error) {
      this.logger.error('Advanced search failed:', error);
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

  /**
   * 获取文档统计信息
   */
  async getDocumentStats(): Promise<any> {
    try {
      const collectionStats = await this.qdrantService.getCollectionStats('opsai-knowledge');
      
      return {
        totalDocuments: collectionStats.points_count || 0,
        collectionStatus: collectionStats.status || 'unknown',
        vectorDimensions: 1536,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get document stats:', error);
      throw error;
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: number): Promise<void> {
    try {
      await this.qdrantService.deletePoints('opsai-knowledge', [documentId.toString()]);
      this.logger.debug(`Document ${documentId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${documentId}:`, error);
      throw error;
    }
  }
}
