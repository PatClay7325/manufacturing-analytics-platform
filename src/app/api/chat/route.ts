import { NextRequest, NextResponse } from 'next/server';
import { ChatMessage, ChatSession } from '@/models/chat';

// Sample data for chat sessions - exported to share with dynamic route handler
export const chatSessions: ChatSession[] = [
  {
    id: '1',
    title: 'Equipment Maintenance Inquiry',
    createdAt: new Date('2025-06-15T10:30:00Z').toISOString(),
    updatedAt: new Date('2025-06-15T10:45:00Z').toISOString(),
    messages: [
      {
        id: '1-1',
        role: 'user',
        content: 'When is the next scheduled maintenance for Assembly Line A?',
        timestamp: new Date('2025-06-15T10:30:00Z').toISOString()
      },
      {
        id: '1-2',
        role: 'assistant',
        content: 'The next scheduled maintenance for Assembly Line A is on June 22, 2025. This is a regular quarterly maintenance that should take approximately 4 hours. Would you like me to show you the detailed maintenance plan?',
        timestamp: new Date('2025-06-15T10:30:30Z').toISOString()
      },
      {
        id: '1-3',
        role: 'user',
        content: 'Yes, please show me the detailed plan.',
        timestamp: new Date('2025-06-15T10:31:00Z').toISOString()
      },
      {
        id: '1-4',
        role: 'assistant',
        content: 'Here is the detailed maintenance plan for Assembly Line A:\n\n- Date: June 22, 2025\n- Time: 08:00 AM - 12:00 PM\n- Type: Quarterly Preventive Maintenance\n- Technician: John Smith\n- Tasks:\n  1. Lubrication of moving parts\n  2. Belt tension adjustment\n  3. Control system calibration\n  4. Safety system testing\n  5. General cleaning\n\nThe production schedule has been adjusted to accommodate this maintenance window. Would you like me to notify the maintenance team of any specific concerns?',
        timestamp: new Date('2025-06-15T10:31:30Z').toISOString()
      }
    ]
  },
  {
    id: '2',
    title: 'Production Capacity Analysis',
    createdAt: new Date('2025-06-16T14:20:00Z').toISOString(),
    updatedAt: new Date('2025-06-16T14:30:00Z').toISOString(),
    messages: [
      {
        id: '2-1',
        role: 'user',
        content: 'What was our average OEE last month compared to target?',
        timestamp: new Date('2025-06-16T14:20:00Z').toISOString()
      },
      {
        id: '2-2',
        role: 'assistant',
        content: 'Last month (May 2025), the average OEE across all production lines was 76.8%, which is 3.2% below our target of 80%. Here\'s the breakdown by production line:\n\n- Assembly Line A: 78.3% (target: 85%)\n- CNC Machine B: 72.1% (target: 80%)\n- Packaging Robot C: 80.0% (target: 75%)\n\nThe main contributors to the below-target performance were:\n1. Unplanned downtime on Assembly Line A (2 incidents, 8 hours total)\n2. Performance issues on CNC Machine B due to tooling problems\n\nWould you like more detailed analysis on any specific line?',
        timestamp: new Date('2025-06-16T14:20:30Z').toISOString()
      }
    ]
  },
  {
    id: '3',
    title: 'Quality Alert Investigation',
    createdAt: new Date('2025-06-17T09:10:00Z').toISOString(),
    updatedAt: new Date('2025-06-17T09:15:00Z').toISOString(),
    messages: [
      {
        id: '3-1',
        role: 'user',
        content: 'Tell me more about the quality deviation alert from this morning.',
        timestamp: new Date('2025-06-17T09:10:00Z').toISOString()
      },
      {
        id: '3-2',
        role: 'assistant',
        content: 'The quality deviation alert was triggered at 08:45 AM today for Packaging Robot C. The system detected a minor deviation in package sealing integrity.\n\nDetails:\n- Severity: Low\n- Parameter: Seal strength\n- Measured value: 9.7 N/mm (lower spec limit: 10.0 N/mm)\n- Affected products: Batch #2506-A, approximately 150 units\n\nThe alert has been acknowledged by the quality team at 09:15 AM. Initial investigation suggests a potential issue with the heating element temperature on sealing station #2. Maintenance has been notified and a technician is scheduled to inspect the equipment at 10:30 AM.\n\nWould you like me to notify you when the issue is resolved?',
        timestamp: new Date('2025-06-17T09:10:30Z').toISOString()
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('id');
  
  if (sessionId) {
    // Return specific chat session if ID is provided
    const session = chatSessions.find(s => s.id === sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(session);
  }
  
  // Return all chat sessions without messages content to reduce payload size
  const sessionsOverview = chatSessions.map(({ id, title, createdAt, updatedAt, messages }) => ({
    id,
    title,
    createdAt,
    updatedAt,
    messageCount: messages?.length || 0
  }));
  
  return NextResponse.json(sessionsOverview);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create a new chat session
    if (data.action === 'create_session') {
      const newSession: ChatSession = {
        id: `${chatSessions.length + 1}`,
        title: data.title || `New Chat ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };
      
      // Actually save to our mock data for the session
      chatSessions.push(newSession);
      
      return NextResponse.json(newSession, { status: 201 });
    }
    
    // Add message to existing session
    if (data.action === 'add_message' && data.sessionId && data.message) {
      const sessionIndex = chatSessions.findIndex(s => s.id === data.sessionId);
      
      if (sessionIndex === -1) {
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
      
      const newMessage: ChatMessage = {
        id: `${data.sessionId}-${chatSessions[sessionIndex].messages?.length ?? 0 + 1}`,
        role: data.message.role,
        content: data.message.content,
        timestamp: new Date().toISOString(),
        name: data.message.name
      };
      
      // Actually update our mock data for the session
      if (!chatSessions[sessionIndex].messages) {
        chatSessions[sessionIndex].messages = [];
      }
      chatSessions[sessionIndex].messages!.push(newMessage);
      chatSessions[sessionIndex].updatedAt = new Date().toISOString();
      
      // If user message, generate AI response
      let aiResponse: ChatMessage | null = null;
      if (data.message.role === 'user') {
        aiResponse = {
          id: `${data.sessionId}-${(chatSessions[sessionIndex].messages?.length ?? 0) + 1}`,
          role: 'assistant',
          content: 'I\'m analyzing your query about manufacturing operations. Let me check our systems for the most up-to-date information...',
          timestamp: new Date().toISOString()
        };
      }
      
      return NextResponse.json({
        message: newMessage,
        aiResponse: aiResponse
      }, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('id');
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }
  
  const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
  
  if (sessionIndex === -1) {
    return NextResponse.json(
      { error: 'Chat session not found' },
      { status: 404 }
    );
  }
  
  // Actually delete from our mock data for the session
  chatSessions.splice(sessionIndex, 1);
  
  return NextResponse.json({ success: true });
}