/**
 * Contact Points API
 * Manages notification channels for alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Contact point validation schema
const contactPointSchema = z.object({
  uid: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['email', 'slack', 'webhook', 'pagerduty', 'victorops', 'telegram', 'teams', 'sms']),
  settings: z.record(z.any()),
  disableResolveMessage: z.boolean().optional()
});

// Get all contact points
export async function GET() {
  try {
    const contactPoints = await prisma.contactPoint.findMany({
      orderBy: { name: 'asc' }
    });

    const analyticsPlatformContactPoints = contactPoints.map(cp => ({
      uid: cp.uid,
      name: cp.name,
      type: cp.type,
      settings: cp.settings as Record<string, any>,
      disableResolveMessage: cp.disableResolveMessage || false
    }));

    return NextResponse.json(analyticsPlatformContactPoints);
  } catch (error) {
    console.error('Failed to fetch contact points:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact points' },
      { status: 500 }
    );
  }
}

// Create new contact point
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = contactPointSchema.parse(body);
    
    // Generate UID if not provided
    const uid = validatedData.uid || `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const contactPoint = await prisma.contactPoint.create({
      data: {
        uid,
        name: validatedData.name,
        type: validatedData.type,
        settings: validatedData.settings,
        disableResolveMessage: validatedData.disableResolveMessage || false
      }
    });

    return NextResponse.json({
      uid: contactPoint.uid,
      name: contactPoint.name,
      type: contactPoint.type,
      settings: contactPoint.settings,
      disableResolveMessage: contactPoint.disableResolveMessage
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create contact point:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create contact point' },
      { status: 500 }
    );
  }
}

// Update contact point
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, ...updateData } = contactPointSchema.parse(body);
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Contact point UID is required for updates' },
        { status: 400 }
      );
    }
    
    const contactPoint = await prisma.contactPoint.update({
      where: { uid },
      data: {
        name: updateData.name,
        type: updateData.type,
        settings: updateData.settings,
        disableResolveMessage: updateData.disableResolveMessage,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      uid: contactPoint.uid,
      name: contactPoint.name,
      type: contactPoint.type,
      settings: contactPoint.settings,
      disableResolveMessage: contactPoint.disableResolveMessage
    });
    
  } catch (error) {
    console.error('Failed to update contact point:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update contact point' },
      { status: 500 }
    );
  }
}

// Delete contact point
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Contact point UID is required' },
        { status: 400 }
      );
    }
    
    // Check if contact point is in use
    const rulesUsingCP = await prisma.alertRule.count({
      where: {
        contactPoints: {
          some: { uid }
        }
      }
    });
    
    if (rulesUsingCP > 0) {
      return NextResponse.json(
        { error: 'Cannot delete contact point that is in use by alert rules' },
        { status: 400 }
      );
    }
    
    await prisma.contactPoint.delete({
      where: { uid }
    });
    
    return NextResponse.json({ message: 'Contact point deleted successfully' });
    
  } catch (error) {
    console.error('Failed to delete contact point:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact point' },
      { status: 500 }
    );
  }
}

// Test contact point
export async function POST_TEST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, testMessage } = body;
    
    if (!uid) {
      return NextResponse.json(
        { error: 'Contact point UID is required' },
        { status: 400 }
      );
    }
    
    const contactPoint = await prisma.contactPoint.findUnique({
      where: { uid }
    });
    
    if (!contactPoint) {
      return NextResponse.json(
        { error: 'Contact point not found' },
        { status: 404 }
      );
    }
    
    // Mock test notification
    const testResult = await sendTestNotification(contactPoint, testMessage);
    
    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to test contact point:', error);
    return NextResponse.json(
      { error: 'Failed to test contact point' },
      { status: 500 }
    );
  }
}

// Mock notification sender for testing
async function sendTestNotification(contactPoint: any, message: string = 'Test notification') {
  const settings = contactPoint.settings as Record<string, any>;
  
  try {
    switch (contactPoint.type) {
      case 'email':
        console.log(`📧 Test email sent to: ${settings.addresses}`);
        return { success: true, message: `Test email sent to ${settings.addresses}` };
        
      case 'slack':
        console.log(`💬 Test Slack message sent to: ${settings.channel}`);
        return { success: true, message: `Test message sent to Slack channel ${settings.channel}` };
        
      case 'webhook':
        console.log(`🔗 Test webhook called: ${settings.url}`);
        // In real implementation, would make HTTP request to webhook URL
        return { success: true, message: `Test webhook request sent to ${settings.url}` };
        
      case 'pagerduty':
        console.log(`📟 Test PagerDuty alert sent`);
        return { success: true, message: 'Test PagerDuty alert triggered' };
        
      case 'teams':
        console.log(`👥 Test Microsoft Teams message sent`);
        return { success: true, message: 'Test Teams message sent' };
        
      case 'telegram':
        console.log(`📱 Test Telegram message sent`);
        return { success: true, message: 'Test Telegram message sent' };
        
      case 'sms':
        console.log(`📱 Test SMS sent to: ${settings.phoneNumber}`);
        return { success: true, message: `Test SMS sent to ${settings.phoneNumber}` };
        
      default:
        return { success: false, message: `Unknown contact point type: ${contactPoint.type}` };
    }
  } catch (error) {
    console.error('Test notification failed:', error);
    return { success: false, message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}