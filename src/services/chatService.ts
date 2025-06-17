import { 
  ChatMessage, 
  ChatSession, 
  ChatCompletionRequest, 
  ChatCompletionResponse,
  AvailableFunction,
  ManufacturingData,
  FunctionCallResult,
  ChatFunctionParameter
} from '@/models/chat';
import equipmentService from './equipmentService';

// Mock manufacturing data for AI functions
const mockManufacturingData: ManufacturingData = {
  // Equipment data
  equipment: [
    {
      id: 'equip-1',
      name: 'CNC Machine XYZ-1000',
      type: 'CNC',
      status: 'operational',
      metrics: {
        oee: 82.7,
        availability: 90.2,
        performance: 85.1,
        quality: 98.5
      }
    },
    {
      id: 'equip-2',
      name: 'Robot Arm RX-200',
      type: 'Robot',
      status: 'maintenance',
      metrics: {
        oee: 0,
        availability: 0,
        performance: 0,
        quality: 0
      }
    },
    {
      id: 'equip-3',
      name: 'Conveyor Belt System CB-500',
      type: 'Conveyor',
      status: 'offline',
      metrics: {
        oee: 0,
        availability: 0,
        performance: 0,
        quality: 0
      }
    },
    {
      id: 'equip-4',
      name: 'Injection Molding Machine IM-103',
      type: 'Injection Molding',
      status: 'operational',
      metrics: {
        oee: 87.4,
        availability: 91.8,
        performance: 92.3,
        quality: 97.9
      }
    },
    {
      id: 'equip-5',
      name: 'Laser Cutting Machine LC-2000',
      type: 'Laser Cutter',
      status: 'operational',
      metrics: {
        oee: 89.6,
        availability: 94.1,
        performance: 91.2,
        quality: 99.3
      }
    }
  ],
  
  // Production metrics
  production: [
    {
      line_id: 'line-1',
      line_name: 'Production Line 1',
      target: 800,
      actual: 760,
      oee: 83.5,
      availability: 90.2,
      performance: 86.7,
      quality: 98.1
    },
    {
      line_id: 'line-2',
      line_name: 'Production Line 2',
      target: 600,
      actual: 585,
      oee: 87.2,
      availability: 92.5,
      performance: 90.8,
      quality: 97.5
    },
    {
      line_id: 'line-3',
      line_name: 'Production Line 3',
      target: 700,
      actual: 655,
      oee: 85.2,
      availability: 92.5,
      performance: 87.3,
      quality: 98.9
    }
  ],
  
  // Downtime reasons
  downtime: [
    { reason: 'Material changeover', hours: 42.3, percentage: 28.5 },
    { reason: 'Equipment failure', hours: 31.7, percentage: 21.4 },
    { reason: 'Operator breaks', hours: 18.9, percentage: 12.7 },
    { reason: 'Quality inspections', hours: 15.2, percentage: 10.3 },
    { reason: 'Setup time', hours: 14.8, percentage: 10.0 },
    { reason: 'Maintenance', hours: 12.1, percentage: 8.2 },
    { reason: 'Other', hours: 13.2, percentage: 8.9 }
  ],
  
  // Maintenance schedules
  maintenance: [
    {
      equipment_id: 'equip-4',
      equipment_name: 'Injection Molding Machine IM-103',
      type: 'preventive',
      scheduled_date: '2025-06-21T08:00:00Z',
      estimated_duration: 3,
      tasks: [
        'Hydraulic fluid check and replacement',
        'Nozzle and barrel cleaning',
        'Lubrication of moving components',
        'Electrical system inspection'
      ],
      assigned_to: ['John Doe', 'Sarah Smith']
    },
    {
      equipment_id: 'equip-1',
      equipment_name: 'CNC Machine XYZ-1000',
      type: 'preventive',
      scheduled_date: '2025-07-03T09:00:00Z',
      estimated_duration: 4,
      tasks: [
        'Spindle maintenance',
        'Coolant system cleaning',
        'Axis calibration',
        'Tool changer inspection',
        'Safety system check'
      ],
      assigned_to: ['Mike Johnson']
    },
    {
      equipment_id: 'equip-2',
      equipment_name: 'Robot Arm RX-200',
      type: 'corrective',
      scheduled_date: '2025-06-18T10:00:00Z',
      estimated_duration: 6,
      tasks: [
        'Servo motor replacement',
        'Controller firmware update',
        'Axis calibration',
        'Path accuracy testing'
      ],
      assigned_to: ['Alex Chen', 'Maria Rodriguez']
    }
  ],
  
  // Quality metrics
  quality: {
    period: 'Past Month',
    reject_rate: 1.9,
    previous_rate: 2.7,
    change_percentage: -29.6,
    defect_categories: [
      { name: 'Surface finish', percentage: 32, change: -45 },
      { name: 'Dimensional accuracy', percentage: 28, change: -28 },
      { name: 'Material contamination', percentage: 15, change: -37 },
      { name: 'Assembly errors', percentage: 12, change: -5 },
      { name: 'Packaging defects', percentage: 8, change: 0 },
      { name: 'Other', percentage: 5, change: -10 }
    ]
  }
};

// Mock chat sessions
const mockChatSessions: ChatSession[] = [
  {
    id: 'session-1',
    title: 'OEE Analysis for Line 3',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: 'msg-1',
        role: 'system',
        content: 'You are a manufacturing assistant that helps with analyzing manufacturing data, providing insights, and answering questions about manufacturing operations.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'msg-2',
        role: 'user',
        content: "What's the current OEE for production line 3?",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1000).toISOString()
      },
      {
        id: 'msg-3',
        role: 'assistant',
        content: "The current OEE for production line 3 is 85.2%, which is above the target of 80%. This is broken down into:\n\n- Availability: 92.5%\n- Performance: 87.3%\n- Quality: 98.9%\n\nThe main contributors to the improved OEE are increased availability due to reduced changeover times and fewer minor stops affecting performance.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000).toISOString()
      }
    ]
  },
  {
    id: 'session-2',
    title: 'Downtime Analysis',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: 'msg-4',
        role: 'system',
        content: 'You are a manufacturing assistant that helps with analyzing manufacturing data, providing insights, and answering questions about manufacturing operations.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'msg-5',
        role: 'user',
        content: "Show me the top 5 downtime reasons this week",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1000).toISOString()
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: "Based on this week's data, the top 5 downtime reasons are:\n\n1. Material changeover: 42.3 hours (28.5%)\n2. Equipment failure: 31.7 hours (21.4%)\n3. Operator breaks: 18.9 hours (12.7%)\n4. Quality inspections: 15.2 hours (10.3%)\n5. Setup time: 14.8 hours (10.0%)\n\nThe material changeover time has increased by 15% compared to last week, primarily due to the introduction of new product variants. I recommend reviewing the changeover procedures for optimization opportunities.",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5000).toISOString()
      }
    ]
  },
  {
    id: 'session-3',
    title: 'Maintenance Schedule',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    messages: [
      {
        id: 'msg-7',
        role: 'system',
        content: 'You are a manufacturing assistant that helps with analyzing manufacturing data, providing insights, and answering questions about manufacturing operations.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'msg-8',
        role: 'user',
        content: "When is the next scheduled maintenance for the injection molding machine?",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000 + 1000).toISOString()
      },
      {
        id: 'msg-9',
        role: 'assistant',
        content: "The next scheduled maintenance for the injection molding machine (IM-103) is on Friday, June 21st at 8:00 AM. It's a preventive maintenance with an estimated duration of 3 hours.\n\nThe maintenance will include:\n- Hydraulic fluid check and replacement\n- Nozzle and barrel cleaning\n- Lubrication of moving components\n- Electrical system inspection\n\nThe maintenance team has assigned technicians John Doe and Sarah Smith to perform this maintenance.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000 + 5000).toISOString()
      }
    ]
  }
];

// Define available functions for the AI to call
const availableFunctions: AvailableFunction[] = [
  {
    name: 'get_equipment_info',
    description: 'Get information about a specific piece of equipment by ID or name',
    parameters: {
      type: 'object',
      properties: {
        id_or_name: {
          type: 'string',
          description: 'The ID or name of the equipment to get information about'
        }
      },
      required: ['id_or_name']
    },
    handler: async (args: Record<string, unknown>) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchTerm = (args.id_or_name as string).toLowerCase();
      const equipment = mockManufacturingData.equipment.find(eq => 
        eq.id.toLowerCase() === searchTerm || 
        eq.name.toLowerCase().includes(searchTerm)
      );
      
      if (!equipment) {
        return { error: 'Equipment not found' };
      }
      
      return equipment;
    }
  },
  {
    name: 'get_production_metrics',
    description: 'Get production metrics for a specific production line by ID or name',
    parameters: {
      type: 'object',
      properties: {
        line_id_or_name: {
          type: 'string',
          description: 'The ID or name of the production line'
        }
      },
      required: ['line_id_or_name']
    },
    handler: async (args: Record<string, unknown>) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchTerm = (args.line_id_or_name as string).toLowerCase();
      let lineNumber: number | null = null;
      
      // Check if input is like "line 3" or "production line 3"
      const lineMatch = searchTerm.match(/(?:production\s*)?line\s*(\d+)/i);
      if (lineMatch && lineMatch[1]) {
        lineNumber = parseInt(lineMatch[1], 10);
      }
      
      const line = mockManufacturingData.production.find(line => 
        line.line_id.toLowerCase() === searchTerm || 
        line.line_name.toLowerCase().includes(searchTerm) ||
        (lineNumber && line.line_name.toLowerCase().includes(`line ${lineNumber}`))
      );
      
      if (!line) {
        return { error: 'Production line not found' };
      }
      
      return line;
    }
  },
  {
    name: 'get_downtime_reasons',
    description: 'Get the top downtime reasons for the current week',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of top reasons to return (default: all)'
        }
      }
    },
    handler: async (args: any) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const count = args.count || mockManufacturingData.downtime.length;
      return {
        total_downtime: mockManufacturingData.downtime.reduce((sum, item) => sum + item.hours, 0),
        reasons: mockManufacturingData.downtime
          .sort((a, b) => b.hours - a.hours)
          .slice(0, count)
      };
    }
  },
  {
    name: 'get_maintenance_schedule',
    description: 'Get the maintenance schedule for a specific equipment or all equipment',
    parameters: {
      type: 'object',
      properties: {
        equipment_id_or_name: {
          type: 'string',
          description: 'The ID or name of the equipment (optional)'
        }
      }
    },
    handler: async (args: any) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!args.equipment_id_or_name) {
        // Return all maintenance schedules
        return {
          count: mockManufacturingData.maintenance.length,
          schedules: mockManufacturingData.maintenance.sort((a, b) => 
            new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
          )
        };
      }
      
      const searchTerm = args.equipment_id_or_name.toLowerCase();
      const schedule = mockManufacturingData.maintenance.find(item => 
        item.equipment_id.toLowerCase() === searchTerm || 
        item.equipment_name.toLowerCase().includes(searchTerm)
      );
      
      if (!schedule) {
        return { error: 'Maintenance schedule not found for the specified equipment' };
      }
      
      return schedule;
    }
  },
  {
    name: 'get_quality_metrics',
    description: 'Get quality metrics and reject rate trends',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'The time period to get metrics for (default: "Past Month")'
        }
      }
    },
    handler: async (args: any) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Currently we only have data for "Past Month"
      return mockManufacturingData.quality;
    }
  },
  {
    name: 'get_all_equipment',
    description: 'Get a list of all equipment in the system',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter equipment by status (operational, maintenance, offline)'
        }
      }
    },
    handler: async (args: any) => {
      try {
        // In a real implementation, this would call the actual equipment service
        const allEquipment = await equipmentService.getAllEquipment();
        
        if (args.status) {
          const filteredEquipment = allEquipment.filter(
            eq => eq.status.toLowerCase() === args.status?.toLowerCase()
          );
          return {
            count: filteredEquipment.length,
            equipment: filteredEquipment
          };
        }
        
        return {
          count: allEquipment.length,
          equipment: allEquipment
        };
      } catch (error) {
        // Fallback to mock data
        if (args.status) {
          const filteredEquipment = mockManufacturingData.equipment.filter(
            eq => eq.status.toLowerCase() === args.status?.toLowerCase()
          );
          return {
            count: filteredEquipment.length,
            equipment: filteredEquipment
          };
        }
        
        return {
          count: mockManufacturingData.equipment.length,
          equipment: mockManufacturingData.equipment
        };
      }
    }
  }
];

// Unique ID generator
const generateId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const chatService = {
  // Get all chat sessions
  getAllSessions: async (): Promise<ChatSession[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockChatSessions;
  },
  
  // Get a chat session by ID
  getSessionById: async (id: string): Promise<ChatSession | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const session = mockChatSessions.find(session => session.id === id);
    return session || null;
  },
  
  // Create a new chat session
  createSession: async (title?: string): Promise<ChatSession> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const systemMessage: ChatMessage = {
      id: generateId('msg'),
      role: 'system',
      content: 'You are a manufacturing assistant that helps with analyzing manufacturing data, providing insights, and answering questions about manufacturing operations.',
      timestamp: new Date().toISOString()
    };
    
    const assistantMessage: ChatMessage = {
      id: generateId('msg'),
      role: 'assistant',
      content: 'Welcome to Manufacturing Chat. How can I assist you with your manufacturing operations today?',
      timestamp: new Date().toISOString()
    };
    
    const newSession: ChatSession = {
      id: generateId('session'),
      title: title || 'New Manufacturing Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [systemMessage, assistantMessage]
    };
    
    // In a real application, this would be a server call
    mockChatSessions.unshift(newSession);
    
    return newSession;
  },
  
  // Add a message to a chat session
  addMessage: async (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const session = mockChatSessions.find(session => session.id === sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    const newMessage: ChatMessage = {
      ...message,
      id: generateId('msg'),
      timestamp: new Date().toISOString()
    };
    
    // In a real application, this would be a server call
    if (!session.messages) {
      session.messages = [];
    }
    session.messages.push(newMessage);
    session.updatedAt = new Date().toISOString();
    
    // Update session title if it's still the default and this is a user message
    if (session.title === 'New Manufacturing Chat' && message.role === 'user') {
      const title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
      session.title = title;
    }
    
    return newMessage;
  },
  
  // Get AI response to a message
  getAIResponse: async (
    sessionId: string, 
    messages: Pick<ChatMessage, 'role' | 'content' | 'name'>[]
  ): Promise<Pick<ChatMessage, 'role' | 'content' | 'name'>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Convert messages to the format expected by the AI API
    const apiMessages = messages.map(message => ({
      role: message.role,
      content: message.content,
      name: message.name
    }));
    
    // Create a chat completion request
    const request: ChatCompletionRequest = {
      messages: apiMessages,
      model: 'manufacturing-assistant-1',
      temperature: 0.7,
      max_tokens: 1000,
      functions: availableFunctions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      }))
    };
    
    try {
      // In a real implementation, this would make an API call to an LLM service
      // For now, simulate a response based on the user's query
      const response = await simulateAIResponse(request);
      
      // Check if the AI wants to call a function
      if (response.choices[0].message.function_call) {
        const functionCall = response.choices[0].message.function_call;
        const functionName = functionCall.name;
        const functionArgs = JSON.parse(functionCall.arguments);
        
        // Find the function to call
        const functionToCall = availableFunctions.find(fn => fn.name === functionName);
        if (!functionToCall) {
          throw new Error(`Function ${functionName} not found`);
        }
        
        // Call the function
        const functionResult = await functionToCall.handler(functionArgs);
        
        // Add the function result to the messages
        const functionResultMessage: Pick<ChatMessage, 'role' | 'content' | 'name'> = {
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        };
        
        // Get a new response from the AI with the function result
        return await chatService.getAIResponse(
          sessionId,
          [...apiMessages, response.choices[0].message, functionResultMessage]
        );
      }
      
      return response.choices[0].message;
    } catch (error) {
      return {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again later."
      };
    }
  },
  
  // Delete a chat session
  deleteSession: async (id: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = mockChatSessions.findIndex(session => session.id === id);
    if (index === -1) {
      return false;
    }
    
    // In a real application, this would be a server call
    mockChatSessions.splice(index, 1);
    
    return true;
  },
  
  // Rename a chat session
  renameSession: async (id: string, title: string): Promise<ChatSession | null> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const session = mockChatSessions.find(session => session.id === id);
    if (!session) {
      return null;
    }
    
    // In a real application, this would be a server call
    session.title = title;
    session.updatedAt = new Date().toISOString();
    
    return session;
  }
};

// Simulate AI response
async function simulateAIResponse(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  // Get the last user message
  const lastUserMessage = [...request.messages].reverse().find(msg => msg.role === 'user');
  
  if (!lastUserMessage) {
    throw new Error('No user message found');
  }
  
  const queryLower = lastUserMessage.content.toLowerCase();
  let responseMessage: ChatCompletionResponse['choices'][0]['message'] = {
    role: 'assistant',
    content: ''
  };
  
  // Check if we should call a function
  if (queryLower.includes('oee') && queryLower.includes('line 3')) {
    // Call get_production_metrics function
    responseMessage = {
      role: 'assistant',
      function_call: {
        name: 'get_production_metrics',
        arguments: JSON.stringify({
          line_id_or_name: 'line 3'
        })
      },
      content: ''
    };
  } else if (queryLower.includes('equipment') && (queryLower.includes('list') || queryLower.includes('all'))) {
    // Call get_all_equipment function
    responseMessage = {
      role: 'assistant',
      function_call: {
        name: 'get_all_equipment',
        arguments: JSON.stringify({})
      },
      content: ''
    };
  } else if (queryLower.includes('downtime') || (queryLower.includes('top') && queryLower.includes('reasons'))) {
    // Call get_downtime_reasons function
    let count = 5; // Default
    
    // Check if the user specified a number
    const countMatch = queryLower.match(/top\s+(\d+)/i);
    if (countMatch && countMatch[1]) {
      count = parseInt(countMatch[1], 10);
    }
    
    responseMessage = {
      role: 'assistant',
      function_call: {
        name: 'get_downtime_reasons',
        arguments: JSON.stringify({
          count
        })
      },
      content: ''
    };
  } else if (queryLower.includes('maintenance') && queryLower.includes('injection molding')) {
    // Call get_maintenance_schedule function
    responseMessage = {
      role: 'assistant',
      function_call: {
        name: 'get_maintenance_schedule',
        arguments: JSON.stringify({
          equipment_id_or_name: 'Injection Molding Machine'
        })
      },
      content: ''
    };
  } else if (queryLower.includes('quality') || queryLower.includes('reject')) {
    // Call get_quality_metrics function
    responseMessage = {
      role: 'assistant',
      function_call: {
        name: 'get_quality_metrics',
        arguments: JSON.stringify({
          period: 'Past Month'
        })
      },
      content: ''
    };
  } else {
    // Generate a static response based on the query
    if (queryLower.includes('oee') && queryLower.includes('calculate')) {
      responseMessage.content = "Overall Equipment Effectiveness (OEE) is calculated by multiplying three factors:\n\nOEE = Availability × Performance × Quality\n\nWhere:\n\n- Availability = (Actual Run Time / Planned Production Time) × 100%\n- Performance = (Actual Output / Theoretical Maximum Output) × 100%\n- Quality = (Good Units / Total Units Produced) × 100%\n\nOEE is a powerful metric that helps identify losses in manufacturing processes and provides a standardized way to measure production efficiency.";
    } else if (queryLower.includes('equipment failures') || queryLower.includes('common causes')) {
      responseMessage.content = "Common causes of equipment failures in manufacturing include:\n\n1. Inadequate maintenance: Lack of regular preventive maintenance leads to accelerated wear and unexpected breakdowns.\n\n2. Operator error: Improper machine operation or not following standard procedures.\n\n3. Environmental factors: Excessive temperature, humidity, dust, or vibration can damage sensitive components.\n\n4. Material issues: Low-quality or inappropriate materials can cause equipment to fail or wear prematurely.\n\n5. Age-related degradation: Components reaching the end of their service life.\n\n6. Design flaws: Inherent weaknesses in equipment design.\n\n7. Overloading: Operating equipment beyond its rated capacity.\n\n8. Poor installation: Improper setup or alignment of equipment.\n\nImplementing a predictive maintenance strategy using condition monitoring and data analytics can help identify potential failures before they occur.";
    } else {
      responseMessage.content = "I can help with manufacturing metrics like OEE, downtime analysis, maintenance schedules, quality data, and manufacturing best practices. I'm connected to your manufacturing systems to provide real-time insights and recommendations. Please try asking about one of these topics, or feel free to ask any other manufacturing-related question.";
    }
  }
  
  // Handle function responses
  if (request.messages.some(msg => msg.role === 'function')) {
    const functionMessage = [...request.messages].reverse().find(msg => msg.role === 'function');
    if (functionMessage && functionMessage.name && functionMessage.content) {
      const functionName = functionMessage.name;
      const functionResult = JSON.parse(functionMessage.content);
      
      // Generate responses based on function results
      if (functionName === 'get_production_metrics') {
        const line = functionResult;
        responseMessage.content = `The current OEE for ${line.line_name} is ${line.oee}%, which is ${line.oee >= 80 ? 'above' : 'below'} the target of 80%. This is broken down into:\n\n- Availability: ${line.availability}%\n- Performance: ${line.performance}%\n- Quality: ${line.quality}%\n\n${line.oee >= 80 ? 'The main contributors to the improved OEE are increased availability due to reduced changeover times and fewer minor stops affecting performance.' : 'The main contributors to the reduced OEE are decreased availability due to increased changeover times and more minor stops affecting performance.'}`;
      } else if (functionName === 'get_all_equipment') {
        const equipmentList = functionResult.equipment;
        let response = `There are ${equipmentList.length} pieces of equipment registered in the system:\n\n`;
        
        equipmentList.forEach((eq: ManufacturingData['equipment'][0], index: number) => {
          response += `${index + 1}. ${eq.name} (${eq.type}) - Status: ${eq.status}\n`;
        });
        
        response += `\nDo you want more detailed information about any specific equipment?`;
        responseMessage.content = response;
      } else if (functionName === 'get_downtime_reasons') {
        const downtimeData = functionResult;
        let response = `Based on this week's data, the top ${downtimeData.reasons.length} downtime reasons are:\n\n`;
        
        downtimeData.reasons.forEach((reason: ManufacturingData['downtime'][0], index: number) => {
          response += `${index + 1}. ${reason.reason}: ${reason.hours.toFixed(1)} hours (${reason.percentage.toFixed(1)}%)\n`;
        });
        
        response += `\nThe material changeover time has increased by 15% compared to last week, primarily due to the introduction of new product variants. I recommend reviewing the changeover procedures for optimization opportunities.`;
        responseMessage.content = response;
      } else if (functionName === 'get_maintenance_schedule') {
        const maintenance = functionResult;
        const scheduledDate = new Date(maintenance.scheduled_date);
        
        let response = `The next scheduled maintenance for the ${maintenance.equipment_name} is on ${scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. It's a ${maintenance.type} maintenance with an estimated duration of ${maintenance.estimated_duration} hours.\n\n`;
        
        response += "The maintenance will include:\n";
        maintenance.tasks.forEach((task: string) => {
          response += `- ${task}\n`;
        });
        
        response += `\nThe maintenance team has assigned technicians ${maintenance.assigned_to.join(' and ')} to perform this maintenance.`;
        responseMessage.content = response;
      } else if (functionName === 'get_quality_metrics') {
        const quality = functionResult;
        let response = `The quality reject rate trend shows a decrease from ${quality.previous_rate}% to ${quality.reject_rate}% over the past month, which is a positive improvement of approximately ${Math.abs(quality.change_percentage).toFixed(0)}%.\n\n`;
        
        response += "Key improvements were seen in:\n";
        quality.defect_categories
          .filter((cat: ManufacturingData['quality']['defect_categories'][0]) => cat.change < 0)
          .sort((a: ManufacturingData['quality']['defect_categories'][0], b: ManufacturingData['quality']['defect_categories'][0]) => b.change - a.change)
          .slice(0, 3)
          .forEach((category: ManufacturingData['quality']['defect_categories'][0]) => {
            response += `- ${category.name} defects: Reduced by ${Math.abs(category.change)}%\n`;
          });
        
        response += `\nThese improvements can be attributed to the implementation of the new vision inspection system and the operator training program completed last month.`;
        responseMessage.content = response;
      } else if (functionName === 'get_equipment_info') {
        const equipment = functionResult;
        let response = `Equipment Information for ${equipment.name}:\n\n`;
        response += `Type: ${equipment.type}\n`;
        response += `Status: ${equipment.status}\n\n`;
        
        if (equipment.metrics && equipment.status === 'operational') {
          response += `Performance Metrics:\n`;
          response += `- OEE: ${equipment.metrics.oee}%\n`;
          response += `- Availability: ${equipment.metrics.availability}%\n`;
          response += `- Performance: ${equipment.metrics.performance}%\n`;
          response += `- Quality: ${equipment.metrics.quality}%\n`;
        }
        
        responseMessage.content = response;
      }
    }
  }
  
  // Create a fake chat completion response
  const response: ChatCompletionResponse = {
    id: generateId('resp'),
    model: 'manufacturing-assistant-1',
    choices: [
      {
        index: 0,
        message: responseMessage,
        finish_reason: responseMessage.function_call ? 'function_call' : 'stop'
      }
    ]
  };
  
  return response;
}

export default chatService;