import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'user-123';
    const organizationId = searchParams.get('organizationId') || undefined;

    const installations = await prisma.pluginInstallation.findMany({
      where: {
        OR: [
          { userId },
          { organizationId }
        ],
      },
      include: {
        plugin: true,
        version: true,
        configuration: true,
      },
      orderBy: {
        installedAt: 'desc',
      },
    });

    // Transform to match expected format
    const installedPlugins = installations.map(installation => ({
      id: installation.id,
      pluginId: installation.plugin.pluginId,
      name: installation.plugin.name,
      description: installation.plugin.description,
      type: installation.plugin.type,
      version: installation.version.version,
      latestVersion: installation.plugin.latestVersion,
      author: installation.plugin.author,
      enabled: installation.enabled,
      status: installation.status,
      errorMessage: installation.errorMessage,
      installPath: installation.installPath,
      installedAt: installation.installedAt,
      lastUsedAt: installation.lastUsedAt,
      usageCount: installation.usageCount,
      updateAvailable: installation.updateAvailable,
      autoUpdate: installation.autoUpdate,
      signature: installation.plugin.signature,
      configuration: installation.configuration,
    }));

    return NextResponse.json(installedPlugins);
  } catch (error) {
    console.error('Failed to fetch installed plugins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch installed plugins' },
      { status: 500 }
    );
  }
}