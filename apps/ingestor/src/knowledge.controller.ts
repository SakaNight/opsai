import { Controller, Post, Get, Body, Query, Param, Delete } from '@nestjs/common';
import { DocumentProcessorService, ProcessedDocument } from './services/document-processor.service';
import { QdrantService } from './services/qdrant.service';

export interface DocumentInput {
  content: string;
  title?: string;
  source: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  scoreThreshold?: number;
  source?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  metadata?: string;
}

@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly documentProcessor: DocumentProcessorService,
    private readonly qdrantService: QdrantService,
  ) {}

  /**
   * 处理单个文档
   */
  @Post('documents')
  async processDocument(@Body() documentInput: DocumentInput): Promise<ProcessedDocument> {
    return this.documentProcessor.processDocument(documentInput.content, {
      source: documentInput.source,
      title: documentInput.title,
      tags: documentInput.tags,
      ...documentInput.metadata,
    });
  }

  /**
   * 批量处理文档
   */
  @Post('documents/batch')
  async processDocumentsBatch(@Body() documents: DocumentInput[]): Promise<ProcessedDocument[]> {
    const documentsWithMetadata = documents.map(doc => ({
      content: doc.content,
      metadata: {
        source: doc.source,
        title: doc.title,
        tags: doc.tags,
        ...doc.metadata,
      },
    }));
    
    return this.documentProcessor.processDocumentsBatch(documentsWithMetadata);
  }

  /**
   * 获取文档统计信息
   */
  @Get('documents/stats')
  async getDocumentStats() {
    try {
      const stats = await this.documentProcessor.getDocumentStats();
      return {
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Failed to get document stats',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 删除文档
   */
  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    try {
      await this.documentProcessor.deleteDocument(parseInt(id));
      return {
        message: `Document ${id} deleted successfully`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Failed to delete document',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 高级搜索
   */
  @Post('search/advanced')
  async advancedSearch(@Body() searchRequest: {
    query: string;
    limit?: number;
    scoreThreshold?: number;
    filters?: any;
    sortBy?: 'relevance' | 'date' | 'source';
    includeMetadata?: boolean;
  }) {
    try {
      const results = await this.documentProcessor.advancedSearch(
        searchRequest.query,
        {
          limit: searchRequest.limit,
          scoreThreshold: searchRequest.scoreThreshold,
          filters: searchRequest.filters,
          sortBy: searchRequest.sortBy,
          includeMetadata: searchRequest.includeMetadata,
        }
      );

      return {
        query: searchRequest.query,
        results: results.results,
        total: results.total,
        searchTime: results.searchTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Advanced search failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 搜索相似文档
   */
  @Get('search')
  async searchDocuments(@Query() searchQuery: SearchQuery) {
    const { 
      query, 
      limit = 10, 
      scoreThreshold = 0.7,
      source,
      tags,
      startDate,
      endDate,
      metadata
    } = searchQuery;
    
    // 构建过滤器
    const filters: any = {};
    
    if (source) {
      filters.source = source;
    }
    
    if (tags) {
      filters.tags = tags.split(',').map(tag => tag.trim());
    }
    
    if (startDate || endDate) {
      filters.dateRange = {};
      if (startDate) {
        filters.dateRange.start = new Date(startDate);
      }
      if (endDate) {
        filters.dateRange.end = new Date(endDate);
      }
    }
    
    if (metadata) {
      try {
        filters.metadata = JSON.parse(metadata);
      } catch (error) {
        // 如果JSON解析失败，忽略metadata参数
      }
    }
    
    const results = await this.documentProcessor.searchSimilarDocuments(
      query,
      limit,
      scoreThreshold,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return {
      query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      results,
      total: results.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取知识库统计信息
   */
  @Get('stats')
  async getKnowledgeBaseStats() {
    const stats = await this.documentProcessor.getKnowledgeBaseStats();
    
    return {
      stats,
      timestamp: new Date().toISOString(),
      service: 'opsai-knowledge',
    };
  }

  /**
   * 列出所有集合
   */
  @Get('collections')
  async listCollections() {
    const collections = await this.qdrantService.listCollections();
    
    return {
      collections,
      total: collections.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取集合信息
   */
  @Get('collections/:name')
  async getCollectionInfo(@Param('name') name: string) {
    try {
      const info = await this.qdrantService.getCollectionInfo(name);
      return {
        collection: name,
        info,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Collection not found',
        collection: name,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 删除集合
   */
  @Delete('collections/:name')
  async deleteCollection(@Param('name') name: string) {
    try {
      await this.qdrantService.deleteCollection(name);
      return {
        message: `Collection ${name} deleted successfully`,
        collection: name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: 'Failed to delete collection',
        collection: name,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  async getHealth() {
    const qdrantHealth = await this.qdrantService.healthCheck();
    
    return {
      status: qdrantHealth ? 'ok' : 'error',
      service: 'opsai-knowledge',
      qdrant: qdrantHealth ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };
  }
}
