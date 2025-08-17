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
  private readonly defaultChunkSize = 1000; // Character count
  private readonly overlapSize = 200; // Overlap character count

  constructor(private readonly qdrantService: QdrantService) {}

  /**
   * Process document: chunking, vectorization, storage
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
      
      // 1. Text chunking
      this.logger.log('Step 1: Text chunking...');
      const chunks = this.chunkText(content, metadata);
      this.logger.log(`Created ${chunks.length} chunks`);
      
      // 2. Vectorization
      this.logger.log('Step 2: Vectorization...');
      const vectorPoints = await this.vectorizeChunks(chunks);
      this.logger.log(`Vectorized ${vectorPoints.length} chunks`);
      
      // 3. Store to Qdrant
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
   * Text chunking processing
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
    
    // If content is empty or too short, create a single chunk directly
    if (!content || content.trim().length === 0) {
      chunks.push(this.createChunk('', 0, metadata));
      chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
      return chunks;
    }
    
    // If content length is less than default chunk size, create a single chunk directly
    if (content.length <= this.defaultChunkSize) {
      chunks.push(this.createChunk(content, 0, metadata));
      chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
      return chunks;
    }
    
    // Normal chunking logic
    const words = content.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (potentialChunk.length > this.defaultChunkSize && currentChunk) {
        // Create current chunk
        chunks.push(this.createChunk(currentChunk, chunkIndex, metadata));
        chunkIndex++;
        
        // Handle overlap
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
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, metadata));
    }
    
    // Ensure at least one chunk exists
    if (chunks.length === 0) {
      chunks.push(this.createChunk(content, 0, metadata));
    }
    
    // Update total chunk count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  /**
   * Create document chunk
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
      id: Date.now() + chunkIndex, // Use pure numeric ID, compliant with Qdrant requirements
      content: content.trim(),
      metadata: {
        ...metadata,
        chunkIndex,
        totalChunks: 0, // Will be updated in chunkText method
        timestamp: new Date(),
      },
    };
  }

  /**
   * Vectorize document chunks (simple implementation, should use OpenAI embedding in production)
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
   * Improved hash vectorization (for testing, should use OpenAI embedding in production)
   */
  private simpleHashVector(text: string): number[] {
    const vector = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    // Feature extraction: word frequency, character frequency, position information
    const wordFreq: { [key: string]: number } = {};
    const charFreq: { [key: string]: number } = {};
    
    // Calculate word frequency and character frequency
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
      for (const char of word) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
    });
    
    // Generate vector
    let vectorIndex = 0;
    
    // 1. Word frequency features (first 256 dimensions)
    for (const [word, freq] of Object.entries(wordFreq)) {
      if (vectorIndex < 256) {
        const hash = this.hashString(word);
        vector[vectorIndex] = (freq / words.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 2. Character frequency features (256-512 dimensions)
    for (const [char, freq] of Object.entries(charFreq)) {
      if (vectorIndex < 512) {
        const hash = this.hashString(char);
        vector[vectorIndex] = (freq / text.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 3. Position features (512-768 dimensions)
    for (let i = 0; i < 256 && vectorIndex < 768; i++) {
      if (i < words.length) {
        const word = words[i];
        const hash = this.hashString(word);
        vector[vectorIndex] = (i / words.length) * ((hash % 1000) / 1000);
        vectorIndex++;
      }
    }
    
    // 4. Semantic features (768-1024 dimensions)
    const semanticWords = ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'automation', 'monitoring', 'system', 'data', 'analysis', 'operations', 'automation', 'monitoring', 'system', 'data', 'analysis'];
    for (let i = 0; i < 256 && vectorIndex < 1024; i++) {
      const semanticWord = semanticWords[i % semanticWords.length];
      const hasWord = words.some(word => word.includes(semanticWord));
      vector[vectorIndex] = hasWord ? 0.8 : 0.2;
      vectorIndex++;
    }
    
    // 5. Length features (1024-1280 dimensions)
    for (let i = 0; i < 256 && vectorIndex < 1280; i++) {
      if (i < words.length) {
        const word = words[i];
        vector[vectorIndex] = Math.min(word.length / 20, 1.0); // Normalize word length
        vectorIndex++;
      }
    }
    
    // 6. Random features (1280-1536 dimensions)
    for (let i = 0; i < 256 && vectorIndex < 1536; i++) {
      const hash = this.hashString(text + i.toString());
      vector[vectorIndex] = (hash % 1000) / 1000;
      vectorIndex++;
    }
    
    // Ensure vector is completely filled
    while (vectorIndex < 1536) {
      const hash = this.hashString(text + vectorIndex.toString());
      vector[vectorIndex] = (hash % 1000) / 1000;
      vectorIndex++;
    }
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      vector.forEach((val, i) => {
        vector[i] = val / magnitude;
      });
    }
    
    return vector;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Search for similar documents
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
      
      // Validate input parameters
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
      
      // Build search filters
      const searchFilters = this.buildSearchFilters(filters);
      
      const results = await this.qdrantService.searchSimilar(
        'opsai-knowledge',
        queryVector,
        limit,
        scoreThreshold,
        searchFilters
      );
      
      this.logger.debug(`Search returned ${results.length} results`);
      
      // Apply post-search filters
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
   * Build search filters
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
   * Apply post-search filters
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
      // Apply metadata filters
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
   * Advanced semantic search
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

      // Generate query vector
      const queryVector = this.simpleHashVector(query);
      
      // Execute search
      const results = await this.qdrantService.searchSimilar(
        'opsai-knowledge',
        queryVector,
        limit * 2, // Get more results for sorting
        scoreThreshold,
        filters
      );

      // Apply post-processing filters
      let filteredResults = this.applyPostSearchFilters(results, filters);

      // Sort results according to sort options
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
      // Relevance sorting maintains Qdrant's similarity sorting

      // Limit result count
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
   * Batch process documents
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
   * Get knowledge base statistics
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
   * Get document statistics
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
   * Delete document
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
