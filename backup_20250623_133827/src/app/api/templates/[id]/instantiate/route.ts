/**
 * Template Instantiation API Route
 * Handles creating dashboards from templates with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  TemplateImportRequest,
  TemplateInstantiationResult,
  TemplateCustomization
} from '@/types/template';
import { Dashboard } from '@/types/dashboard';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/templates/[id]/instantiate - Create dashboard from template
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body: TemplateImportRequest = await request.json();
    const { variables, customizations, targetFolderId, dashboardTitle } = body;

    // Get template
    const template = await prisma.dashboardTemplate.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is accessible (public or user has access)
    if (!template.isPublic) {
      // Add authorization check here if needed
      // For now, assume all non-public templates require proper authorization
    }

    // Process template configuration
    const processedConfig = await processTemplateConfig(
      template.config as Dashboard,
      variables || {},
      customizations || []
    );

    // Generate unique UID for new dashboard
    const dashboardUid = generateDashboardUid();
    
    // Create dashboard
    const dashboard = await prisma.dashboard.create({
      data: {
        uid: dashboardUid,
        title: dashboardTitle || template.title,
        description: `Created from template: ${template.name}`,
        tags: [...(template.tags || []), 'template-generated'],
        folderId: targetFolderId,
        config: processedConfig,
        schemaVersion: template.schemaVersion,
        version: 1,
        isPublic: false,
        authorId: body.userId || template.authorId, // Should come from auth context
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Record template usage
    await prisma.templateUsage.create({
      data: {
        templateId: template.id,
        userId: body.userId || template.authorId, // Should come from auth context
        usageType: 'create_dashboard',
        dashboardId: dashboard.id,
        dashboardUid: dashboard.uid,
        variables: variables || {},
        customizations: customizations || {},
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIP(request),
        sessionId: body.sessionId
      }
    });

    // Increment download count
    await prisma.dashboardTemplate.update({
      where: { id: template.id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });

    const result: TemplateInstantiationResult = {
      dashboardId: dashboard.id,
      dashboardUid: dashboard.uid,
      dashboardUrl: `/d/${dashboard.uid}`,
      warnings: [], // Could include warnings about missing variables, etc.
      errors: []
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Template instantiation error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard from template' },
      { status: 500 }
    );
  }
}

// Helper function to process template configuration
async function processTemplateConfig(
  templateConfig: Dashboard,
  variables: Record<string, any>,
  customizations: TemplateCustomization[]
): Promise<Dashboard> {
  // Clone the template config
  let processedConfig = JSON.parse(JSON.stringify(templateConfig));

  // Apply variable substitutions
  processedConfig = substituteVariables(processedConfig, variables);

  // Apply customizations
  for (const customization of customizations) {
    applyCustomization(processedConfig, customization);
  }

  // Generate new panel IDs to avoid conflicts
  if (processedConfig.panels) {
    processedConfig.panels = processedConfig.panels.map((panel: any, index: number) => ({
      ...panel,
      id: index + 1 // Simple ID assignment, could be more sophisticated
    }));
  }

  return processedConfig;
}

// Helper function to substitute variables in template
function substituteVariables(config: any, variables: Record<string, any>): any {
  const configStr = JSON.stringify(config);
  
  // Replace variable placeholders like ${variable_name}
  let processedStr = configStr;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    processedStr = processedStr.replace(regex, String(value));
  }
  
  // Replace template variable references like $variable_name
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\$${key}\\b`, 'g');
    processedStr = processedStr.replace(regex, String(value));
  }

  return JSON.parse(processedStr);
}

// Helper function to apply customizations
function applyCustomization(config: any, customization: TemplateCustomization) {
  const { panelId, property, value } = customization;
  
  if (config.panels) {
    const panel = config.panels.find((p: any) => p.id === panelId);
    if (panel) {
      // Apply property using dot notation path
      setPropertyByPath(panel, property, value);
    }
  }
}

// Helper function to set property by dot notation path
function setPropertyByPath(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Helper function to generate unique dashboard UID
function generateDashboardUid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}