import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config } = await request.json();
  
  try {
    // Test streaming with a simple prompt
    const streamResponse = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: 'Count from 1 to 5 slowly.',
        stream: true,
        options: {
          temperature: 0.1,
          num_predict: 50,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    
    if (!streamResponse.ok) {
      throw new Error(`Streaming failed: ${streamResponse.status}`);
    }
    
    // Read stream
    const reader = streamResponse.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let chunks = [];
    let totalTokens = 0;
    let firstTokenTime = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            chunks.push(data.response);
            totalTokens++;
            
            if (firstTokenTime === 0) {
              firstTokenTime = Date.now() - startTime;
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'success',
      duration: totalTime,
      streaming: {
        chunksReceived: chunks.length,
        fullResponse: chunks.join(''),
        firstTokenLatency: firstTokenTime,
        totalTokens: totalTokens,
        tokensPerSecond: (totalTokens / (totalTime / 1000)).toFixed(1),
      },
      performance: {
        streamingOverhead: firstTokenTime,
        averageChunkSize: chunks.length > 0 ? 
          chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}