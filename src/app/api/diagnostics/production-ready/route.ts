import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    database: { ready: false, message: '', details: {} },
    ollama: { ready: false, message: '', details: {} },
    environment: { ready: false, message: '', details: {} },
    dataIntegrity: { ready: false, message: '', details: {} },
  };

  // Check 1: Database Connection and Data
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    const [workUnits, metrics, alerts, users] = await Promise.all([
      prisma.workUnit.count(),
      prisma.metric.count(),
      prisma.alert.count(),
      prisma.user.count(),
    ]);
    
    const hasData = workUnits > 0 && metrics > 0;
    
    checks.database = {
      ready: hasData,
      message: hasData ? 'Database connected with live data' : 'Database connected but no data found',
      details: {
        workUnits,
        metrics,
        alerts,
        users,
        connectionString: process.env.DATABASE_URL ? 'Configured' : 'Missing',
      }
    };
  } catch (error) {
    checks.database = {
      ready: false,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check DATABASE_URL in environment variables'
      }
    };
  }

  // Check 2: Ollama Service
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/tags');
    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json();
      const hasModels = data.models && data.models.length > 0;
      
      checks.ollama = {
        ready: hasModels,
        message: hasModels ? 'Ollama service running with models' : 'Ollama running but no models found',
        details: {
          models: data.models?.map((m: any) => m.name) || [],
          apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
        }
      };
    } else {
      checks.ollama = {
        ready: false,
        message: 'Ollama service not responding',
        details: {
          status: ollamaResponse.status,
          statusText: ollamaResponse.statusText,
        }
      };
    }
  } catch (error) {
    checks.ollama = {
      ready: false,
      message: 'Cannot connect to Ollama service',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Ensure Ollama is running on http://localhost:11434'
      }
    };
  }

  // Check 3: Environment Configuration
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  checks.environment = {
    ready: missingEnvVars.length === 0,
    message: missingEnvVars.length === 0 
      ? 'All required environment variables configured' 
      : `Missing ${missingEnvVars.length} required environment variables`,
    details: {
      missing: missingEnvVars,
      nodeEnv: process.env.NODE_ENV,
      mocksDisabled: process.env.NEXT_PUBLIC_DISABLE_MOCKS === 'true',
    }
  };

  // Check 4: Data Integrity
  try {
    // Check for recent metrics (last 24 hours)
    const recentMetrics = await prisma.metric.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Check for active equipment
    const activeEquipment = await prisma.workUnit.count({
      where: {
        status: 'OPERATIONAL'
      }
    });
    
    const hasRecentData = recentMetrics > 0;
    const hasActiveEquipment = activeEquipment > 0;
    
    checks.dataIntegrity = {
      ready: hasRecentData && hasActiveEquipment,
      message: hasRecentData && hasActiveEquipment
        ? 'System has recent data and active equipment'
        : 'System needs more recent data or active equipment',
      details: {
        recentMetrics,
        activeEquipment,
        lastMetricTime: await prisma.metric.findFirst({
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        }).then(m => m?.timestamp || null),
      }
    };
  } catch (error) {
    checks.dataIntegrity = {
      ready: false,
      message: 'Unable to verify data integrity',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  // Overall status
  const allReady = Object.values(checks).every(check => check.ready);
  
  return NextResponse.json({
    productionReady: allReady,
    timestamp: new Date().toISOString(),
    checks,
    recommendations: getRecommendations(checks),
  });
}

function getRecommendations(checks: any): string[] {
  const recommendations = [];
  
  if (!checks.database.ready) {
    if (checks.database.details.workUnits === 0) {
      recommendations.push('Run database seed script to populate initial data');
    }
    if (!checks.database.details.connectionString) {
      recommendations.push('Configure DATABASE_URL in environment variables');
    }
  }
  
  if (!checks.ollama.ready) {
    if (checks.ollama.details.models.length === 0) {
      recommendations.push('Pull required Ollama models (e.g., ollama pull gemma:2b)');
    } else {
      recommendations.push('Start Ollama service with: docker-compose up ollama');
    }
  }
  
  if (!checks.environment.ready) {
    recommendations.push(`Set missing environment variables: ${checks.environment.details.missing.join(', ')}`);
  }
  
  if (!checks.dataIntegrity.ready) {
    if (checks.dataIntegrity.details.recentMetrics === 0) {
      recommendations.push('Generate or import recent metric data');
    }
    if (checks.dataIntegrity.details.activeEquipment === 0) {
      recommendations.push('Create or activate equipment in the system');
    }
  }
  
  if (process.env.NODE_ENV !== 'production') {
    recommendations.push('Set NODE_ENV=production for production deployment');
  }
  
  if (process.env.NEXT_PUBLIC_DISABLE_MOCKS !== 'true') {
    recommendations.push('Set NEXT_PUBLIC_DISABLE_MOCKS=true to ensure live data usage');
  }
  
  return recommendations;
}