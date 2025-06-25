import { 
  ChatMessage, 
  ChatSession, 
  ChatCompletionRequest, 
  ChatCompletionResponse
} from '@/models/chat';
import { prisma } from '@/lib/prisma';

// Unique ID generator
const generateId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// In-memory session store (for development)
// In production, this would be stored in Redis or database
const sessionStore = new Map<string, ChatSession>();

export const chatService = {
  // Get all chat sessions from store
  getAllSessions: async (): Promise<ChatSession[]> => {
    try {
      // Return sessions sorted by most recent first
      const sessions = Array.from(sessionStore.values());
      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  },
  
  // Get a chat session by ID from store
  getSessionById: async (id: string): Promise<ChatSession | null> => {
    try {
      return sessionStore.get(id) || null;
    } catch (error) {
      console.error('Error fetching chat session:', error);
      return null;
    }
  },
  
  // Create a new chat session in store
  createSession: async (title?: string): Promise<ChatSession> => {
    try {
      const systemMessage: ChatMessage = {
        id: generateId('msg'),
        role: 'system',
        content: 'You are a manufacturing assistant that helps with analyzing manufacturing data, providing insights, and answering questions about manufacturing operations using live data from ',
        timestamp: new Date().toISOString()
      };
      
      const assistantMessage: ChatMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: 'Welcome to Manufacturing Chat. I can provide real-time insights from  How can I assist you today?',
        timestamp: new Date().toISOString()
      };
      
      const newSession: ChatSession = {
        id: generateId('session'),
        title: title || 'New Manufacturing Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [systemMessage, assistantMessage]
      };
      
      // Save to session store
      sessionStore.set(newSession.id, newSession);
      
      return newSession;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  },
  
  // Add a message to a chat session
  addMessage: async (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
    try {
      const newMessage: ChatMessage = {
        ...message,
        id: generateId('msg'),
        timestamp: new Date().toISOString()
      };
      
      // Get existing session from store
      const session = sessionStore.get(sessionId);
      if (session) {
        // Add message to session
        session.messages.push(newMessage);
        session.updatedAt = new Date().toISOString();
        
        // Update session in store
        sessionStore.set(sessionId, session);
      }
      
      return newMessage;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },
  
  // Get AI response using live data only
  getAIResponse: async (
    sessionId: string, 
    messages: Pick<ChatMessage, 'role' | 'content' | 'name'>[]
  ): Promise<Pick<ChatMessage, 'role' | 'content' | 'name'>> => {
    try {
      // Call the real API endpoint which uses manufacturingChatService for live data
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            name: msg.name
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract the AI response
      const aiMessage = data.message || {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request with live data.'
      };
      
      return {
        role: aiMessage.role,
        content: aiMessage.content,
        name: aiMessage.name
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      return {
        role: 'assistant',
        content: "I'm sorry, I encountered an error accessing the live manufacturing data. Please ensure the database connection is working and try again."
      };
    }
  },
  
  // Delete a chat session from store
  deleteSession: async (id: string): Promise<boolean> => {
    try {
      const deleted = sessionStore.delete(id);
      return deleted;
    } catch (error) {
      console.error('Error deleting chat session:', error);
      return false;
    }
  },
  
  // Rename a chat session in store
  renameSession: async (id: string, title: string): Promise<ChatSession | null> => {
    try {
      const session = sessionStore.get(id);
      if (session) {
        session.title = title;
        session.updatedAt = new Date().toISOString();
        sessionStore.set(id, session);
        return session;
      }
      return null;
    } catch (error) {
      console.error('Error renaming chat session:', error);
      return null;
    }
  }
};

export default chatService;