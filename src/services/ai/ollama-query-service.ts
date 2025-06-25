import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Ollama AI Query Service for Manufacturing Analytics
// Uses local Ollama instance instead of external APIs

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

export interface QueryContext {
  userId: string;
  role: string;
  allowedPlants: string[];
  allowedAreas: string[];
  maxRows: number;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  explanation?: string;
  generatedQuery?: string;
  executionTime?: number;
  rowCount?: number;
}

const QueryRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.object({
    userId: z.string(),
    role: z.enum(['ADMIN', 'MANAGER', 'ENGINEER', 'OPERATOR', 'VIEWER']),
    allowedPlants: z.array(z.string()),
    allowedAreas: z.array(z.string()).optional(),
    maxRows: z.number().min(1).max(10000).default(1000)
  })
});

export class OllamaQueryService {
  private prisma: PrismaClient;
  private config: OllamaConfig;
  private schemaContext: string;

  constructor(prisma: PrismaClient, config?: Partial<OllamaConfig>) {
    this.prisma = prisma;
    this.config = {
      baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'manufacturing-expert',
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      ...config
    };
    
    this.schemaContext = this.generateSchemaContext();
  }

  /**
   * Process natural language query and return results
   */
  async processQuery(
    naturalLanguageQuery: string,
    context: QueryContext
  ): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedRequest = QueryRequestSchema.parse({
        query: naturalLanguageQuery,
        context
      });

      // Generate Prisma query using Ollama
      const queryGeneration = await this.generatePrismaQuery(
        validatedRequest.query,
        validatedRequest.context
      );

      if (!queryGeneration.success) {
        return {
          success: false,
          error: queryGeneration.error || 'Failed to generate query',
          executionTime: Date.now() - startTime
        };
      }

      // Validate and execute the generated query
      const executionResult = await this.executeQuery(
        queryGeneration.prismaQuery!,
        validatedRequest.context
      );

      return {
        ...executionResult,
        explanation: queryGeneration.explanation,
        generatedQuery: queryGeneration.rawQuery,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Query processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate Prisma query from natural language using Ollama
   */
  private async generatePrismaQuery(
    query: string,
    context: QueryContext
  ): Promise<{
    success: boolean;
    prismaQuery?: any;
    rawQuery?: string;
    explanation?: string;
    error?: string;
  }> {
    const prompt = this.buildPrompt(query, context);
    
    try {
      const response = await this.callOllama(prompt);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error
        };
      }

      // Parse the response to extract Prisma query
      const parsed = this.parseOllamaResponse(response.text!);
      
      return {
        success: true,
        prismaQuery: parsed.prismaQuery,
        rawQuery: parsed.rawQuery,
        explanation: parsed.explanation
      };

    } catch (error) {
      return {
        success: false,
        error: `Query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build the prompt for Ollama including schema context and security constraints
   */
  private buildPrompt(query: string, context: QueryContext): string {
    return `${this.schemaContext}

User Context:
- Role: ${context.role}
- Allowed Plants: ${context.allowedPlants.join(', ')}
- Max Rows: ${context.maxRows}

User Query: "${query}"

Please generate a Prisma query to answer this question. Follow these rules:
1. Only access tables the user is authorized for
2. Apply plant-level filtering using allowedPlants: ${JSON.stringify(context.allowedPlants)}
3. Limit results to maximum ${context.maxRows} rows
4. Use proper Prisma syntax with TypeScript types
5. Include explanation of what the query does
6. If the query involves calculations, show the formula

Respond in this exact JSON format:
{
  "prismaQuery": {
    "model": "modelName",
    "operation": "findMany|findFirst|aggregate",
    "args": { /* Prisma query arguments */ }
  },
  "explanation": "Clear explanation of what this query returns",
  "calculation": "Formula if applicable"
}`;
  }

  /**
   * Generate schema context for Ollama
   */
  private generateSchemaContext(): string {
    return `Manufacturing Analytics Database Schema:

EQUIPMENT (dim_equipment):
- id: string (UUID)
- code: string (unique equipment identifier)
- name: string
- enterprise, site, area, workCenter, workUnit: string (hierarchy)
- sapEquipmentNumber: string (SAP reference)
- manufacturer, model, serialNumber: string
- designCapacity: decimal, capacityUnit: string

OEE_METRICS (fact_oee_metrics):
- timestamp: DateTime
- equipmentId: string (references Equipment)
- availability: decimal (0-1)
- performance: decimal (0-1) 
- quality: decimal (0-1)
- oee: decimal (0-1, calculated as availability * performance * quality)

PRODUCTION_QUANTITIES (fact_production_quantities):
- timestamp: DateTime
- equipmentId: string
- productId: string
- plannedQuantity, producedQuantity, goodQuantity: decimal
- scrapQuantity, reworkQuantity: decimal

QUALITY_METRICS (fact_quality_metrics):
- timestamp: DateTime
- equipmentId: string
- defectType: string
- defectCount: integer
- severity: LOW|MEDIUM|HIGH|CRITICAL
- costImpact: decimal

MAINTENANCE_EVENTS (fact_maintenance_events):
- startTime, endTime: DateTime
- equipmentId: string
- eventType: PLANNED|UNPLANNED|PREVENTIVE|CORRECTIVE
- actualDuration: decimal (minutes)
- cost: decimal

Common Manufacturing KPIs:
- OEE = Availability × Performance × Quality
- Availability = (Planned Production Time - Downtime) / Planned Production Time
- Performance = (Ideal Cycle Time × Total Count) / Run Time
- Quality = Good Count / Total Count
- MTBF = Operating Time / Number of Failures
- MTTR = Total Repair Time / Number of Repairs`;
  }

  /**
   * Call Ollama API with retry logic
   */
  private async callOllama(prompt: string): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            prompt: prompt,
            stream: false,
            options: {
              temperature: 0.1, // Low temperature for consistent output
              top_p: 0.9,
              num_ctx: 4096
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.response) {
          return {
            success: true,
            text: data.response
          };
        } else {
          throw new Error('No response from Ollama');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Ollama attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: `All ${this.config.maxRetries} attempts failed. Last error: ${lastError?.message}`
    };
  }

  /**
   * Parse Ollama response to extract Prisma query
   */
  private parseOllamaResponse(text: string): {
    prismaQuery: any;
    rawQuery: string;
    explanation: string;
  } {
    try {
      // Look for JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.prismaQuery || !parsed.explanation) {
        throw new Error('Invalid response format');
      }

      return {
        prismaQuery: parsed.prismaQuery,
        rawQuery: jsonMatch[0],
        explanation: parsed.explanation
      };

    } catch (error) {
      // Fallback: try to extract query from code blocks
      const codeBlockMatch = text.match(/```(?:typescript|javascript)?\n([\s\S]*?)\n```/);
      
      if (codeBlockMatch) {
        return {
          prismaQuery: { raw: codeBlockMatch[1] },
          rawQuery: codeBlockMatch[1],
          explanation: 'Extracted from code block'
        };
      }

      throw new Error(`Failed to parse Ollama response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the generated Prisma query with security checks
   */
  private async executeQuery(
    querySpec: any,
    context: QueryContext
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
    rowCount?: number;
  }> {
    try {
      // Validate query structure
      if (!querySpec.model || !querySpec.operation) {
        throw new Error('Invalid query structure');
      }

      // Apply security constraints
      const secureQuery = this.applySecurityConstraints(querySpec, context);

      // Execute query
      const model = this.prisma[secureQuery.model as keyof PrismaClient] as any;
      
      if (!model || typeof model[secureQuery.operation] !== 'function') {
        throw new Error(`Invalid model or operation: ${secureQuery.model}.${secureQuery.operation}`);
      }

      const result = await model[secureQuery.operation](secureQuery.args);
      
      // Ensure result is an array
      const data = Array.isArray(result) ? result : [result];
      
      return {
        success: true,
        data,
        rowCount: data.length
      };

    } catch (error) {
      console.error('Query execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  /**
   * Apply security constraints to the query
   */
  private applySecurityConstraints(querySpec: any, context: QueryContext): any {
    const secureQuery = { ...querySpec };
    
    // Ensure args exist
    if (!secureQuery.args) {
      secureQuery.args = {};
    }
    
    // Ensure where clause exists
    if (!secureQuery.args.where) {
      secureQuery.args.where = {};
    }

    // Apply plant-level security for equipment-related queries
    if (querySpec.model === 'equipment' || querySpec.model === 'oEEMetric' || 
        querySpec.model === 'productionQuantity' || querySpec.model === 'qualityMetric') {
      
      if (querySpec.model === 'equipment') {
        secureQuery.args.where.site = { in: context.allowedPlants };
      } else {
        // For metrics tables, filter through equipment relationship
        secureQuery.args.where.equipment = {
          site: { in: context.allowedPlants }
        };
      }
    }

    // Apply row limits
    if (secureQuery.operation === 'findMany') {
      secureQuery.args.take = Math.min(
        secureQuery.args.take || context.maxRows,
        context.maxRows
      );
    }

    // Prevent unauthorized operations
    const allowedOperations = ['findMany', 'findFirst', 'aggregate', 'count'];
    if (!allowedOperations.includes(secureQuery.operation)) {
      throw new Error(`Operation '${secureQuery.operation}' is not allowed`);
    }

    return secureQuery;
  }

  /**
   * Health check for Ollama service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    model: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return {
          status: 'healthy',
          model: this.config.model,
          responseTime: Date.now() - startTime
        };
      } else {
        return {
          status: 'unhealthy',
          model: this.config.model
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        model: this.config.model
      };
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((model: any) => model.name) || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }
}