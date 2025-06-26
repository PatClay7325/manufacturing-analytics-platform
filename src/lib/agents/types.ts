/**
 * Shared types for conversational agents
 */

export interface ConversationalResponse {
  content: string;
  suggestions?: string[];
  clarificationNeeded?: {
    question: string;
    options: string[];
  };
  visualizations?: any[];
  references?: any[];
  dataSources?: string[];
  context: {
    confidence: number;
    intent: string;
    entities: any;
    analysisType: string;
    critiqueScore?: number;
  };
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  entities: ExtractedEntities;
  preferences: UserPreferences;
  activeAnalysis?: AnalysisContext;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    entities?: any;
    analysisType?: string;
    confidence?: number;
    critiqueScore?: number;
  };
}

export interface ExtractedEntities {
  equipment?: string[];
  timeRange?: { start: Date; end: Date };
  metrics?: string[];
  products?: string[];
  shifts?: string[];
  lastMentioned?: {
    equipment?: string;
    metric?: string;
    timeRange?: { start: Date; end: Date };
  };
}

export interface UserPreferences {
  detailLevel: 'concise' | 'detailed' | 'technical';
  preferredVisualizations: string[];
  timezone: string;
  defaultTimeRange: string;
}

export interface AnalysisContext {
  type: string;
  data: any;
  timestamp: Date;
  followUpSuggestions: string[];
}