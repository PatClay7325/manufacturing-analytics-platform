import { PgVectorEmbeddingService } from '@/lib/embeddings/pgvectorService';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { circuitBreakers } from '@/lib/resilience/circuitBreaker';
import { getRedisClient } from '@/lib/redis/redisClient';
import { sanitizer } from '@/lib/security/validation';
import { ManufacturingIntent, MANUFACTURING_INTENTS } from '@/lib/embeddings/embeddingService';

// Input/Output schemas
export const intentClassifierInputSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  input: z.string().min(1).max(1000).transform(val => sanitizer.sanitizeText(val)),
  context: z.record(z.any()).optional(),
});

export const intentClassifierOutputSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  description: z.string().optional(),
  suggestedActions: z.array(z.string()).optional(),
  requiresAuth: z.boolean().default(false),
  isoStandards: z.array(z.string()).optional(),
  similarQueries: z.array(z.object({
    query: z.string(),
    intent: z.string(),
    similarity: z.number(),
  })).optional(),
});

export type IntentClassifierInput = z.infer<typeof intentClassifierInputSchema>;
export type IntentClassifierOutput = z.infer<typeof intentClassifierOutputSchema>;

/**
 * Production-ready Intent Classifier Agent with real embeddings
 */
export class IntentClassifierAgentV2 {
  private static instance: IntentClassifierAgentV2;
  private embeddingService: PgVectorEmbeddingService;
  private redis = getRedisClient();
  private initialized = false;

  private constructor() {
    this.embeddingService = new PgVectorEmbeddingService();
  }

  static getInstance(): IntentClassifierAgentV2 {
    if (!IntentClassifierAgentV2.instance) {
      IntentClassifierAgentV2.instance = new IntentClassifierAgentV2();
    }
    return IntentClassifierAgentV2.instance;
  }

  /**
   * Initialize the agent with pre-computed embeddings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing Intent Classifier Agent');

      // Initialize intent embeddings
      const intents = Object.entries(MANUFACTURING_INTENTS)
        .filter(([intent]) => intent !== 'unknown-intent')
        .map(([intent, description]) => ({ intent, description }));

      await this.embeddingService.initializeIntentEmbeddings(intents);

      this.initialized = true;
      logger.info('Intent Classifier Agent initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Intent Classifier Agent');
      throw error;
    }
  }

  /**
   * Classify user input with real embeddings and caching
   */
  async classify(input: IntentClassifierInput): Promise<IntentClassifierOutput> {
    const startTime = Date.now();
    
    try {
      // Validate and sanitize input
      const validatedInput = intentClassifierInputSchema.parse(input);
      
      logger.info({ 
        sessionId: validatedInput.sessionId,
        inputLength: validatedInput.input.length 
      }, 'Classifying intent');

      // Check cache first
      const cacheKey = `intent:${validatedInput.input.toLowerCase().trim()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        logger.debug({ sessionId: validatedInput.sessionId }, 'Intent classification cache hit');
        const cachedResult = JSON.parse(cached);
        
        // Update session memory even for cached results
        await this.updateSessionMemory(validatedInput.sessionId, cachedResult.intent);
        
        return cachedResult;
      }

      // Perform classification with circuit breaker
      const result = await circuitBreakers.openai.execute(async () => {
        // Generate embedding for input
        const embedding = await this.embeddingService.generateEmbedding(validatedInput.input);
        
        // Find similar intents
        const similarIntents = await this.embeddingService.findSimilarIntents(embedding, 3);
        
        // Determine best match
        const bestMatch = similarIntents[0];
        const intent = bestMatch && bestMatch.similarity >= 0.7 
          ? bestMatch.intent as ManufacturingIntent
          : 'unknown-intent';
        
        // Get intent details
        const intentDetails = this.getIntentDetails(intent);
        
        // Find similar historical queries for better UX
        const similarQueries = await this.findSimilarQueries(embedding, validatedInput.input);
        
        // Build response
        const response: IntentClassifierOutput = {
          intent,
          confidence: bestMatch ? bestMatch.similarity : 0,
          description: intentDetails.description,
          suggestedActions: intentDetails.suggestedActions,
          requiresAuth: intentDetails.requiresAuth,
          isoStandards: intentDetails.isoStandards,
          similarQueries: similarQueries.length > 0 ? similarQueries : undefined,
        };

        // Cache the result for 1 hour
        await this.redis.setex(cacheKey, 3600, JSON.stringify(response));
        
        return response;
      });

      // Audit the classification
      await this.auditClassification(validatedInput, result);
      
      // Update session memory
      await this.updateSessionMemory(validatedInput.sessionId, result.intent);
      
      // Store query for future similarity matching
      await this.storeUserQuery(validatedInput.input, result.intent);
      
      const duration = Date.now() - startTime;
      logger.info({ 
        sessionId: validatedInput.sessionId,
        intent: result.intent,
        confidence: result.confidence,
        duration 
      }, 'Intent classified successfully');

      return result;
    } catch (error) {
      logger.error({ error, input }, 'Intent classification failed');
      
      // Return unknown intent on error
      return {
        intent: 'unknown-intent',
        confidence: 0,
        description: MANUFACTURING_INTENTS['unknown-intent'],
        suggestedActions: ['Please rephrase your request', 'Try asking about specific metrics like OEE or quality'],
        requiresAuth: false,
      };
    }
  }

  /**
   * Find similar user queries from history
   */
  private async findSimilarQueries(
    embedding: number[],
    currentQuery: string
  ): Promise<Array<{ query: string; intent: string; similarity: number }>> {
    try {
      // This would query a separate table storing user queries with embeddings
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error({ error }, 'Failed to find similar queries');
      return [];
    }
  }

  /**
   * Store user query for future similarity matching
   */
  private async storeUserQuery(query: string, intent: string): Promise<void> {
    try {
      // In a real implementation, this would store queries with embeddings
      // for better similarity matching over time
      const key = `query_history:${intent}`;
      const queries = await this.redis.lrange(key, 0, 99);
      
      // Avoid duplicates
      if (!queries.includes(query)) {
        await this.redis.lpush(key, query);
        await this.redis.ltrim(key, 0, 99); // Keep last 100 queries per intent
      }
    } catch (error) {
      logger.error({ error }, 'Failed to store user query');
    }
  }

  /**
   * Get detailed information about an intent
   */
  private getIntentDetails(intent: ManufacturingIntent): {
    description: string;
    suggestedActions: string[];
    requiresAuth: boolean;
    isoStandards: string[];
  } {
    const details = {
      'analyze-oee': {
        description: MANUFACTURING_INTENTS['analyze-oee'],
        suggestedActions: [
          'View real-time OEE dashboard',
          'Analyze historical OEE trends',
          'Drill down by equipment or product',
          'Export OEE report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'quality-analysis': {
        description: MANUFACTURING_INTENTS['quality-analysis'],
        suggestedActions: [
          'View quality control charts',
          'Analyze defect Pareto',
          'Review SPC data',
          'Generate quality report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 22400-2'],
      },
      'track-downtime': {
        description: MANUFACTURING_INTENTS['track-downtime'],
        suggestedActions: [
          'View downtime analysis',
          'Review failure patterns',
          'Calculate MTBF/MTTR',
          'Generate reliability report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 14224', 'ISO 22400-2'],
      },
      'predictive-maintenance': {
        description: MANUFACTURING_INTENTS['predictive-maintenance'],
        suggestedActions: [
          'View equipment health scores',
          'Review maintenance predictions',
          'Schedule preventive maintenance',
          'Analyze failure risks',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 14224', 'ISO 55000'],
      },
      'production-optimization': {
        description: MANUFACTURING_INTENTS['production-optimization'],
        suggestedActions: [
          'Analyze production bottlenecks',
          'Optimize production schedule',
          'Review throughput metrics',
          'Simulate improvements',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'energy-monitoring': {
        description: MANUFACTURING_INTENTS['energy-monitoring'],
        suggestedActions: [
          'View energy consumption dashboard',
          'Analyze energy efficiency',
          'Track carbon footprint',
          'Generate sustainability report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 50001'],
      },
      'inventory-management': {
        description: MANUFACTURING_INTENTS['inventory-management'],
        suggestedActions: [
          'View inventory levels',
          'Analyze material flow',
          'Review stock alerts',
          'Optimize reorder points',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001'],
      },
      'shift-performance': {
        description: MANUFACTURING_INTENTS['shift-performance'],
        suggestedActions: [
          'Compare shift metrics',
          'Analyze operator performance',
          'Review shift handover notes',
          'Generate shift report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'root-cause-analysis': {
        description: MANUFACTURING_INTENTS['root-cause-analysis'],
        suggestedActions: [
          'Start 5-Why analysis',
          'Create fishbone diagram',
          'Review failure history',
          'Document findings',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 14224'],
      },
      'compliance-check': {
        description: MANUFACTURING_INTENTS['compliance-check'],
        suggestedActions: [
          'Run compliance audit',
          'Review audit findings',
          'Track corrective actions',
          'Generate compliance report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
      },
      'unknown-intent': {
        description: MANUFACTURING_INTENTS['unknown-intent'],
        suggestedActions: [
          'Try rephrasing your question',
          'Ask about OEE, quality, or downtime',
          'View available commands',
          'Contact support',
        ],
        requiresAuth: false,
        isoStandards: [],
      },
    };

    return details[intent] || details['unknown-intent'];
  }

  /**
   * Audit the classification for compliance and analytics
   */
  private async auditClassification(
    input: IntentClassifierInput,
    output: IntentClassifierOutput
  ): Promise<void> {
    try {
      await prisma.auditTrail.create({
        data: {
          sessionId: input.sessionId,
          userId: input.userId,
          intent: output.intent,
          request: input as any,
          response: output as any,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to audit classification');
    }
  }

  /**
   * Update session memory with the classified intent
   */
  private async updateSessionMemory(sessionId: string, intent: string): Promise<void> {
    try {
      const session = await prisma.sessionMemory.findUnique({
        where: { sessionId },
      });

      const context = session?.context as any || {};
      const intents = context.intents || [];
      intents.push({
        intent,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 20 intents (increased from 10)
      if (intents.length > 20) {
        intents.shift();
      }

      // Calculate intent frequency for personalization
      const intentFrequency = intents.reduce((acc: any, i: any) => {
        acc[i.intent] = (acc[i.intent] || 0) + 1;
        return acc;
      }, {});

      await prisma.sessionMemory.upsert({
        where: { sessionId },
        update: {
          context: {
            ...context,
            intents,
            lastIntent: intent,
            intentFrequency,
          },
        },
        create: {
          sessionId,
          context: {
            intents: [{ intent, timestamp: new Date().toISOString() }],
            lastIntent: intent,
            intentFrequency: { [intent]: 1 },
          },
        },
      });
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to update session memory');
    }
  }

  /**
   * Get intent suggestions based on partial input (autocomplete)
   */
  async getSuggestions(
    partialInput: string,
    sessionId: string,
    limit: number = 5
  ): Promise<Array<{
    suggestion: string;
    intent: string;
    relevance: number;
  }>> {
    try {
      // Get user's intent history for personalization
      const session = await prisma.sessionMemory.findUnique({
        where: { sessionId },
      });
      
      const intentFrequency = (session?.context as any)?.intentFrequency || {};
      
      // Get recent queries from cache
      const suggestions: Array<{
        suggestion: string;
        intent: string;
        relevance: number;
      }> = [];
      
      // Search through cached queries
      for (const [intent] of Object.entries(MANUFACTURING_INTENTS)) {
        if (intent === 'unknown-intent') continue;
        
        const queries = await this.redis.lrange(`query_history:${intent}`, 0, -1);
        
        for (const query of queries) {
          if (query.toLowerCase().includes(partialInput.toLowerCase())) {
            const userBoost = (intentFrequency[intent] || 0) * 0.1;
            const relevance = 0.5 + userBoost; // Base relevance + user preference
            
            suggestions.push({
              suggestion: query,
              intent,
              relevance,
            });
          }
        }
      }
      
      // Sort by relevance and return top suggestions
      return suggestions
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    } catch (error) {
      logger.error({ error }, 'Failed to get suggestions');
      return [];
    }
  }
}