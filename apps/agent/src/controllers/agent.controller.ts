import { Request, Response } from 'express';
import { SimpleAgentService } from '../services/agent.service.simple';
import { KnowledgeService } from '../services/knowledge.service';
import { z } from 'zod';

// Request validation schema
const ExecuteWorkflowSchema = z.object({
  eventId: z.string(),
  eventData: z.record(z.any()),
});

const SearchKnowledgeSchema = z.object({
  query: z.string(),
  filters: z.record(z.any()).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Agent controller
export class AgentController {
  private agentService: SimpleAgentService;
  private knowledgeService: KnowledgeService;

  constructor() {
    this.agentService = new SimpleAgentService();
    this.knowledgeService = new KnowledgeService();
  }

  // Execute workflow
  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      // Validate request data
      const validatedData = ExecuteWorkflowSchema.parse(req.body);
      
      console.log(`[Controller] Executing workflow for event: ${validatedData.eventId}`);
      
      // Execute workflow
      const workflow = await this.agentService.executeWorkflow(
        validatedData.eventId,
        validatedData.eventData
      );
      
      res.status(200).json({
        success: true,
        data: workflow,
        message: 'Workflow executed successfully',
      });
    } catch (error) {
      console.error('[Controller] Workflow execution failed:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // Get workflow status
  async getWorkflowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: 'Workflow ID is required',
        });
        return;
      }
      
      console.log(`[Controller] Getting workflow status: ${workflowId}`);
      
      const workflow = await this.agentService.getWorkflowStatus(workflowId);
      
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: workflow,
        message: 'Workflow status retrieved successfully',
      });
    } catch (error) {
      console.error('[Controller] Failed to get workflow status:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Stop workflow
  async stopWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: 'Workflow ID is required',
        });
        return;
      }
      
      console.log(`[Controller] Stopping workflow: ${workflowId}`);
      
      const success = await this.agentService.stopWorkflow(workflowId);
      
      if (success) {
        res.status(200).json({
          success: true,
          message: 'Workflow stopped successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to stop workflow',
        });
      }
    } catch (error) {
      console.error('[Controller] Failed to stop workflow:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Search knowledge base
  async searchKnowledge(req: Request, res: Response): Promise<void> {
    try {
      // Validate request data
      const validatedData = SearchKnowledgeSchema.parse(req.body);
      
      console.log(`[Controller] Searching knowledge: "${validatedData.query}"`);
      
      // Search knowledge base
      const results = await this.knowledgeService.searchKnowledge(
        validatedData.query,
        validatedData.filters,
        validatedData.limit
      );
      
      res.status(200).json({
        success: true,
        data: results,
        message: 'Knowledge search completed successfully',
      });
    } catch (error) {
      console.error('[Controller] Knowledge search failed:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // Get knowledge base statistics
  async getKnowledgeStats(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Controller] Getting knowledge stats');
      
      const stats = await this.knowledgeService.getKnowledgeStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Knowledge stats retrieved successfully',
      });
    } catch (error) {
      console.error('[Controller] Failed to get knowledge stats:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Validate knowledge base connection
  async validateKnowledgeConnection(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Controller] Validating knowledge connection');
      
      const isValid = await this.knowledgeService.validateConnection();
      
      res.status(200).json({
        success: true,
        data: { connected: isValid },
        message: isValid ? 'Knowledge connection validated' : 'Knowledge connection failed',
      });
    } catch (error) {
      console.error('[Controller] Knowledge connection validation failed:', error);
      
      res.status(500).json({
        success: true,
        data: { connected: false },
        message: 'Knowledge connection validation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Health check
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check knowledge base connection
      const knowledgeConnected = await this.knowledgeService.validateConnection();
      
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          agent: 'healthy',
          knowledge: knowledgeConnected ? 'healthy' : 'unhealthy',
        },
        version: '1.0.0',
      };
      
      const statusCode = knowledgeConnected ? 200 : 503;
      
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      console.error('[Controller] Health check failed:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
