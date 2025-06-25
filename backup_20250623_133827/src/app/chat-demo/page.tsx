'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '@/models/chat';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import PageLayout from '@/components/layout/PageLayout';
import { v4 as uuidv4 } from 'uuid';
import { generateThoughts } from '@/utils/thoughtGenerator';

// Mock responses for demo
const mockResponses: { [key: string]: string } = {
  'show me today\'s production overview': `Today's production is performing well with the following metrics:

📊 **Production Summary**
- Total Units Produced: 4,567 units (92% of target)
- Current Production Rate: 285 units/hour
- Active Lines: 6 of 8 operational

⚡ **OEE Performance**
- Overall OEE: 78.3% (↑ 2.1% from yesterday)
- Availability: 89.2%
- Performance: 91.5%
- Quality: 96.1%

🔧 **Equipment Status**
- 12 of 15 machines running
- 2 scheduled maintenance
- 1 unplanned downtime (Line 3 - sensor issue)

Would you like to see more details on any specific area?`,
  
  'what is the current oee?': `The current Overall Equipment Effectiveness (OEE) is **78.3%**

Here's the breakdown:
- **Availability**: 89.2% (10.8% downtime)
- **Performance**: 91.5% (8.5% speed losses)
- **Quality**: 96.1% (3.9% quality defects)

This represents a 2.1% improvement from yesterday's OEE of 76.2%. The main improvement came from reduced unplanned downtime.

The industry benchmark for your sector is 85% OEE, so there's room for improvement, particularly in availability.`,
  
  'any critical equipment alerts?': `🚨 **Critical Alerts** (3 active)

1. **Line 3 - Temperature Sensor Failure**
   - Status: Critical
   - Duration: 45 minutes
   - Impact: Production stopped
   - Action: Maintenance dispatched

2. **CNC Machine 7 - Vibration Alert**
   - Status: High
   - Threshold exceeded by 15%
   - Risk: Potential bearing failure
   - Action: Schedule inspection

3. **Packaging Unit 2 - Low Material**
   - Status: Warning
   - Remaining: < 30 minutes
   - Action: Material reorder initiated

All other equipment is operating normally. Would you like details on any specific alert?`,
  
  'equipment performance metrics': `📊 **Equipment Performance Metrics**

**Top Performers:**
1. CNC Machine 4: OEE 92.3%
2. Assembly Line 1: OEE 89.7%
3. Packaging Unit 1: OEE 88.5%

**Needs Attention:**
1. Welding Station 2: OEE 65.4% (frequent stoppages)
2. Paint Booth 3: OEE 71.2% (quality issues)
3. CNC Machine 2: OEE 73.8% (speed losses)

**Average Metrics:**
- Mean Time Between Failures: 187 hours
- Mean Time To Repair: 2.3 hours
- Overall Equipment Utilization: 81.4%

Would you like a detailed analysis of any specific equipment?`
};

export default function ChatDemoPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: 'Hello! I\'m your manufacturing analytics assistant. I can help you monitor production metrics, equipment status, and quality data in real-time. What would you like to know?',
      timestamp: new Date().toISOString(),
      thoughts: [
        'Show me today\'s production overview',
        'What is the current OEE?',
        'Any critical equipment alerts?',
        'Equipment performance metrics'
      ]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get mock response
    const lowerText = text.toLowerCase();
    let responseContent = mockResponses[lowerText];
    
    // If no exact match, try to find a partial match
    if (!responseContent) {
      const matchKey = Object.keys(mockResponses).find(key => 
        lowerText.includes(key) || key.includes(lowerText)
      );
      responseContent = matchKey ? mockResponses[matchKey] : 
        `I understand you're asking about "${text}". Let me analyze the current manufacturing data...

Based on the latest metrics, everything appears to be operating within normal parameters. 

Would you like me to provide specific information about:
- Production metrics
- Equipment status
- Quality data
- Alert summary`;
    }
    
    // Add assistant message with thoughts
    const assistantMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      thoughts: generateThoughts(responseContent)
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleThoughtSelect = (thought: string) => {
    handleSendMessage(thought);
  };

  return (
    <PageLayout 
      title="Chat Assistant Demo"
      description="Interactive demo showcasing GPT-4o style thought cards"
    >
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                This is a demo of the ThoughtCards feature. Click on the suggestion buttons below assistant messages to continue the conversation.
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50 rounded-lg">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                timestamp={message.timestamp}
                onThoughtSelect={handleThoughtSelect}
              />
            ))}
            {isLoading && (
              <ChatMessage isLoading />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput 
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about production metrics, equipment status, or quality data..."
        />
      </div>
    </PageLayout>
  );
}