import { Alert } from '@/models/alert';
import { Equipment, EquipmentMetric, Maintenance } from '@/models/equipment';

// Define ChatSession and ChatMessage types locally since chat model was deleted
export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface RequestBody<T = any> {
  [key: string]: T;
}

// Auth Types
export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface RefreshTokenRequestBody {
  refreshToken: string;
}

export interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequestBody {
  password: string;
  newPassword: string;
}

// Session
export interface CreateSessionRequestBody {
  action: 'create_session';
  title?: string;
}

export interface AddMessageRequestBody {
  action: 'add_message';
  sessionId: string;
  message: {
    role: string;
    content: string;
    name?: string;
  };
}

// Mock Data Interface
export interface MockDataStore {
  equipment: Equipment[];
  alerts: Alert[];
  metrics: {
    equipment: EquipmentMetric[];
    oee: {
      date: string;
      oee: number;
    }[];
    production: {
      date: string;
      target: number;
      actual: number;
    }[];
    quality: {
      date: string;
      rejectRate: number;
    }[];
  };
  chat: {
    sessions: ChatSession[];
    messages: Record<string, ChatMessage[]>;
  };
  users: {
    id: string;
    username: string;
    email: string;
    role: string;
    lastLogin: string;
    createdAt: string;
  }[];
  maintenance: Maintenance[];
}