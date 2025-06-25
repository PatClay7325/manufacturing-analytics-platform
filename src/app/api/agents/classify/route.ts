import { NextRequest, NextResponse } from 'next/server';
import { IntentClassifierAgent } from '@/lib/agents/IntentClassifierAgent';
import { requireAuth, PERMISSIONS } from '@/lib/security/authMiddleware';
import { apiRateLimiter } from '@/lib/security/rateLimiter';
import { traceAgentOperation } from '@/lib/observability/tracing';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const classifyRequestSchema = z.object({
  sessionId: z.string(),
  input: z.string().min(1).max(1000),
  context: z.record(z.any()).optional(),
});

/**
 * POST /api/agents/classify
 * Classify user input into manufacturing intents
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await apiRateLimiter(req, async () => {
      // Apply authentication
      const authResponse = await requireAuth([PERMISSIONS.AGENT_EXECUTE])(req, async () => {
        try {
          const body = await req.json();
          const validatedInput = classifyRequestSchema.parse(body);
          
          const user = (req as any).user;
          logger.info({ 
            userId: user.id,
            sessionId: validatedInput.sessionId 
          }, 'Intent classification request');

          // Perform classification with tracing
          const result = await traceAgentOperation(
            'IntentClassifierAgent',
            'classify',
            async () => {
              const agent = IntentClassifierAgent.getInstance();
              return agent.classify({
                ...validatedInput,
                userId: user.id,
              });
            },
            {
              'user.id': user.id,
              'session.id': validatedInput.sessionId,
              'input.length': validatedInput.input.length,
            }
          );

          return NextResponse.json(result);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: 'Invalid request', details: error.errors },
              { status: 400 }
            );
          }
          throw error;
        }
      });
      
      return authResponse;
    });
    
    return rateLimitResponse;
  } catch (error) {
    logger.error({ error }, 'Intent classification error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}