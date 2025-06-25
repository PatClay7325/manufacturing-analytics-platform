/**
 * Plugin Validator - Validates plugin manifests and code
 */

import { z } from 'zod';
import { PluginType } from './types';

// Plugin manifest schema
const pluginManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Plugin ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(PluginType),
  version: z.string().regex(/^\d+\.\d+\.\d+(-\w+)?$/, 'Version must follow semantic versioning'),
  
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  
  description: z.string().min(10).max(500),
  keywords: z.array(z.string()).optional(),
  
  dependencies: z.record(z.string()).optional(),
  analyticsVersion: z.string().optional(),
  
  main: z.string(),
  module: z.string().optional(),
  
  includes: z.array(z.object({
    type: z.string(),
    path: z.string(),
    name: z.string(),
    component: z.string().optional(),
    role: z.string().optional(),
  })).optional(),
  
  info: z.object({
    logos: z.object({
      small: z.string(),
      large: z.string(),
    }),
    screenshots: z.array(z.object({
      path: z.string(),
      name: z.string(),
    })).optional(),
    links: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
    })).optional(),
  }),
  
  routes: z.array(z.object({
    path: z.string(),
    method: z.string(),
    reqRole: z.string().optional(),
  })).optional(),
  
  permissions: z.array(z.string()).optional(),
  
  // Panel-specific fields
  skipDataQuery: z.boolean().optional(),
  hideFromList: z.boolean().optional(),
  sort: z.number().optional(),
  
  // DataSource-specific fields
  annotations: z.boolean().optional(),
  metrics: z.boolean().optional(),
  alerting: z.boolean().optional(),
  explore: z.boolean().optional(),
  logs: z.boolean().optional(),
  tracing: z.boolean().optional(),
  streaming: z.boolean().optional(),
  
  queryOptions: z.object({
    maxDataPoints: z.boolean().optional(),
    minInterval: z.boolean().optional(),
    cacheTimeout: z.boolean().optional(),
  }).optional(),
  
  // App-specific fields
  preload: z.boolean().optional(),
  backend: z.boolean().optional(),
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityCheckResult {
  safe: boolean;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  location?: string;
}

/**
 * Validate plugin manifest
 */
export function validatePluginManifest(manifest: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse and validate manifest
    pluginManifestSchema.parse(manifest);

    // Additional validations
    if (manifest.type === PluginType.Panel && !manifest.skipDataQuery && !manifest.module) {
      warnings.push('Panel plugins should specify a module path');
    }

    if (manifest.type === PluginType.DataSource && !manifest.annotations) {
      warnings.push('DataSource plugins should specify annotation support');
    }

    // Check for required files
    const requiredFiles = ['README.md', 'CHANGELOG.md'];
    if (manifest.includes) {
      const includedFiles = manifest.includes.map((i: any) => i.path);
      for (const required of requiredFiles) {
        if (!includedFiles.includes(required)) {
          warnings.push(`Missing recommended file: ${required}`);
        }
      }
    }

    // Version compatibility check
    if (manifest.analyticsVersion) {
      const versionRegex = /^(\d+)\.(\d+)\.x$/;
      const match = manifest.analyticsVersion.match(versionRegex);
      if (!match) {
        errors.push('analyticsVersion must be in format "x.y.x" (e.g., "9.0.x")');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    } else {
      errors.push(String(error));
    }

    return {
      valid: false,
      errors,
      warnings
    };
  }
}

/**
 * Validate plugin code for security issues
 */
export async function validatePluginCode(code: string): Promise<SecurityCheckResult> {
  const issues: SecurityIssue[] = [];

  // Check for dangerous patterns
  const dangerousPatterns = [
    {
      pattern: /eval\s*\(/g,
      severity: 'critical' as const,
      message: 'Use of eval() is not allowed'
    },
    {
      pattern: /new\s+Function\s*\(/g,
      severity: 'critical' as const,
      message: 'Dynamic function creation is not allowed'
    },
    {
      pattern: /document\s*\.\s*write/g,
      severity: 'high' as const,
      message: 'document.write() is not allowed'
    },
    {
      pattern: /innerHTML\s*=/g,
      severity: 'high' as const,
      message: 'Direct innerHTML assignment is not allowed, use safe DOM methods'
    },
    {
      pattern: /window\s*\.\s*location\s*\.\s*href\s*=/g,
      severity: 'medium' as const,
      message: 'Direct location changes should be avoided'
    },
    {
      pattern: /__proto__/g,
      severity: 'high' as const,
      message: 'Prototype pollution attempt detected'
    },
    {
      pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/g,
      severity: 'critical' as const,
      message: 'Access to child_process is not allowed'
    },
    {
      pattern: /require\s*\(\s*['"`]fs['"`]\s*\)/g,
      severity: 'critical' as const,
      message: 'Direct filesystem access is not allowed'
    },
    {
      pattern: /process\s*\.\s*env/g,
      severity: 'medium' as const,
      message: 'Access to process.env should be limited'
    },
    {
      pattern: /import\s*\(\s*[^'"]/g,
      severity: 'medium' as const,
      message: 'Dynamic imports with variables are potentially unsafe'
    }
  ];

  // Check each pattern
  for (const { pattern, severity, message } of dangerousPatterns) {
    const matches = code.matchAll(pattern);
    for (const match of matches) {
      issues.push({
        severity,
        type: 'security',
        message,
        location: `Character ${match.index}`
      });
    }
  }

  // Check for suspicious network requests
  const networkPatterns = [
    /fetch\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/g,
    /XMLHttpRequest|xhr/gi,
    /WebSocket\s*\(/g
  ];

  for (const pattern of networkPatterns) {
    if (pattern.test(code)) {
      issues.push({
        severity: 'low',
        type: 'network',
        message: 'External network requests detected - ensure they are to allowed hosts'
      });
    }
  }

  // Check for large code size
  if (code.length > 1000000) { // 1MB
    issues.push({
      severity: 'medium',
      type: 'performance',
      message: 'Plugin code is very large, consider splitting into modules'
    });
  }

  // Check for obfuscated code
  if (isLikelyObfuscated(code)) {
    issues.push({
      severity: 'high',
      type: 'security',
      message: 'Code appears to be obfuscated, which is not allowed for security reasons'
    });
  }

  return {
    safe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues
  };
}

/**
 * Check if code is likely obfuscated
 */
function isLikelyObfuscated(code: string): boolean {
  // Simple heuristics for obfuscation detection
  const lines = code.split('\n');
  const avgLineLength = code.length / lines.length;
  
  // Check for extremely long lines (common in obfuscated code)
  if (avgLineLength > 500) return true;
  
  // Check for excessive use of hex/unicode escapes
  const hexEscapes = (code.match(/\\x[0-9a-f]{2}/gi) || []).length;
  const unicodeEscapes = (code.match(/\\u[0-9a-f]{4}/gi) || []).length;
  if (hexEscapes + unicodeEscapes > code.length / 100) return true;
  
  // Check for excessive single-letter variables
  const singleLetterVars = (code.match(/\b[a-z]\b/g) || []).length;
  if (singleLetterVars > code.length / 50) return true;
  
  // Check for base64 encoded strings
  const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g;
  const base64Matches = code.match(base64Pattern) || [];
  if (base64Matches.length > 5) return true;
  
  return false;
}

/**
 * Validate plugin compatibility
 */
export function validatePluginCompatibility(
  manifest: any,
  analyticsVersion: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.analyticsVersion) {
    const required = manifest.analyticsVersion;
    const current = analyticsVersion;
    
    // Simple version comparison (could be enhanced)
    const requiredMajor = parseInt(required.split('.')[0]);
    const currentMajor = parseInt(current.split('.')[0]);
    
    if (requiredMajor > currentMajor) {
      errors.push(`Plugin requires AnalyticsPlatform ${required} but current version is ${current}`);
    } else if (requiredMajor < currentMajor - 1) {
      warnings.push(`Plugin was built for AnalyticsPlatform ${required}, compatibility issues may occur with ${current}`);
    }
  }

  // Check dependencies
  if (manifest.dependencies) {
    for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
      // In real implementation, would check if dependency is installed
      warnings.push(`Dependency required: ${depId}@${depVersion}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate plugin permissions
 */
export function validatePluginPermissions(
  manifest: any,
  requestedPermissions: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowedPermissions = manifest.permissions || [];
  
  for (const permission of requestedPermissions) {
    if (!allowedPermissions.includes(permission)) {
      errors.push(`Plugin does not have permission: ${permission}`);
    }
  }

  // Check for excessive permissions
  const dangerousPermissions = ['admin', 'write:all', 'delete:all'];
  for (const perm of allowedPermissions) {
    if (dangerousPermissions.includes(perm)) {
      warnings.push(`Plugin requests dangerous permission: ${perm}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}