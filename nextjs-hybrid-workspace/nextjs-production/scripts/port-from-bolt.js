#!/usr/bin/env node

/**
 * Port components and features from bolt.diy to Next.js
 * This script automates the conversion of Remix patterns to Next.js App Router
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BoltToNextJSPorter {
  constructor() {
    this.boltPath = process.env.BOLT_DIY_PATH || '/mnt/c/Users/pclay/bolt.diy';
    this.nextjsPath = process.cwd();
    this.conversions = new Map();
    this.setupConversions();
  }

  setupConversions() {
    // Common pattern conversions from Remix to Next.js
    this.conversions.set(
      /import.*from ['"]@remix-run\/react['"];?/g,
      "import { useRouter, usePathname, useSearchParams } from 'next/navigation';"
    );
    
    this.conversions.set(
      /import.*from ['"]@remix-run\/cloudflare['"];?/g,
      "// Removed Cloudflare-specific imports - use Next.js APIs instead"
    );
    
    this.conversions.set(
      /export async function loader\s*\(/g,
      "// Converted to Next.js: Use async function in page component or separate API route"
    );
    
    this.conversions.set(
      /export async function action\s*\(/g,
      "// Converted to Next.js: Use Server Actions or API routes"
    );
    
    this.conversions.set(
      /useLoaderData\s*\(\s*\)/g,
      "// Use Next.js data fetching in component"
    );
    
    this.conversions.set(
      /Form\s+from ['"]@remix-run\/react['"]/g,
      "form // Use HTML form or custom form component"
    );
    
    this.conversions.set(
      /~/g,
      "@"
    );
  }

  async portComponent(componentPath, targetPath) {
    try {
      console.log(`🔄 Porting component: ${componentPath}`);
      
      const sourceContent = fs.readFileSync(
        path.join(this.boltPath, componentPath),
        'utf-8'
      );
      
      let convertedContent = sourceContent;
      
      // Apply all conversions
      for (const [pattern, replacement] of this.conversions) {
        convertedContent = convertedContent.replace(pattern, replacement);
      }
      
      // Add Next.js specific imports if needed
      if (convertedContent.includes('useState') || convertedContent.includes('useEffect')) {
        convertedContent = `'use client';\n\n${convertedContent}`;
      }
      
      // Create target directory if it doesn't exist
      const targetDir = path.dirname(path.join(this.nextjsPath, targetPath));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Write converted file
      fs.writeFileSync(
        path.join(this.nextjsPath, targetPath),
        convertedContent
      );
      
      // Add conversion note
      const conversionNote = `
/*
 * PORTED FROM BOLT.DIY
 * Original: ${componentPath}
 * Ported on: ${new Date().toISOString()}
 * 
 * Manual review required:
 * - Check for Remix-specific patterns that need manual conversion
 * - Verify all imports are correctly resolved
 * - Test component functionality in Next.js environment
 * - Update any server-side logic to use Next.js patterns
 */

`;
      
      const finalContent = conversionNote + convertedContent;
      fs.writeFileSync(
        path.join(this.nextjsPath, targetPath),
        finalContent
      );
      
      console.log(`✅ Successfully ported to: ${targetPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error porting ${componentPath}:`, error.message);
      return false;
    }
  }

  async portMultipleComponents(componentList) {
    const results = [];
    
    for (const { source, target } of componentList) {
      const result = await this.portComponent(source, target);
      results.push({ source, target, success: result });
    }
    
    return results;
  }

  generatePortingReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => r.success === false).length,
      results
    };
    
    fs.writeFileSync(
      path.join(this.nextjsPath, 'porting-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📊 Porting Report:');
    console.log(`Total components: ${report.total}`);
    console.log(`Successful: ${report.successful}`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Report saved to: porting-report.json`);
  }

  async portUIComponents() {
    const uiComponents = [
      {
        source: 'app/components/ui/Dialog.tsx',
        target: 'src/components/ui/dialog.tsx'
      },
      {
        source: 'app/components/ui/Button.tsx',
        target: 'src/components/ui/button.tsx'
      },
      {
        source: 'app/components/ui/IconButton.tsx',
        target: 'src/components/ui/icon-button.tsx'
      },
      {
        source: 'app/components/ui/LoadingSpinner.tsx',
        target: 'src/components/ui/loading-spinner.tsx'
      },
      {
        source: 'app/components/ui/Switch.tsx',
        target: 'src/components/ui/switch.tsx'
      },
      {
        source: 'app/components/ui/Tooltip.tsx',
        target: 'src/components/ui/tooltip.tsx'
      }
    ];

    console.log('🚀 Starting UI components porting...');
    const results = await this.portMultipleComponents(uiComponents);
    this.generatePortingReport(results);
  }

  async portChatComponents() {
    const chatComponents = [
      {
        source: 'app/components/chat/BaseChat.tsx',
        target: 'src/components/chat/base-chat.tsx'
      },
      {
        source: 'app/components/chat/ChatMessage.tsx',
        target: 'src/components/chat/chat-message.tsx'
      },
      {
        source: 'app/components/chat/UserMessage.tsx',
        target: 'src/components/chat/user-message.tsx'
      },
      {
        source: 'app/components/chat/AssistantMessage.tsx',
        target: 'src/components/chat/assistant-message.tsx'
      }
    ];

    console.log('💬 Starting chat components porting...');
    const results = await this.portMultipleComponents(chatComponents);
    this.generatePortingReport(results);
  }

  async portStores() {
    const stores = [
      {
        source: 'app/lib/stores/theme.ts',
        target: 'src/lib/stores/theme.ts'
      },
      {
        source: 'app/lib/stores/chat.ts',
        target: 'src/lib/stores/chat.ts'
      }
    ];

    console.log('🗄️ Starting stores porting...');
    const results = await this.portMultipleComponents(stores);
    this.generatePortingReport(results);
  }

  async portAll() {
    console.log('🔄 Starting complete port from bolt.diy to Next.js...\n');
    
    await this.portUIComponents();
    await this.portChatComponents();
    await this.portStores();
    
    console.log('\n✨ Porting complete! Remember to:');
    console.log('1. Review all ported files for manual adjustments');
    console.log('2. Install any missing dependencies');
    console.log('3. Test components in Next.js environment');
    console.log('4. Update imports and exports as needed');
    console.log('5. Check the porting-report.json for details');
  }
}

// CLI interface
async function main() {
  const porter = new BoltToNextJSPorter();
  const command = process.argv[2];

  switch (command) {
    case 'ui':
      await porter.portUIComponents();
      break;
    case 'chat':
      await porter.portChatComponents();
      break;
    case 'stores':
      await porter.portStores();
      break;
    case 'all':
    default:
      await porter.portAll();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BoltToNextJSPorter };