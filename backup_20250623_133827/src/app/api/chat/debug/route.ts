import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'not set',
      OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL || 'not set',
    },
    tests: {}
  };

  // Test 1: Check Ollama connection
  try {
    const tagsResponse = await fetch('http://127.0.0.1:11434/api/tags');
    results.tests.ollamaConnection = {
      status: tagsResponse.status,
      ok: tagsResponse.ok,
      statusText: tagsResponse.statusText
    };
    
    if (tagsResponse.ok) {
      const data = await tagsResponse.json();
      results.tests.models = data.models || [];
    }
  } catch (error) {
    results.tests.ollamaConnection = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 2: Try a simple chat
  try {
    const chatResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        messages: [{ role: 'user', content: 'test' }],
        stream: false
      })
    });
    
    results.tests.chatEndpoint = {
      status: chatResponse.status,
      ok: chatResponse.ok,
      statusText: chatResponse.statusText
    };
    
    if (chatResponse.ok) {
      const data = await chatResponse.json();
      results.tests.chatResponse = {
        hasMessage: !!data.message,
        messageLength: data.message?.content?.length || 0
      };
    }
  } catch (error) {
    results.tests.chatEndpoint = {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 3: Check alternative endpoints
  const endpoints = [
    '/api/generate',
    '/api/chat',
    '/v1/chat/completions'
  ];
  
  results.tests.endpoints = {};
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://127.0.0.1:11434${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma:2b',
          messages: [{ role: 'user', content: 'test' }],
          prompt: 'test',
          stream: false
        })
      });
      
      results.tests.endpoints[endpoint] = {
        status: response.status,
        ok: response.ok
      };
    } catch (error) {
      results.tests.endpoints[endpoint] = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}