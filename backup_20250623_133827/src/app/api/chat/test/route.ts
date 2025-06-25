import { NextResponse } from 'next/server';

export async function GET() {
  // Check Ollama connectivity
  let ollamaStatus = 'Not connected';
  let ollamaModels: string[] = [];
  
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      ollamaStatus = 'Connected';
      ollamaModels = data.models?.map((m: any) => m.name) || [];
    }
  } catch (error) {
    ollamaStatus = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Return status information
  return NextResponse.json({
    status: 'Chat API Test Endpoint',
    ollama: {
      url: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      status: ollamaStatus,
      defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gemma:2b',
      availableModels: ollamaModels,
      streaming: process.env.OLLAMA_USE_STREAMING === 'true',
    },
    endpoints: {
      chat: '/api/chat',
      stream: '/api/chat/stream',
      test: '/api/chat/test',
    },
    troubleshooting: {
      step1: 'Ensure Ollama is running: ollama serve',
      step2: 'Install the model: ollama pull gemma:2b',
      step3: 'Test connection: curl http://localhost:11434/api/tags',
      step4: 'Check logs in browser console for errors',
    }
  });
}