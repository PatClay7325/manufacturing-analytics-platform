/**
 * Consolidated Diagnostics API
 * Single endpoint for all system health checks and diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { managedFetch } from '@/lib/fetch-manager';
import { prisma } from '@/lib/database';
import { config } from '@/config';
import os from 'os';

interface DiagnosticCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: any;
  responseTime?: number;
}

interface DiagnosticsResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: DiagnosticCheck[];
  system?: {
    hostname: string;
    platform: string;
    cpuUsage: number;
    memoryUsage: {
      total: string;
      used: string;
      percentage: number;
    };
    uptime: string;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const check = searchParams.get('check');
  const verbose = searchParams.get('verbose') === 'true';

  const checks: DiagnosticCheck[] = [];
  
  // Database check
  if (!check || check === 'database') {
    const dbCheck = await checkDatabase();
    checks.push(dbCheck);
  }

  // Ollama check
  if (!check || check === 'ollama') {
    const ollamaCheck = await checkOllama();
    checks.push(ollamaCheck);
  }

  // Cache check (if Redis is configured)
  if (!check || check === 'cache') {
    const cacheCheck = await checkCache();
    checks.push(cacheCheck);
  }

  // Application health
  if (!check || check === 'app') {
    const appCheck = await checkApplication();
    checks.push(appCheck);
  }

  // Determine overall status
  const overallStatus = checks.some(c => c.status === 'unhealthy') 
    ? 'unhealthy' 
    : checks.some(c => c.status === 'degraded') 
      ? 'degraded' 
      : 'healthy';

  const response: DiagnosticsResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
      };

  // Add system info if verbose
  if (verbose) {
    response.system = {
      hostname: os.hostname(),
      platform: os.platform(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: {
        total: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
        used: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)}MB`,
        percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      uptime: `${Math.round(os.uptime() / 60)} minutes`
      };
  }

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503;
  
  return NextResponse.json(response, { status: statusCode });
}

async function checkDatabase(): Promise<DiagnosticCheck> {
  const start = Date.now();
  
  try {
    // Simple connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    // Check table accessibility
    const [equipmentCount, metricsCount, alertsCount] = await Promise.all([
      prisma.equipment.count(),
      prisma.metric.count({ take: 1 }), // Limit for performance
      prisma.alert.count({ where: { status: 'active' } }),
    ]);

    const responseTime = Date.now() - start;

    return {
      name: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      details: {
        equipment: equipmentCount,
        metrics: metricsCount > 0 ? 'available' : 'empty',
        activeAlerts: alertsCount
      },
      responseTime
      };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
      responseTime: Date.now() - start
      };
  }
}

async function checkOllama(): Promise<DiagnosticCheck> {
  const start = Date.now();
  
  try {
    const response = await managedFetch(`${config.ai.ollamaUrl}/api/version`, {
      , // 5 second timeout
    timeout: 5000
      });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - start;

    // Check if model is available
    const modelsResponse = await fetch(`${config.ai.ollamaUrl}/api/tags`);
    const models = modelsResponse.ok ? await modelsResponse.json() : null;
    const hasModel = models?.models?.some((m: any) => m.name.includes(config.ai.ollamaModel));

    return {
      name: 'ollama',
      status: hasModel ? 'healthy' : 'degraded',
      message: hasModel ? 'Ollama service operational' : `Model ${config.ai.ollamaModel} not found`,
      details: {
        version: data.version,
        model: config.ai.ollamaModel,
        available: hasModel
      },
      responseTime
      };
  } catch (error) {
    return {
      name: 'ollama',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Ollama service unavailable',
      responseTime: Date.now() - start
      };
  }
}

async function checkCache(): Promise<DiagnosticCheck> {
  // Placeholder for Redis/cache check
  // Would check Redis connection if configured
  
  return {
    name: 'cache',
    status: 'healthy',
    message: 'Cache not configured (using in-memory)'
      };
}

async function checkApplication(): Promise<DiagnosticCheck> {
  const start = Date.now();
  
  try {
    // Check critical application components
    const checks = {
      config: !!config,
      environment: config.app.env,
      features: {
        aiChat: config.features.aiChat,
        websocket: config.features.websocket
      }
      };

    return {
      name: 'application',
      status: 'healthy',
      message: 'Application running normally',
      details: checks,
      responseTime: Date.now() - start
      };
  } catch (error) {
    return {
      name: 'application',
      status: 'unhealthy',
      message: 'Application configuration error',
      responseTime: Date.now() - start
      };
  }
}