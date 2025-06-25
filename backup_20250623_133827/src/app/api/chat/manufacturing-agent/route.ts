import { NextRequest } from 'next/server';
import { manufacturingAgent } from '@/lib/agents/ManufacturingEngineeringAgent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const lastMessage = messages[messages.length - 1]?.content || '';
        
        // Send initial processing thought
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'reasoning',
            title: 'Manufacturing Engineering Agent',
            body: 'Analyzing your query using ISO-compliant manufacturing intelligence...'
          }]
        })}\n\n`));
        
        // Execute the Manufacturing Engineering Agent
        const agentResponse = await manufacturingAgent.execute(lastMessage, {
          messages,
          sessionId: body.sessionId
        });
        
        // Send execution insights
        if (agentResponse.dataPoints > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'insight',
              title: 'Data Analysis Complete',
              body: `Analyzed ${agentResponse.dataPoints} data points in ${agentResponse.executionTime}ms with ${(agentResponse.confidence * 100).toFixed(0)}% confidence`
            }]
          })}\n\n`));
        }
        
        // Stream the content
        const words = agentResponse.content.split(' ');
        let buffer = '';
        
        for (let i = 0; i < words.length; i++) {
          buffer += words[i] + ' ';
          
          // Send chunks of 5 words at a time for smooth streaming
          if ((i + 1) % 5 === 0 || i === words.length - 1) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              content: buffer
            })}\n\n`));
            buffer = '';
            
            // Small delay for natural streaming effect
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        
        // Send visualizations if any
        if (agentResponse.visualizations && agentResponse.visualizations.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            thoughts: [{
              type: 'insight',
              title: 'Visualizations Available',
              body: `Generated ${agentResponse.visualizations.length} visualization(s): ${agentResponse.visualizations.map(v => v.title).join(', ')}`
            }],
            visualizations: agentResponse.visualizations
          })}\n\n`));
        }
        
        // Send references
        if (agentResponse.references && agentResponse.references.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            references: agentResponse.references
          })}\n\n`));
        }
        
        // Send completion
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
      } catch (error) {
        console.error('Manufacturing Agent error:', error);
        
        // Send error as thought
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          thoughts: [{
            type: 'critique',
            title: 'Analysis Error',
            body: error instanceof Error ? error.message : 'Unknown error occurred'
          }]
        })}\n\n`));
        
        // Send error message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          content: `I encountered an error while analyzing your manufacturing data. Please ensure the database is connected and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })}\n\n`));
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}