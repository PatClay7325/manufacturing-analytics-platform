import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test Ollama connection
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'healthy',
        ollama: {
          available: true,
          models: data.models?.map((m: any) => m.name) || []
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Ollama not responding'
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Simple Ollama request
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma:2b',
        prompt: message,
        stream: false,
        options: {
          num_predict: 50,
          temperature: 0.7
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      response: data.response,
      model: data.model,
      done: data.done,
      total_duration: data.total_duration,
      load_duration: data.load_duration,
      prompt_eval_duration: data.prompt_eval_duration,
      eval_duration: data.eval_duration
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}