import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config, customPrompt } = await request.json();
  
  const prompt = customPrompt || 'What is manufacturing OEE and how is it calculated? Provide a brief answer.';
  
  try {
    // Test basic inference
    const inferenceResponse = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
          num_ctx: config.contextWindow,
        },
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });
    
    if (!inferenceResponse.ok) {
      throw new Error(`Inference failed: ${inferenceResponse.status}`);
    }
    
    const result = await inferenceResponse.json();
    
    // Test chat format
    let chatTest = { success: false, responseTime: 0 };
    try {
      const chatStart = Date.now();
      const chatResponse = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollamaModel,
          messages: [
            { role: 'system', content: 'You are a manufacturing assistant.' },
            { role: 'user', content: 'List 3 key manufacturing metrics in bullet points.' },
          ],
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: 200,
          },
        }),
        signal: AbortSignal.timeout(20000),
      });
      
      if (chatResponse.ok) {
        const chatResult = await chatResponse.json();
        chatTest = {
          success: true,
          responseTime: Date.now() - chatStart,
          response: chatResult.message?.content || '',
        };
      }
    } catch (e) {
      // Chat test failed
    }
    
    // Calculate tokens per second
    const generationTime = result.total_duration / 1e9; // Convert nanoseconds to seconds
    const tokensPerSecond = result.eval_count / generationTime;
    
    return NextResponse.json({
      status: 'success',
      duration: Date.now() - startTime,
      inference: {
        model: result.model,
        response: result.response,
        promptTokens: result.prompt_eval_count,
        responseTokens: result.eval_count,
        totalDuration: Math.round(result.total_duration / 1e6), // Convert to ms
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
      },
      chatFormat: chatTest,
      modelInfo: {
        contextLength: result.context || config.contextWindow,
        modelLoaded: result.done,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check if the model is loaded: docker exec manufacturing-ollama ollama list',
    });
  }
}