import got from 'got';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { z } from 'zod';

// Embedding response schema
const embeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string().optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

// Intent mapping schema
const intentMappingSchema = z.object({
  intent: z.string(),
  embedding: z.array(z.number()),
  description: z.string().optional(),
  confidence: z.number().default(1.0),
});

export type IntentMapping = z.infer<typeof intentMappingSchema>;

// Pre-defined manufacturing intents with descriptions
export const MANUFACTURING_INTENTS = {
  'analyze-oee': 'Calculate and analyze Overall Equipment Effectiveness metrics',
  'quality-analysis': 'Perform quality control analysis and defect tracking',
  'track-downtime': 'Monitor and analyze equipment downtime and failures',
  'predictive-maintenance': 'Predict maintenance needs based on equipment data',
  'production-optimization': 'Optimize production schedules and throughput',
  'energy-monitoring': 'Monitor and analyze energy consumption patterns',
  'inventory-management': 'Track and manage inventory levels and material flow',
  'shift-performance': 'Analyze shift-based performance metrics',
  'root-cause-analysis': 'Perform root cause analysis for production issues',
  'compliance-check': 'Verify compliance with ISO standards and regulations',
  'unknown-intent': 'Unable to classify the user intent',
} as const;

export type ManufacturingIntent = keyof typeof MANUFACTURING_INTENTS;

// In-memory intent cache (in production, use Redis or similar)
const intentCache = new Map<string, IntentMapping[]>();

/**
 * Create embedding vector for input text
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3;
  const timeout = 5000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({ text: text.substring(0, 50), attempt }, 'Creating embedding');
      
      const response = await got.post(env.EMBED_API_URL, {
        json: { 
          text,
          model: 'text-embedding-ada-002' // or your preferred model
        },
        timeout: { request: timeout },
        retry: { limit: 0 }, // We handle retries manually
      }).json();
      
      const validated = embeddingResponseSchema.parse(response);
      
      logger.info({ 
        embeddingSize: validated.embedding.length,
        usage: validated.usage 
      }, 'Embedding created successfully');
      
      return validated.embedding;
    } catch (error) {
      logger.error({ 
        error, 
        attempt, 
        maxRetries,
        text: text.substring(0, 50) 
      }, 'Failed to create embedding');
      
      if (attempt === maxRetries) {
        // Fallback: return zero vector on final failure
        logger.warn('Returning zero vector as fallback');
        return new Array(1536).fill(0); // Standard embedding size
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return new Array(1536).fill(0);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Find nearest intent based on embedding similarity
 */
export async function findNearestIntent(embedding: number[]): Promise<ManufacturingIntent | null> {
  try {
    // Load or initialize intent embeddings
    let intents = intentCache.get('manufacturing-intents');
    
    if (!intents || intents.length === 0) {
      // Initialize intent embeddings (in production, load from vector DB)
      intents = await initializeIntentEmbeddings();
      intentCache.set('manufacturing-intents', intents);
    }
    
    let bestMatch: { intent: ManufacturingIntent; similarity: number } | null = null;
    
    for (const intentMapping of intents) {
      const similarity = cosineSimilarity(embedding, intentMapping.embedding);
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          intent: intentMapping.intent as ManufacturingIntent,
          similarity,
        };
      }
    }
    
    // Threshold for accepting a match
    const SIMILARITY_THRESHOLD = 0.7;
    
    if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
      logger.info({ 
        intent: bestMatch.intent, 
        similarity: bestMatch.similarity 
      }, 'Intent matched');
      
      return bestMatch.intent;
    }
    
    logger.warn({ 
      bestSimilarity: bestMatch.similarity 
    }, 'No intent matched threshold');
    
    return null;
  } catch (error) {
    logger.error({ error }, 'Error finding nearest intent');
    return null;
  }
}

/**
 * Initialize intent embeddings (called on startup)
 */
async function initializeIntentEmbeddings(): Promise<IntentMapping[]> {
  const intents: IntentMapping[] = [];
  
  for (const [intent, description] of Object.entries(MANUFACTURING_INTENTS)) {
    if (intent === 'unknown-intent') continue;
    
    try {
      const embedding = await createEmbedding(description);
      intents.push({
        intent,
        embedding,
        description,
        confidence: 1.0,
      });
    } catch (error) {
      logger.error({ error, intent }, 'Failed to create intent embedding');
    }
  }
  
  logger.info({ count: intents.length }, 'Initialized intent embeddings');
  return intents;
}

/**
 * Classify user input to manufacturing intent
 */
export async function classifyIntent(input: string): Promise<ManufacturingIntent> {
  try {
    // Quick keyword-based classification for common patterns
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('oee') || lowerInput.includes('overall equipment effectiveness')) {
      return 'analyze-oee';
    }
    
    if (lowerInput.includes('quality') || lowerInput.includes('defect') || lowerInput.includes('reject')) {
      return 'quality-analysis';
    }
    
    if (lowerInput.includes('downtime') || lowerInput.includes('breakdown') || lowerInput.includes('failure')) {
      return 'track-downtime';
    }
    
    if (lowerInput.includes('maintenance') || lowerInput.includes('predict')) {
      return 'predictive-maintenance';
    }
    
    if (lowerInput.includes('energy') || lowerInput.includes('power') || lowerInput.includes('consumption')) {
      return 'energy-monitoring';
    }
    
    // Fallback to embedding-based classification
    const embedding = await createEmbedding(input);
    const intent = await findNearestIntent(embedding);
    
    return intent ?? 'unknown-intent';
  } catch (error) {
    logger.error({ error, input: input.substring(0, 50) }, 'Intent classification failed');
    return 'unknown-intent';
  }
}

/**
 * Store successful intent classifications for continuous learning
 */
export async function recordIntentClassification(
  input: string,
  intent: ManufacturingIntent,
  confidence: number,
  feedback?: 'correct' | 'incorrect'
): Promise<void> {
  try {
    // In production, store this in a database for analysis
    logger.info({ 
      input: input.substring(0, 50), 
      intent, 
      confidence,
      feedback 
    }, 'Recording intent classification');
    
    // TODO: Implement vector DB storage
  } catch (error) {
    logger.error({ error }, 'Failed to record intent classification');
  }
}