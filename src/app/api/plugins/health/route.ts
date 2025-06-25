import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'user-123';
    const organizationId = searchParams.get('organizationId') || undefined;

    // Get installed plugins
    const installations = await prisma.pluginInstallation.findMany({
      where: {
        OR: [
          { userId },
          { organizationId }
        ],
        enabled: true,
      },
      include: {
        plugin: true,
      },
    });

    // Get health status for each plugin
    const healthData: Record<string, any> = {};
    
    for (const installation of installations) {
      // Check if sandbox exists
      const sandbox = await prisma.pluginSandbox.findUnique({
        where: { pluginId: installation.plugin.pluginId },
      });

      if (sandbox) {
        healthData[installation.plugin.pluginId] = {
          status: sandbox.healthStatus,
          cpuUsage: sandbox.cpuUsage,
          memoryUsage: sandbox.memoryUsage,
          lastCheck: sandbox.lastHealthCheck,
          uptime: sandbox.startedAt ? 
            Date.now() - new Date(sandbox.startedAt).getTime() : 0,
        };
      } else {
        // Plugin is enabled but no sandbox (might be built-in)
        healthData[installation.plugin.pluginId] = {
          status: 'unknown',
          cpuUsage: 0,
          memoryUsage: 0,
          lastCheck: new Date(),
          uptime: 0,
        };
      }
    }

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Failed to fetch plugin health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plugin health' },
      { status: 500 }
    );
  }
}