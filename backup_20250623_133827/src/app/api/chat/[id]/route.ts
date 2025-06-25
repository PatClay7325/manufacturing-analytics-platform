import { NextRequest, NextResponse } from 'next/server';
import { ChatMessage } from '@/models/chat';

// Sample data - importing from parent route to keep consistency
import { chatSessions } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Find the chat session by ID
  const session = chatSessions.find(s => s.id === id);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Chat session not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(session);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    
    // Check if session exists
    const sessionIndex = chatSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }
    
    // Handle adding a message
    if (data.action === 'add_message' && data.message) {
      // Make sure messages array exists
      if (!chatSessions[sessionIndex].messages) {
        chatSessions[sessionIndex].messages = [];
      }
      
      const newMessage: ChatMessage = {
        id: `${id}-${chatSessions[sessionIndex].messages!.length + 1}`,
        role: data.message.role,
        content: data.message.content,
        timestamp: new Date().toISOString(),
        name: data.message.name
      };
      
      // Actually update our mock data for the session
      chatSessions[sessionIndex].messages!.push(newMessage);
      chatSessions[sessionIndex].updatedAt = new Date().toISOString();
      
      // If user message, generate AI response
      let aiResponse: ChatMessage | null = null;
      if (data.message.role === 'user') {
        aiResponse = {
          id: `${id}-${chatSessions[sessionIndex].messages!.length + 1}`,
          role: 'assistant',
          content: 'I\'m analyzing your query about manufacturing operations. Let me check our systems for the most up-to-date information...',
          timestamp: new Date().toISOString()
        };
        
        // Add AI response to messages as well
        chatSessions[sessionIndex].messages!.push(aiResponse);
      }
      
      return NextResponse.json({
        message: newMessage,
        aiResponse: aiResponse
      });
    }
    
    // Handle updating session title or other properties
    if (data.title) {
      chatSessions[sessionIndex].title = data.title;
      chatSessions[sessionIndex].updatedAt = new Date().toISOString();
      
      return NextResponse.json(chatSessions[sessionIndex]);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Check if session exists
  const sessionIndex = chatSessions.findIndex(s => s.id === id);
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