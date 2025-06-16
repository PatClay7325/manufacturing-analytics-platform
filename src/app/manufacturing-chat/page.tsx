'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  content: string;
  isUser: boolean;
}

export default function ManufacturingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        content:
          'Welcome to Manufacturing Chat. How can I assist you with your manufacturing operations today?',
        isUser: false,
      },
    ]);
  }, []);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = { content: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Generate response based on input
    const response = generateResponse(input);
    
    // Add a slight delay to simulate processing
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { content: response, isUser: false },
      ]);
    }, 500);
  }

  // Sample question handler
  function handleSampleQuestion(question: string) {
    setInput(question);
    
    // Submit the form programmatically
    const form = document.querySelector('form');
    if (form) {
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Manufacturing Chat</h1>
      </div>

      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
        <div 
          className="h-96 overflow-y-auto p-4" 
          style={{ maxHeight: '500px' }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 flex ${
                msg.isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3/4 rounded-lg px-4 py-2 ${
                  msg.isUser
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input flex-1"
              placeholder="Type your message here..."
            />
            <button type="submit" className="button-primary">
              Send
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-blue-900">
          Sample Questions:
        </h2>
        <ul className="space-y-2 text-gray-600">
          <li>
            <button
              onClick={() => handleSampleQuestion("What's the current OEE for production line 3?")}
              className="text-left hover:text-blue-700 hover:underline"
            >
              What's the current OEE for production line 3?
            </button>
          </li>
          <li>
            <button
              onClick={() => handleSampleQuestion("Show me the top 5 downtime reasons this week")}
              className="text-left hover:text-blue-700 hover:underline"
            >
              Show me the top 5 downtime reasons this week
            </button>
          </li>
          <li>
            <button
              onClick={() => handleSampleQuestion("When is the next scheduled maintenance for the injection molding machine?")}
              className="text-left hover:text-blue-700 hover:underline"
            >
              When is the next scheduled maintenance for the injection molding machine?
            </button>
          </li>
          <li>
            <button
              onClick={() => handleSampleQuestion("What's our quality reject rate trend for the past month?")}
              className="text-left hover:text-blue-700 hover:underline"
            >
              What's our quality reject rate trend for the past month?
            </button>
          </li>
          <li>
            <button
              onClick={() => handleSampleQuestion("Generate a Pareto chart of quality defects")}
              className="text-left hover:text-blue-700 hover:underline"
            >
              Generate a Pareto chart of quality defects
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Simple response generation function
function generateResponse(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('oee')) {
    return "The current OEE for production line 3 is 85%, which is above the target of 80%. The main contributors are improved availability and reduced minor stops.";
  }
  
  if (queryLower.includes('downtime') || queryLower.includes('reasons')) {
    return "Based on this week's data, the top 5 downtime reasons are: 1) Material changeover, 2) Equipment failure, 3) Operator breaks, 4) Quality inspections, and 5) Setup time.";
  }
  
  if (queryLower.includes('maintenance') || queryLower.includes('scheduled')) {
    return "The next scheduled maintenance for the injection molding machine is on Friday at 8:00 AM. It's a preventive maintenance with an estimated duration of 3 hours.";
  }
  
  if (queryLower.includes('quality') || queryLower.includes('reject')) {
    return "The quality reject rate trend shows a decrease from 2.7% to 1.9% over the past month, which is a positive improvement of approximately 30%.";
  }
  
  if (queryLower.includes('pareto') || queryLower.includes('chart')) {
    return "I've generated a Pareto chart of quality defects. The top issues are: Surface scratches (40%), Dimensional variance (25%), Color inconsistency (15%), Material contamination (12%), and Others (8%).";
  }
  
  return "I can help with manufacturing metrics like OEE, downtime analysis, maintenance schedules, quality data, and visualization. Please try asking about one of these topics.";
}