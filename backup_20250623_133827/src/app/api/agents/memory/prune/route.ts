import { NextRequest, NextResponse } from 'next/server';
import { MemoryPrunerAgent } from '@/lib/agents/MemoryPrunerAgent';
import { requireAuth, PERMISSIONS } from '@/lib/security/authMiddleware';
import { authRateLimiter } from '@/lib/security/rateLimiter';
import { traceAgentOperation } from '@/lib/observability/tracing';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request body schema
const pruneRequestSchema = z.object({
  retentionDays: z.number().min(1).optional(),
  batchSize: z.number().min(1).max(10000).optional(),
  pruneSessionMemory: z.boolean().optional(),
  pruneAuditTrail: z.boolean().optional(),
  pruneAlerts: z.boolean().optional(),
  pruneMetrics: z.boolean().optional(),
});

/**
 * POST /api/agents/memory/prune
 * Manually trigger memory pruning
 */
export async function POST(req: NextRequest) {
  try {
    // Apply stricter rate limiting for admin operations
    const rateLimitResponse = await authRateLimiter(req, async () => {
      // Require admin permissions
      const authResponse = await requireAuth([PERMISSIONS.SYSTEM_ADMIN])(req, async () => {
        try {
          const body = await req.json();
          const validatedInput = pruneRequestSchema.parse(body);
          
          const user = (req as any).user;
          logger.info({ 
            userId: user.id,
            config: validatedInput 
          }, 'Manual memory prune request');

          // Perform pruning with tracing
          const result = await traceAgentOperation(
            'MemoryPrunerAgent',
            'prune',
            async () => {
              const agent = MemoryPrunerAgent.getInstance();
              return agent.prune(validatedInput);
            },
            {
              'user.id': user.id,
              'retention.days': validatedInput.retentionDays,
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
    logger.error({ error }, 'Memory prune error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/memory/prune
 * Get memory pruning statistics
 */
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await apiRateLimiter(req, async () => {
      // Require audit permissions
      const authResponse = await requireAuth([PERMISSIONS.SYSTEM_AUDIT])(req, async () => {
        const user = (req as any).user;
        logger.info({ userId: user.id }, 'Memory statistics request');

        // Get statistics with tracing
        const result = await traceAgentOperation(
          'MemoryPrunerAgent',
          'getStatistics',
          async () => {
            const agent = MemoryPrunerAgent.getInstance();
            return agent.getStatistics();
          },
          {
            'user.id': user.id,
          }
        );

        return NextResponse.json(result);
      });
      
      return authResponse;
    });
    
    return rateLimitResponse;
  } catch (error) {
    logger.error({ error }, 'Memory statistics error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}