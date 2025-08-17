import axios from 'axios';
import { KnowledgeRetrieval } from '../schemas/agent.schema';

// Knowledge retrieval service
export class KnowledgeService {
  private qdrantUrl: string;
  private qdrantApiKey: string;

  constructor() {
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.qdrantApiKey = process.env.QDRANT_API_KEY || '';
  }

  // Retrieve relevant knowledge from vector database
  async searchKnowledge(
    query: string, 
    filters?: Record<string, any>, 
    limit: number = 20
  ): Promise<KnowledgeRetrieval> {
    try {
      console.log(`[Knowledge] Searching for: "${query}"`);
      
      // Build search request
      const searchRequest = {
        vector: await this.getQueryEmbedding(query),
        limit,
        with_payload: true,
        with_vectors: false,
        score_threshold: 0.1, // Lower threshold for testing
        filter: this.buildSearchFilter(filters),
      };

      // Call Qdrant search API
      const response = await axios.post(
        `${this.qdrantUrl}/collections/opsai-knowledge/points/search`,
        searchRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );

      const results = response.data.result || [];
      
      // Transform result format
      const knowledgeResults = results.map((item: any) => ({
        id: item.id,
        title: item.payload?.title || 'Untitled',
        content: item.payload?.content || '',
        source: item.payload?.source || 'unknown',
        relevance: item.score || 0,
        metadata: {
          ...item.payload,
          score: item.score,
        },
      }));

      console.log(`[Knowledge] Found ${knowledgeResults.length} results`);
      
      return {
        query,
        results: knowledgeResults,
        totalResults: knowledgeResults.length,
        searchTime: Date.now(),
        metadata: {
          filters,
          limit,
          scoreThreshold: 0.1,
        },
      };
    } catch (error) {
      console.error('[Knowledge] Search failed:', error);
      throw new Error(`Knowledge search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get vector representation for query
  private async getQueryEmbedding(query: string): Promise<number[]> {
    try {
      // Here we should call OpenAI's embedding API
      // Simplified version, returns random vectors for demonstration
      console.log(`[Knowledge] Getting embedding for query: "${query}"`);
      
      // TODO: Implement real embedding call
      // const response = await openai.embeddings.create({
      //   model: 'text-embedding-ada-002',
      //   input: query,
      // });
      // return response.data[0].embedding;
      
      // Temporarily return random vectors
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    } catch (error) {
      console.error('[Knowledge] Embedding generation failed:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Build search filter
  private buildSearchFilter(filters?: Record<string, any>): any {
    if (!filters || Object.keys(filters).length === 0) {
      return undefined;
    }

    const filterConditions = [];

    if (filters.service) {
      filterConditions.push({
        key: 'service',
        match: { value: filters.service },
      });
    }

    if (filters.severity) {
      filterConditions.push({
        key: 'severity',
        match: { value: filters.severity },
      });
    }

    if (filters.source) {
      filterConditions.push({
        key: 'source',
        match: { value: filters.source },
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filterConditions.push({
        key: 'tags',
        match: { any: filters.tags },
      });
    }

    if (filterConditions.length === 0) {
      return undefined;
    }

    return {
      must: filterConditions,
    };
  }

  // Get knowledge for specific service
  async getServiceKnowledge(service: string, limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { service }, limit);
  }

  // Get knowledge for specific severity level
  async getSeverityKnowledge(severity: string, limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { severity }, limit);
  }

  // Get knowledge for specific tags
  async getTaggedKnowledge(tags: string[], limit: number = 10): Promise<KnowledgeRetrieval> {
    return this.searchKnowledge('', { tags }, limit);
  }

  // Get knowledge statistics
  async getKnowledgeStats(): Promise<Record<string, any>> {
    try {
      const response = await axios.get(
        `${this.qdrantUrl}/collections/opsai-knowledge`,
        {
          headers: {
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );

      const collection = response.data.result;
      
      return {
        totalPoints: collection.points_count,
        vectorsCount: collection.vectors_count,
        status: collection.status,
        config: collection.config,
      };
    } catch (error) {
      console.error('[Knowledge] Failed to get stats:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Validate knowledge base connection
  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.qdrantUrl}/collections`,
        {
          headers: {
            ...(this.qdrantApiKey && { 'api-key': this.qdrantApiKey }),
          },
        }
      );
      
      const collections = response.data.result?.collections || [];
      const hasKnowledgeCollection = collections.some((col: any) => col.name === 'opsai-knowledge');
      
      console.log(`[Knowledge] Connection validated. Found ${collections.length} collections.`);
      return hasKnowledgeCollection;
    } catch (error) {
      console.error('[Knowledge] Connection validation failed:', error);
      return false;
    }
  }
}
