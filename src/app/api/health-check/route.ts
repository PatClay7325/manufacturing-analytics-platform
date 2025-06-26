import { NextRequest, NextResponse } from 'next/server';
import { managedFetch } from '@/lib/fetch-manager';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'operational',
      database: 'checking...',
      ollama: 'checking...'
      }
      };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'operational';
  } catch (error) {
    health.services.database = 'unavailable';
    health.status = 'degraded';
  }

  // Check Ollama connection
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const response = await managedFetch(`${ollamaUrl}/api/version`, {
      timeout: 2000 // 2 second timeout
    });
    
    if (response.ok) {
      health.services.ollama = 'operational';
    } else {
      health.services.ollama = 'unavailable';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.ollama = 'unavailable';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}