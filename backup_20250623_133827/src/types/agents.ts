import { z } from 'zod';

// Base agent response schema
export const baseAgentResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime(),
  duration: z.number(), // milliseconds
  agentName: z.string(),
  operation: z.string(),
});

// Agent error response schema
export const agentErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
  timestamp: z.string().datetime(),
});

// Visualization schema for agent outputs
export const visualizationSchema = z.object({
  type: z.enum(['chart', 'table', 'metric', 'alert', 'text']),
  title: z.string(),
  description: z.string().optional(),
  data: z.any(),
  config: z.record(z.any()).optional(),
});

// Agent context schema
export const agentContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  metadata: z.record(z.any()).optional(),
});

// Manufacturing context schema
export const manufacturingContextSchema = z.object({
  workUnitId: z.string().optional(),
  workCenterId: z.string().optional(),
  areaId: z.string().optional(),
  siteId: z.string().optional(),
  enterpriseId: z.string().optional(),
  productType: z.string().optional(),
  shift: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
});

// Agent capabilities schema
export const agentCapabilitiesSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  capabilities: z.array(z.string()),
  inputSchema: z.any(), // JSON Schema
  outputSchema: z.any(), // JSON Schema
  requiredPermissions: z.array(z.string()),
  rateLimit: z.object({
    requests: z.number(),
    window: z.number(), // seconds
  }).optional(),
});

// Agent health status schema
export const agentHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  lastCheck: z.string().datetime(),
  uptime: z.number(), // seconds
  metrics: z.object({
    requestsTotal: z.number(),
    requestsSuccess: z.number(),
    requestsFailed: z.number(),
    avgResponseTime: z.number(), // milliseconds
    p95ResponseTime: z.number(), // milliseconds
    p99ResponseTime: z.number(), // milliseconds
  }).optional(),
  dependencies: z.array(z.object({
    name: z.string(),
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    message: z.string().optional(),
  })).optional(),
});

// Type exports
export type BaseAgentResponse = z.infer<typeof baseAgentResponseSchema>;
export type AgentErrorResponse = z.infer<typeof agentErrorResponseSchema>;
export type Visualization = z.infer<typeof visualizationSchema>;
export type AgentContext = z.infer<typeof agentContextSchema>;
export type ManufacturingContext = z.infer<typeof manufacturingContextSchema>;
export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>;
export type AgentHealth = z.infer<typeof agentHealthSchema>;

// Agent interface
export interface IAgent {
  name: string;
  version: string;
  capabilities: AgentCapabilities;
  
  execute(input: any, context: AgentContext): Promise<any>;
  validate(input: any): Promise<boolean>;
  getHealth(): Promise<AgentHealth>;
}

// Agent registry interface
export interface IAgentRegistry {
  register(agent: IAgent): void;
  unregister(agentName: string): void;
  get(agentName: string): IAgent | undefined;
  list(): AgentCapabilities[];
  executeAgent(agentName: string, input: any, context: AgentContext): Promise<any>;
}