import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
// import OpenAI from 'openai'; // TODO: Add openai package when needed
import { env } from '@/lib/env';
import { Prisma } from '@prisma/client';

// Configuration schema
const embeddingConfigSchema = z.object({
  model: z.enum(['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large']),
  dimensions: z.number().default(1536),
  batchSize: z.number().default(100),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
});

export type EmbeddingConfig = z.infer<typeof embeddingConfigSchema>;

// Default configuration
const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-ada-002',
  dimensions: 1536,
  batchSize: 100,
  similarityThreshold: 0.7,
};

/**
 * Production-ready embedding service with pgvector
 */
export class PgVectorEmbeddingService {
  private openai: OpenAI;
  private config: EmbeddingConfig;
  
  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    });
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.model,
        input: text,
        dimensions: this.config.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error({ error, text: text.substring(0, 100) }, 'Failed to generate embedding');
      throw new Error('Embedding generation failed');
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid API limits
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: batch,
          dimensions: this.config.dimensions,
        });

        embeddings.push(...response.data.map(d => d.embedding));
      } catch (error) {
        logger.error({ error, batchIndex: i }, 'Failed to generate batch embeddings');
        throw error;
      }
    }

    return embeddings;
  }

  /**
   * Store intent embedding in pgvector
   */
  async storeIntentEmbedding(
    intent: string,
    description: string,
    embedding: number[]
  ): Promise<void> {
    try {
      // Convert to pgvector format
      const vectorString = `[${embedding.join(',')}]`;
      
      await prisma.$executeRaw`
        INSERT INTO "IntentEmbedding" (id, intent, description, embedding, model, confidence, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          ${intent},
          ${description},
          ${vectorString}::vector,
          ${this.config.model},
          1.0,
          NOW(),
          NOW()
        )
        ON CONFLICT (intent) 
        DO UPDATE SET 
          description = EXCLUDED.description,
          embedding = EXCLUDED.embedding,
          model = EXCLUDED.model,
          "updatedAt" = NOW()
      `;
      
      logger.info({ intent }, 'Stored intent embedding');
    } catch (error) {
      logger.error({ error, intent }, 'Failed to store intent embedding');
      throw error;
    }
  }

  /**
   * Find similar intents using pgvector
   */
  async findSimilarIntents(
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<Array<{
    id: string;
    intent: string;
    description: string;
    similarity: number;
  }>> {
    try {
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      const results = await prisma.$queryRaw<Array<{
        id: string;
        intent: string;
        description: string;
        similarity: number;
      }>>`
        SELECT * FROM match_intents(
          ${vectorString}::vector,
          ${this.config.similarityThreshold}::float,
          ${limit}::int
        )
      `;

      return results;
    } catch (error) {
      logger.error({ error }, 'Failed to find similar intents');
      return [];
    }
  }

  /**
   * Store document embedding for ISO standards, procedures, etc.
   */
  async storeDocumentEmbedding(
    documentId: string,
    documentType: 'ISO_STANDARD' | 'PROCEDURE' | 'MANUAL',
    chunkIndex: number,
    content: string,
    embedding: number[],
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const vectorString = `[${embedding.join(',')}]`;
      
      await prisma.$executeRaw`
        INSERT INTO "DocumentEmbedding" 
        (id, "documentId", "documentType", "chunkIndex", content, embedding, metadata, "createdAt")
        VALUES (
          gen_random_uuid(),
          ${documentId},
          ${documentType},
          ${chunkIndex},
          ${content},
          ${vectorString}::vector,
          ${JSON.stringify(metadata)}::jsonb,
          NOW()
        )
      `;
      
      logger.info({ documentId, chunkIndex }, 'Stored document embedding');
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to store document embedding');
      throw error;
    }
  }

  /**
   * Find similar documents using pgvector
   */
  async findSimilarDocuments(
    queryEmbedding: number[],
    documentType: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    metadata: any;
    similarity: number;
  }>> {
    try {
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      const results = await prisma.$queryRaw<Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        content: string;
        metadata: any;
        similarity: number;
      }>>`
        SELECT * FROM match_documents(
          ${vectorString}::vector,
          ${documentType},
          ${this.config.similarityThreshold}::float,
          ${limit}::int
        )
      `;

      // Map snake_case to camelCase
      return results.map(r => ({
        id: r.id,
        documentId: r.document_id,
        chunkIndex: r.chunk_index,
        content: r.content,
        metadata: r.metadata,
        similarity: r.similarity,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to find similar documents');
      return [];
    }
  }

  /**
   * Initialize intent embeddings from predefined intents
   */
  async initializeIntentEmbeddings(intents: Array<{
    intent: string;
    description: string;
  }>): Promise<void> {
    logger.info({ count: intents.length }, 'Initializing intent embeddings');
    
    for (const { intent, description } of intents) {
      try {
        const embedding = await this.generateEmbedding(description);
        await this.storeIntentEmbedding(intent, description, embedding);
      } catch (error) {
        logger.error({ error, intent }, 'Failed to initialize intent embedding');
      }
    }
    
    logger.info('Intent embeddings initialized');
  }

  /**
   * Chunk and embed a document
   */
  async embedDocument(
    documentId: string,
    documentType: 'ISO_STANDARD' | 'PROCEDURE' | 'MANUAL',
    content: string,
    metadata: Record<string, any>,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
  ): Promise<void> {
    // Split content into chunks with overlap
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    logger.info({ documentId, chunks: chunks.length }, 'Embedding document');

    // Generate embeddings for all chunks
    const embeddings = await this.generateEmbeddings(chunks);

    // Store each chunk with its embedding
    for (let i = 0; i < chunks.length; i++) {
      await this.storeDocumentEmbedding(
        documentId,
        documentType,
        i,
        chunks[i],
        embeddings[i],
        { ...metadata, totalChunks: chunks.length }
      );
    }

    logger.info({ documentId }, 'Document embedded successfully');
  }

  /**
   * Perform hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    query: string,
    documentType: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    documentId: string;
    content: string;
    similarity: number;
    relevance: number;
  }>> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Get vector similarity results
    const vectorResults = await this.findSimilarDocuments(queryEmbedding, documentType, limit * 2);
    
    // Perform keyword search
    const keywordResults = await prisma.$queryRaw<Array<{
      id: string;
      document_id: string;
      content: string;
      rank: number;
    }>>`
      SELECT 
        id,
        "documentId" as document_id,
        content,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as rank
      FROM "DocumentEmbedding"
      WHERE "documentType" = ${documentType}
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    // Combine and rerank results
    const combined = new Map<string, {
      id: string;
      documentId: string;
      content: string;
      similarity: number;
      keywordScore: number;
    }>();

    // Add vector results
    for (const result of vectorResults) {
      combined.set(result.id, {
        id: result.id,
        documentId: result.documentId,
        content: result.content,
        similarity: result.similarity,
        keywordScore: 0,
      });
    }

    // Add keyword scores
    for (const result of keywordResults) {
      const existing = combined.get(result.id);
      if (existing) {
        existing.keywordScore = result.rank;
      } else {
        combined.set(result.id, {
          id: result.id,
          documentId: result.document_id,
          content: result.content,
          similarity: 0,
          keywordScore: result.rank,
        });
      }
    }

    // Calculate combined relevance score
    const results = Array.from(combined.values()).map(item => ({
      id: item.id,
      documentId: item.documentId,
      content: item.content,
      similarity: item.similarity,
      relevance: (item.similarity * 0.7) + (item.keywordScore * 0.3),
    }));

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }
}