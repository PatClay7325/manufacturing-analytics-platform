export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  name?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  messageCount?: number;
}

export interface ChatFunctionParameter {
  type: string;
  description?: string;
  properties?: Record<string, ChatFunctionParameter>;
  items?: ChatFunctionParameter;
  required?: string[];
  enum?: string[];
}

export interface ChatFunction {
  name: string;
  description: string;
  parameters: ChatFunctionParameter;
}

export interface ChatCompletionRequest {
  messages: Pick<ChatMessage, 'role' | 'content' | 'name'>[];
  model: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  functions?: ChatFunction[];
  function_call?: 'auto' | 'none' | { name: string };
}

export interface FunctionCallResult {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: MessageRole;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: 'stop' | 'length' | 'function_call';
  }[];
}

export interface AvailableFunction {
  name: string;
  description: string;
  parameters: ChatFunctionParameter;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ManufacturingData {
  // Equipment data types
  equipment: {
    id: string;
    name: string;
    type: string;
    status: string;
    metrics: {
      oee: number;
      availability: number;
      performance: number;
      quality: number;
    };
  }[];
  
  // Production metrics
  production: {
    line_id: string;
    line_name: string;
    target: number;
    actual: number;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }[];
  
  // Downtime reasons
  downtime: {
    reason: string;
    hours: number;
    percentage: number;
  }[];
  
  // Maintenance schedules
  maintenance: {
    equipment_id: string;
    equipment_name: string;
    type: string;
    scheduled_date: string;
    estimated_duration: number;
    tasks: string[];
    assigned_to: string[];
  }[];
  
  // Quality metrics
  quality: {
    period: string;
    reject_rate: number;
    previous_rate: number;
    change_percentage: number;
    defect_categories: {
      name: string;
      percentage: number;
      change: number;
    }[];
  };
}