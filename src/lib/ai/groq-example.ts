/**
 * Example usage of the Groq Cloud API client
 * Demonstrates various features and use cases
 */

import { groqClient, createGroqClient, GroqClient } from './groq-client';

// Example 1: Simple streaming completion
async function exampleStreaming() {
  console.log('Example 1: Simple Streaming');
  
  const messages = [
    { role: 'system', content: 'You are a helpful manufacturing assistant.' },
    { role: 'user', content: 'What are the key metrics for OEE calculation?' }
  ];

  try {
    const stream = await groqClient.streamCompletion(messages, {
      modelType: 'simple', // Use fast model for simple queries
      temperature: 0.7,
      maxTokens: 500,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
    console.log('\n\nComplete response:', fullResponse);
  } catch (error) {
    console.error('Streaming error:', error);
  }
}

// Example 2: Non-streaming completion with model routing
async function exampleModelRouting() {
  console.log('\nExample 2: Model Routing');
  
  // Simple query - will use fast model
  const simpleQuery = [
    { role: 'user', content: 'What is the current machine status?' }
  ];
  
  // Complex query - will use more capable model
  const complexQuery = [
    { role: 'user', content: `Analyze the following production data and provide insights on optimization opportunities:
    - Line A: OEE 72%, Availability 85%, Performance 90%, Quality 94%
    - Line B: OEE 68%, Availability 80%, Performance 88%, Quality 96%
    - Line C: OEE 75%, Availability 88%, Performance 87%, Quality 98%
    
    Consider factors like bottlenecks, maintenance schedules, and quality improvements.` }
  ];

  try {
    // Simple query
    const simpleResult = await groqClient.routeCompletion(simpleQuery, {
      stream: false,
      temperature: 0.5,
    });
    console.log('Simple query result:', simpleResult);

    // Complex query
    const complexResult = await groqClient.routeCompletion(complexQuery, {
      stream: false,
      temperature: 0.8,
      maxTokens: 1000,
    });
    console.log('\nComplex query result:', complexResult);
  } catch (error) {
    console.error('Model routing error:', error);
  }
}

// Example 3: Batch processing
async function exampleBatchProcessing() {
  console.log('\nExample 3: Batch Processing');
  
  const requests = [
    {
      messages: [
        { role: 'user', content: 'Calculate OEE for: Availability 90%, Performance 85%, Quality 98%' }
      ],
      options: { modelType: 'simple' as const }
    },
    {
      messages: [
        { role: 'user', content: 'What are common causes of availability loss in manufacturing?' }
      ],
      options: { modelType: 'simple' as const }
    },
    {
      messages: [
        { role: 'user', content: 'Explain the difference between MTBF and MTTR' }
      ],
      options: { modelType: 'simple' as const }
    }
  ];

  try {
    const results = await groqClient.batchCompletions(requests, {
      batchSize: 3,
      onProgress: (completed, total) => {
        console.log(`Progress: ${completed}/${total}`);
      }
    });

    results.forEach((result, index) => {
      console.log(`\nBatch result ${index + 1}:`, result.choices[0].message.content);
    });
  } catch (error) {
    console.error('Batch processing error:', error);
  }
}

// Example 4: Custom client with fallback
async function exampleWithFallback() {
  console.log('\nExample 4: Custom Client with Fallback');
  
  // Create primary client
  const primaryClient = createGroqClient({
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 2,
    timeout: 5000, // 5 second timeout
  });

  // Create fallback client with different configuration
  const fallbackClient = createGroqClient({
    apiKey: process.env.GROQ_API_KEY_BACKUP || process.env.GROQ_API_KEY,
    model: 'llama-3.2-3b-preview', // Use smaller model as fallback
    maxRetries: 1,
    timeout: 10000, // 10 second timeout
  });

  const messages = [
    { role: 'user', content: 'What is predictive maintenance?' }
  ];

  try {
    // Try primary client first
    try {
      const response = await primaryClient.getCompletion(messages, {
        maxTokens: 200,
      });
      console.log('Primary client response:', response.choices[0].message.content);
    } catch (primaryError) {
      console.log('Primary client failed, using fallback...');
      const response = await fallbackClient.getCompletion(messages, {
        maxTokens: 200,
      });
      console.log('Fallback client response:', response.choices[0].message.content);
    }
  } catch (error) {
    console.error('Both clients failed:', error);
  }
}

// Example 5: Real-time streaming with progress tracking
async function exampleStreamingWithProgress() {
  console.log('\nExample 5: Streaming with Progress Tracking');
  
  const messages = [
    { role: 'system', content: 'You are an expert in manufacturing analytics.' },
    { role: 'user', content: 'Explain how to implement a real-time OEE monitoring system with alerting capabilities.' }
  ];

  let tokenCount = 0;
  let firstTokenTime: number | null = null;
  const startTime = Date.now();

  try {
    const stream = await groqClient.streamCompletion(messages, {
      modelType: 'complex',
      temperature: 0.7,
      maxTokens: 1000,
      onChunk: (chunk) => {
        tokenCount++;
        if (firstTokenTime === null && chunk.choices[0]?.delta?.content) {
          firstTokenTime = Date.now() - startTime;
          console.log(`\nFirst token received in ${firstTokenTime}ms`);
        }
      }
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      // Update UI or progress bar here
    }

    const totalTime = Date.now() - startTime;
    const tokensPerSecond = (tokenCount / totalTime) * 1000;
    
    console.log(`\nStreaming complete:`);
    console.log(`- Total tokens: ${tokenCount}`);
    console.log(`- Total time: ${totalTime}ms`);
    console.log(`- Tokens/second: ${tokensPerSecond.toFixed(0)}`);
    console.log(`- First token latency: ${firstTokenTime}ms`);
    console.log(`\nResponse: ${fullResponse}`);
  } catch (error) {
    console.error('Streaming with progress error:', error);
  }
}

// Example 6: Health check and monitoring
async function exampleHealthCheck() {
  console.log('\nExample 6: Health Check and Monitoring');
  
  try {
    const health = await groqClient.healthCheck();
    console.log('Groq API Health:', health);
    
    if (health.status === 'healthy') {
      console.log(`✅ API is healthy (latency: ${health.latency}ms)`);
    } else {
      console.log(`❌ API is unhealthy: ${health.error}`);
    }
  } catch (error) {
    console.error('Health check error:', error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Groq Cloud API Client Examples\n');
  
  await exampleStreaming();
  await exampleModelRouting();
  await exampleBatchProcessing();
  await exampleWithFallback();
  await exampleStreamingWithProgress();
  await exampleHealthCheck();
  
  console.log('\n✨ All examples completed!');
}

// Export individual examples for testing
export {
  exampleStreaming,
  exampleModelRouting,
  exampleBatchProcessing,
  exampleWithFallback,
  exampleStreamingWithProgress,
  exampleHealthCheck,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}