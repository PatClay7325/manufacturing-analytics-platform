#!/usr/bin/env node

/**
 * Sync specific components from bolt.diy to Next.js
 * Watch for changes and automatically port updated components
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { BoltToNextJSPorter } = require('./port-from-bolt');

class ComponentSyncer {
  constructor() {
    this.porter = new BoltToNextJSPorter();
    this.watchedComponents = new Map();
    this.setupWatchedComponents();
  }

  setupWatchedComponents() {
    // Define components to watch for automatic syncing
    this.watchedComponents.set(
      'app/components/ui/Button.tsx',
      'src/components/ui/button.tsx'
    );
    this.watchedComponents.set(
      'app/components/ui/Dialog.tsx',
      'src/components/ui/dialog.tsx'
    );
    this.watchedComponents.set(
      'app/components/chat/BaseChat.tsx',
      'src/components/chat/base-chat.tsx'
    );
    this.watchedComponents.set(
      'app/components/chat/ChatMessage.tsx',
      'src/components/chat/chat-message.tsx'
    );
  }

  async syncComponent(sourcePath) {
    const targetPath = this.watchedComponents.get(sourcePath);
    if (!targetPath) {
      console.log(`⚠️ No target mapping for: ${sourcePath}`);
      return;
    }

    console.log(`🔄 Syncing: ${sourcePath} → ${targetPath}`);
    const success = await this.porter.portComponent(sourcePath, targetPath);
    
    if (success) {
      console.log(`✅ Synced: ${sourcePath}`);
    } else {
      console.log(`❌ Failed to sync: ${sourcePath}`);
    }
  }

  startWatching() {
    const boltPath = this.porter.boltPath;
    const watchPaths = Array.from(this.watchedComponents.keys()).map(
      p => path.join(boltPath, p)
    );

    console.log('👀 Starting component sync watcher...');
    console.log('Watching paths:');
    watchPaths.forEach(p => console.log(`  - ${p}`));

    const watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      const relativePath = path.relative(boltPath, filePath);
      console.log(`\n📝 File changed: ${relativePath}`);
      this.syncComponent(relativePath);
    });

    watcher.on('ready', () => {
      console.log('\n✅ Watcher ready! Edit components in bolt.diy to see them sync automatically.');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  async syncAll() {
    console.log('🔄 Syncing all watched components...');
    
    for (const [source, target] of this.watchedComponents) {
      await this.syncComponent(source);
    }
    
    console.log('✅ All components synced!');
  }

  listWatched() {
    console.log('📋 Currently watched components:');
    for (const [source, target] of this.watchedComponents) {
      console.log(`  ${source} → ${target}`);
    }
  }
}

// CLI interface
async function main() {
  const syncer = new ComponentSyncer();
  const command = process.argv[2];

  switch (command) {
    case 'watch':
      syncer.startWatching();
      break;
    case 'sync':
      await syncer.syncAll();
      break;
    case 'list':
      syncer.listWatched();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run sync-components watch  # Start watching for changes');
      console.log('  npm run sync-components sync   # Sync all watched components once');
      console.log('  npm run sync-components list   # List watched components');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComponentSyncer };