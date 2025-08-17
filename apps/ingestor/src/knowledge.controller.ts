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
   * 搜索相似文档
   */
  @Get('search')
  async searchDocuments(@Query() searchQuery: SearchQuery) {
    const { query, limit = 10, scoreThreshold = 0.7 } = searchQuery;
    
    const results = await this.documentProcessor.searchSimilarDocuments(
      query,
      limit,
      scoreThreshold
    );

    return {
      query,
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
