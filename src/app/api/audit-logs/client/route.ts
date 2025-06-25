import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { z } from 'zod';

const clientAuditSchema = z.object({
  action: z.string(),
  resource: z.object({
    type: z.string(),
    id: z.string().optional(),
    name: z.string().optional()
  }),
  metadata: z.record(z.any()).optional(),
  context: z.object({
    userId: z.string().optional(),
    userEmail: z.string().optional(),
    userRole: z.string().optional()
  }).optional(),
  url: z.string().optional(),
  userAgent: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validated = clientAuditSchema.parse(body);
    
    // Get additional context from headers
    const requestContext = {
      method: 'CLIENT',
      path: validated.url || window?.location?.href,
      ip: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: validated.userAgent || request.headers.get('user-agent') || undefined,
      origin: request.headers.get('origin') || undefined,
      referer: request.headers.get('referer') || undefined
    };
    
    // Determine event details from action
    const [category, eventType] = validated.action.includes('.') 
      ? validated.action.split('.', 2)
      : ['client', validated.action];
    
    // Log the event
    await auditService.log({
      eventType: eventType as any,
      eventCategory: category as any,
      eventAction: validated.action,
      eventStatus: 'success',
      eventSeverity: 'info',
      resource: validated.resource,
      request: requestContext,
      metadata: {
        ...validated.metadata,
        source: 'client'
      }
    }, {
      userId: validated.context?.userId || request.headers.get('x-user-id') || undefined,
      userEmail: validated.context?.userEmail || request.headers.get('x-user-email') || undefined,
      userRole: validated.context?.userRole || request.headers.get('x-user-role') || undefined,
      requestId: request.headers.get('x-request-id') || undefined
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to log client audit event:', error);
    return NextResponse.json(
      { error: 'Failed to log audit event' },
      { status: 500 }
    );
  }
}