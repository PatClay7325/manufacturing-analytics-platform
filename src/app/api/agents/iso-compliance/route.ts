import { NextRequest, NextResponse } from 'next/server';
import { ISOComplianceAgent } from '@/lib/agents/ISOComplianceAgent';
import { requireAuth, PERMISSIONS } from '@/lib/security/authMiddleware';
import { apiRateLimiter } from '@/lib/security/rateLimiter';
import { traceAgentOperation } from '@/lib/observability/tracing';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const complianceRequestSchema = z.object({
  intent: z.string(),
  context: z.record(z.any()).optional(),
  includeMetrics: z.boolean().default(true),
  includeRequirements: z.boolean().default(true),
});

/**
 * POST /api/agents/iso-compliance
 * Get ISO compliance information for an intent
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await apiRateLimiter(req, async () => {
      // Apply authentication
      const authResponse = await requireAuth([PERMISSIONS.AGENT_EXECUTE])(req, async () => {
        try {
          const body = await req.json();
          const validatedInput = complianceRequestSchema.parse(body);
          
          const user = (req as any).user;
          logger.info({ 
            userId: user.id,
            intent: validatedInput.intent 
          }, 'ISO compliance request');

          // Get compliance information with tracing
          const result = await traceAgentOperation(
            'ISOComplianceAgent',
            'getStandards',
            async () => {
              const agent = ISOComplianceAgent.getInstance();
              return agent.getStandards(validatedInput);
            },
            {
              'user.id': user.id,
              'intent': validatedInput.intent,
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
    logger.error({ error }, 'ISO compliance error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}