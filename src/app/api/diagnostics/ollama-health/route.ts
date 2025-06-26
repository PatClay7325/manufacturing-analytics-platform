import { NextRequest, NextResponse } from 'next/server';
import { managedFetch } from '@/lib/fetch-manager';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config } = await request.json();
  
  try {
    // Check Ollama API availability
    const healthResponse = await managedFetch(`${config.ollamaUrl}/api/tags`, {
      timeout: 5000,
    });
    
    if (!healthResponse.ok) {
      throw new Error(`Ollama API returned ${healthResponse.status}`);
    }
    
    const data = await healthResponse.json();
    
    // Test model availability
    const hasConfiguredModel = data.models?.some((m: any) => m.name === config.ollamaModel);
    
    // Try a simple generation test
    let generationTest = { success: false, responseTime: 0 };
    try {
      const genStart = Date.now();
      const genResponse = await managedFetch(`${config.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollamaModel,
          prompt: 'Hello',
          stream: false,
          options: { num_predict: 10 },
        }),
        timeout: 10000,
      });
      
      if (genResponse.ok) {
        generationTest = {
          success: true,
          responseTime: Date.now() - genStart,
        };
      }
    } catch (e) {
      // Generation test failed
    }
    
    return NextResponse.json({
      status: 'healthy',
      duration: Date.now() - startTime,
      details: {
        apiAvailable: true,
        modelsCount: data.models?.length || 0,
        models: data.models?.map((m: any) => m.name) || [],
        configuredModelAvailable: hasConfiguredModel,
        generationTest,
        totalModelSize: data.models?.reduce((sum: number, m: any) => sum + (m.size || 0), 0) || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        apiAvailable: false,
        hint: 'Check if Ollama container is running: docker ps | grep ollama',
      },
    });
  }
}