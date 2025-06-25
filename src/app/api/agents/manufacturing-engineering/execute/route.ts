import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { ManufacturingEngineeringAgent } from '@/lib/agents/ManufacturingEngineeringAgent';

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    // Initialize the agent
    const agent = new ManufacturingEngineeringAgent();

    // Execute the query
    const result = await agent.execute(query, context);

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        confidence: result.confidence,
        insights: result.insights || [],
        visualizations: result.visualizations || [],
        references: result.references || [],
        analysisType: result.analysisType,
        executionTime: result.executionTime,
        dataPoints: result.dataPoints
      }
    });

  } catch (error) {
    console.error('Manufacturing Engineering Agent error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Agent execution failed' 
      },
      { status: 500 }
    );
  }
}