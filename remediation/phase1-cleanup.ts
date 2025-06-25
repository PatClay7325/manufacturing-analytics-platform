#!/usr/bin/env ts-node
/**
 * Phase 1: Foundation Cleanup
 * This script performs comprehensive code cleanup and consolidation
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as glob from 'glob';

class CodeCleanup {
  private deadCodePatterns = [
    '**/*.backup',
    '**/*.backup.*',
    '**/*-old.*',
    '**/*-backup.*',
    '**/test-*.cmd',
    '**/src/app/api/chat/route-*.ts',
    '**/src/app/api/chat/*-route.ts',
    '**/*.bak'
  ];

  private duplicateRoutes = [
    'src/app/api/chat/enhanced-route.ts',
    'src/app/api/chat/fast-manufacturing/route.ts',
    'src/app/api/chat/intelligent/route.ts',
    'src/app/api/chat/manufacturing-agent/route.ts',
    'src/app/api/chat/manufacturing-demo/route.ts',
    'src/app/api/chat/ollama-direct/route.ts',
    'src/app/api/chat/ollama-legacy/route.ts',
    'src/app/api/chat/route-backup.ts',
    'src/app/api/chat/route-intelligent.ts',
    'src/app/api/chat/simple-stream/route.ts',
    'src/app/api/chat/stream-direct/route.ts',
    'src/app/api/chat/stream-with-fallback/route.ts',
    'src/app/api/chat/test-routing/route.ts',
    'src/app/api/chat/ultra-fast/route.ts'
  ];

  async cleanup() {
    console.log('🧹 Starting comprehensive code cleanup...\n');

    // Create archive directory
    const archiveDir = 'archive/cleanup-' + new Date().toISOString().split('T')[0];
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Archive dead code
    console.log('📦 Archiving dead code...');
    for (const pattern of this.deadCodePatterns) {
      const files = glob.sync(pattern, { ignore: ['node_modules/**', 'archive/**'] });
      for (const file of files) {
        const archivePath = path.join(archiveDir, file);
        const archiveFileDir = path.dirname(archivePath);
        
        if (!fs.existsSync(archiveFileDir)) {
          fs.mkdirSync(archiveFileDir, { recursive: true });
        }
        
        fs.renameSync(file, archivePath);
        console.log(`  Archived: ${file}`);
      }
    }

    // Remove duplicate chat routes
    console.log('\n🔄 Removing duplicate chat routes...');
    for (const route of this.duplicateRoutes) {
      if (fs.existsSync(route)) {
        const archivePath = path.join(archiveDir, route);
        const archiveFileDir = path.dirname(archivePath);
        
        if (!fs.existsSync(archiveFileDir)) {
          fs.mkdirSync(archiveFileDir, { recursive: true });
        }
        
        fs.renameSync(route, archivePath);
        console.log(`  Removed: ${route}`);
      }
    }

    // Create consolidated chat service
    console.log('\n📝 Creating consolidated chat service...');
    this.createConsolidatedChatService();

    // Update imports
    console.log('\n🔗 Updating imports...');
    this.updateImports();

    // Clean package.json
    console.log('\n📦 Cleaning package.json...');
    this.cleanPackageJson();

    console.log('\n✅ Code cleanup complete!');
    console.log(`📁 Archived files can be found in: ${archiveDir}`);
  }

  private createConsolidatedChatService() {
    const chatServiceContent = `import { ChatContext, ChatMode, ChatResponse } from '@/types/chat';
import { OllamaService } from './strategies/OllamaStrategy';
import { OpenAIService } from './strategies/OpenAIStrategy';
import { ManufacturingAgentService } from './strategies/ManufacturingAgentStrategy';

export interface ChatStrategy {
  process(message: string, context: ChatContext): Promise<ChatResponse>;
}

export class ChatService {
  private strategies: Map<ChatMode, ChatStrategy>;
  
  constructor() {
    this.strategies = new Map([
      ['standard', new OllamaService()],
      ['fast', new OpenAIService()],
      ['manufacturing', new ManufacturingAgentService()]
    ]);
  }
  
  async processMessage(
    message: string, 
    mode: ChatMode = 'standard',
    context?: ChatContext
  ): Promise<ChatResponse> {
    const strategy = this.strategies.get(mode);
    if (!strategy) {
      throw new Error(\`Unknown chat mode: \${mode}\`);
    }
    
    const enrichedContext = {
      ...context,
      timestamp: new Date(),
      mode,
      requestId: crypto.randomUUID()
    };
    
    try {
      return await strategy.process(message, enrichedContext);
    } catch (error) {
      console.error(\`Chat processing error in \${mode} mode:\`, error);
      throw error;
    }
  }
  
  getSupportedModes(): ChatMode[] {
    return Array.from(this.strategies.keys());
  }
}

export const chatService = new ChatService();
`;

    const chatServiceDir = 'src/services/chat';
    if (!fs.existsSync(chatServiceDir)) {
      fs.mkdirSync(chatServiceDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(chatServiceDir, 'ChatService.ts'),
      chatServiceContent
    );

    // Create single unified API route
    const unifiedRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat/ChatService';
import { validateRequest } from '@/middleware/validation';
import { rateLimiter } from '@/middleware/rateLimiter';
import { authenticate } from '@/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimiter.check(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Authentication
    const auth = await authenticate(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validation
    const body = await request.json();
    const validation = validateRequest(body, {
      message: 'string',
      mode: 'string?',
      context: 'object?'
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Process message
    const response = await chatService.processMessage(
      body.message,
      body.mode || 'standard',
      {
        ...body.context,
        user: auth.user
      }
    );
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
`;

    fs.writeFileSync(
      'src/app/api/chat/route.ts',
      unifiedRouteContent
    );
  }

  private updateImports() {
    // Update all files that import old chat routes
    const files = glob.sync('src/**/*.{ts,tsx}', { 
      ignore: ['node_modules/**', 'archive/**'] 
    });
    
    const importReplacements = [
      {
        pattern: /from ['"]@\/app\/api\/chat\/.*route['"];?/g,
        replacement: 'from \'@/services/chat/ChatService\';'
      },
      {
        pattern: /import.*manufacturingChatService.*from.*/g,
        replacement: 'import { chatService } from \'@/services/chat/ChatService\';'
      }
    ];
    
    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      for (const { pattern, replacement } of importReplacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`  Updated imports in: ${file}`);
      }
    }
  }

  private cleanPackageJson() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Remove duplicate or unnecessary dependencies
    const unnecessaryDeps = [
      '@grafana/data',
      '@grafana/ui',
      '@grafana/runtime',
      '@grafana/e2e-selectors',
      'msw'
    ];
    
    for (const dep of unnecessaryDeps) {
      delete packageJson.dependencies?.[dep];
      delete packageJson.devDependencies?.[dep];
    }
    
    // Remove duplicate scripts
    const scriptsToKeep = [
      'dev',
      'build',
      'start',
      'lint',
      'test',
      'test:unit',
      'test:integration',
      'test:e2e',
      'prisma:generate',
      'prisma:migrate',
      'prisma:seed'
    ];
    
    const newScripts: any = {};
    for (const script of scriptsToKeep) {
      if (packageJson.scripts[script]) {
        newScripts[script] = packageJson.scripts[script];
      }
    }
    packageJson.scripts = newScripts;
    
    fs.writeFileSync(
      'package.json',
      JSON.stringify(packageJson, null, 2)
    );
    
    // Run npm install to update lock file
    console.log('  Running npm install to update lock file...');
    execSync('npm install', { stdio: 'inherit' });
  }
}

// Run cleanup
const cleanup = new CodeCleanup();
cleanup.cleanup().catch(console.error);