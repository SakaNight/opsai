import { z } from 'zod';

// Event analysis result
export const EventAnalysisSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.date(),
  analysisType: z.enum(['incident', 'warning', 'info']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  details: z.string(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
});

// Root cause analysis
export const RootCauseAnalysisSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.date(),
  hypotheses: z.array(z.object({
    id: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()),
    probability: z.number().min(0).max(1),
  })),
  primaryHypothesis: z.string().optional(),
  analysisMethod: z.enum(['pattern_matching', 'ml_analysis', 'expert_knowledge']),
  metadata: z.record(z.any()).optional(),
});

// Resolution suggestions
export const ResolutionSuggestionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.date(),
  suggestions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    steps: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    estimatedTime: z.number(), // minutes
    requiredSkills: z.array(z.string()),
    riskLevel: z.enum(['low', 'medium', 'high']),
    references: z.array(z.string()),
  })),
  recommendedAction: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Automated response
export const AutomatedResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.date(),
  responseType: z.enum(['notification', 'ticket_creation', 'auto_remediation', 'escalation']),
  content: z.string(),
  recipients: z.array(z.string()),
  channels: z.array(z.enum(['email', 'slack', 'pagerduty', 'webhook'])),
  status: z.enum(['pending', 'sent', 'failed', 'acknowledged']),
  metadata: z.record(z.any()).optional(),
});

// Agent workflow status
export const AgentWorkflowSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  timestamp: z.date(),
  status: z.enum(['pending', 'analyzing', 'completed', 'failed']),
  steps: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    startTime: z.date().optional(),
    endTime: z.date().optional(),
    duration: z.number().optional(),
    error: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  results: z.object({
    analysis: EventAnalysisSchema.optional(),
    rootCause: RootCauseAnalysisSchema.optional(),
    suggestions: ResolutionSuggestionSchema.optional(),
    response: AutomatedResponseSchema.optional(),
  }),
  metadata: z.record(z.any()).optional(),
});

// Knowledge retrieval result
export const KnowledgeRetrievalSchema = z.object({
  query: z.string(),
  results: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    source: z.string(),
    relevance: z.number().min(0).max(1),
    metadata: z.record(z.any()).optional(),
  })),
  totalResults: z.number(),
  searchTime: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Export types
export type EventAnalysis = z.infer<typeof EventAnalysisSchema>;
export type RootCauseAnalysis = z.infer<typeof RootCauseAnalysisSchema>;
export type ResolutionSuggestion = z.infer<typeof ResolutionSuggestionSchema>;
export type AutomatedResponse = z.infer<typeof AutomatedResponseSchema>;
export type AgentWorkflow = z.infer<typeof AgentWorkflowSchema>;
export type KnowledgeRetrieval = z.infer<typeof KnowledgeRetrievalSchema>;
