import { classifyIntent, ManufacturingIntent, MANUFACTURING_INTENTS } from '@/lib/embeddings/embeddingService';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Input/Output schemas
export const intentClassifierInputSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  input: z.string().min(1).max(1000),
  context: z.record(z.any()).optional(),
});

export const intentClassifierOutputSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  description: z.string().optional(),
  suggestedActions: z.array(z.string()).optional(),
  requiresAuth: z.boolean().default(false),
  isoStandards: z.array(z.string()).optional(),
});

export type IntentClassifierInput = z.infer<typeof intentClassifierInputSchema>;
export type IntentClassifierOutput = z.infer<typeof intentClassifierOutputSchema>;

/**
 * Intent Classifier Agent
 * Classifies user input into manufacturing-specific intents using semantic embeddings
 */
export class IntentClassifierAgent {
  private static instance: IntentClassifierAgent;

  private constructor() {}

  static getInstance(): IntentClassifierAgent {
    if (!IntentClassifierAgent.instance) {
      IntentClassifierAgent.instance = new IntentClassifierAgent();
    }
    return IntentClassifierAgent.instance;
  }

  /**
   * Classify user input and return structured intent information
   */
  async classify(input: IntentClassifierInput): Promise<IntentClassifierOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = intentClassifierInputSchema.parse(input);
      
      logger.info({ 
        sessionId: validatedInput.sessionId,
        inputLength: validatedInput.input.length 
      }, 'Classifying intent');

      // Classify the intent
      const intent = await classifyIntent(validatedInput.input);
      
      // Calculate confidence based on classification method
      const confidence = this.calculateConfidence(intent, validatedInput.input);
      
      // Get intent details
      const intentDetails = this.getIntentDetails(intent);
      
      // Build response
      const response: IntentClassifierOutput = {
        intent,
        confidence,
        description: intentDetails.description,
        suggestedActions: intentDetails.suggestedActions,
        requiresAuth: intentDetails.requiresAuth,
        isoStandards: intentDetails.isoStandards,
      };

      // Audit the classification
      await this.auditClassification(validatedInput, response);
      
      // Update session memory
      await this.updateSessionMemory(validatedInput.sessionId, intent);
      
      const duration = Date.now() - startTime;
      logger.info({ 
        sessionId: validatedInput.sessionId,
        intent,
        confidence,
        duration 
      }, 'Intent classified successfully');

      return response;
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
   * Calculate confidence score based on classification method
   */
  private calculateConfidence(intent: ManufacturingIntent, input: string): number {
    // If it's unknown, confidence is 0
    if (intent === 'unknown-intent') {
      return 0;
    }

    // Check if it was keyword-based (high confidence)
    const lowerInput = input.toLowerCase();
    const keywordMatches = {
      'analyze-oee': ['oee', 'overall equipment effectiveness'],
      'quality-analysis': ['quality', 'defect', 'reject'],
      'track-downtime': ['downtime', 'breakdown', 'failure'],
      'predictive-maintenance': ['maintenance', 'predict'],
      'energy-monitoring': ['energy', 'power', 'consumption'],
    };

    const intentKeywords = keywordMatches[intent as keyof typeof keywordMatches];
    if (intentKeywords?.some(keyword => lowerInput.includes(keyword))) {
      return 0.95; // High confidence for keyword match
    }

    // Otherwise, it was embedding-based (moderate confidence)
    return 0.75;
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
          'View OEE dashboard',
          'Analyze availability metrics',
          'Check performance rates',
          'Review quality scores',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'quality-analysis': {
        description: MANUFACTURING_INTENTS['quality-analysis'],
        suggestedActions: [
          'View quality metrics',
          'Analyze defect trends',
          'Generate quality report',
          'Set up quality alerts',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 22400-2'],
      },
      'track-downtime': {
        description: MANUFACTURING_INTENTS['track-downtime'],
        suggestedActions: [
          'View downtime report',
          'Analyze failure patterns',
          'Calculate MTBF/MTTR',
          'Set up downtime alerts',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 14224', 'ISO 22400-2'],
      },
      'predictive-maintenance': {
        description: MANUFACTURING_INTENTS['predictive-maintenance'],
        suggestedActions: [
          'View maintenance schedule',
          'Analyze equipment health',
          'Review maintenance history',
          'Generate maintenance report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 14224', 'ISO 55000'],
      },
      'production-optimization': {
        description: MANUFACTURING_INTENTS['production-optimization'],
        suggestedActions: [
          'Analyze production flow',
          'Identify bottlenecks',
          'Optimize schedules',
          'Review throughput metrics',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'energy-monitoring': {
        description: MANUFACTURING_INTENTS['energy-monitoring'],
        suggestedActions: [
          'View energy dashboard',
          'Analyze consumption patterns',
          'Calculate energy efficiency',
          'Set up energy alerts',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 50001'],
      },
      'inventory-management': {
        description: MANUFACTURING_INTENTS['inventory-management'],
        suggestedActions: [
          'View inventory levels',
          'Analyze material flow',
          'Check stock alerts',
          'Generate inventory report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001'],
      },
      'shift-performance': {
        description: MANUFACTURING_INTENTS['shift-performance'],
        suggestedActions: [
          'View shift metrics',
          'Compare shift performance',
          'Analyze operator efficiency',
          'Generate shift report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 22400-2'],
      },
      'root-cause-analysis': {
        description: MANUFACTURING_INTENTS['root-cause-analysis'],
        suggestedActions: [
          'Start RCA process',
          'View historical data',
          'Analyze failure modes',
          'Generate RCA report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 14224'],
      },
      'compliance-check': {
        description: MANUFACTURING_INTENTS['compliance-check'],
        suggestedActions: [
          'View compliance status',
          'Check audit logs',
          'Review standards',
          'Generate compliance report',
        ],
        requiresAuth: true,
        isoStandards: ['ISO 9001', 'ISO 14001', 'ISO 45001'],
      },
      'unknown-intent': {
        description: MANUFACTURING_INTENTS['unknown-intent'],
        suggestedActions: [
          'Please rephrase your request',
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

      // Keep only last 10 intents
      if (intents.length > 10) {
        intents.shift();
      }

      await prisma.sessionMemory.upsert({
        where: { sessionId },
        update: {
          context: {
            ...context,
            intents,
            lastIntent: intent,
          },
        },
        create: {
          sessionId,
          context: {
            intents: [{ intent, timestamp: new Date().toISOString() }],
            lastIntent: intent,
          },
        },
      });
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to update session memory');
    }
  }
}