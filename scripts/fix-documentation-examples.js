#!/usr/bin/env node

/**
 * Fix documentation examples that got corrupted by regex fixes
 */

const fs = require('fs');

const file = 'src/app/documentation/api-reference/page.tsx';

// Fix patterns for documentation examples
const docFixes = [
  // Numeric values in JSON examples
  { pattern: /(\d+)\?\.(\d+)/g, replacement: '$1.$2', description: 'Fix numeric values in JSON' },
  
  // Email addresses  
  { pattern: /@example\?\.com/g, replacement: '@example.com', description: 'Fix email domains' },
  
  // URLs in examples
  { pattern: /https:\/\/api\?\.your-domain\?\.com/g, replacement: 'https://api.your-domain.com', description: 'Fix API URLs' },
  
  // Java/Python imports and method calls
  { pattern: /import java\?\.net/g, replacement: 'import java.net', description: 'Fix Java imports' },
  { pattern: /HttpClient\?\.newHttpClient/g, replacement: 'HttpClient.newHttpClient', description: 'Fix Java method calls' },
  { pattern: /HttpRequest\?\.newBuilder/g, replacement: 'HttpRequest.newBuilder', description: 'Fix Java builders' },
  { pattern: /HttpRequest\?\.BodyPublishers/g, replacement: 'HttpRequest.BodyPublishers', description: 'Fix Java static methods' },
  { pattern: /HttpResponse\?\.BodyHandlers/g, replacement: 'HttpResponse.BodyHandlers', description: 'Fix Java handlers' },
  { pattern: /requests\?\.get/g, replacement: 'requests.get', description: 'Fix Python requests' },
  { pattern: /requests\?\.post/g, replacement: 'requests.post', description: 'Fix Python requests' },
  { pattern: /response\?\.json/g, replacement: 'response.json', description: 'Fix Python JSON calls' },
  { pattern: /response\?\.raise_for_status/g, replacement: 'response.raise_for_status', description: 'Fix Python status checks' },
  
  // SVG path commands in code examples
  { pattern: /(\d+)\?\.(\d+)([MLHVCSQTAZmlhvcsqtaz\s-])/g, replacement: '$1.$2$3', description: 'Fix SVG path coordinates' },
  
  // Chat completion objects
  { pattern: /"chat\?\.completion"/g, replacement: '"chat.completion"', description: 'Fix chat completion strings' },
  
  // Usernames
  { pattern: /"john\?\.doe"/g, replacement: '"john.doe"', description: 'Fix usernames' },
  { pattern: /"jane\?\.doe"/g, replacement: '"jane.doe"', description: 'Fix usernames' }
];

function fixDocumentationFile() {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let fixedContent = content;
    let totalChanges = 0;

    console.log('🔧 Fixing documentation examples...\n');

    docFixes.forEach(({ pattern, replacement, description }) => {
      const matches = fixedContent.match(pattern);
      if (matches) {
        fixedContent = fixedContent.replace(pattern, replacement);
        totalChanges += matches.length;
        console.log(`  ✅ ${description}: ${matches.length} fixes`);
      }
    });

    if (totalChanges > 0) {
      fs.writeFileSync(file, fixedContent);
      console.log(`\n✅ Fixed ${file} (${totalChanges} changes)`);
    } else {
      console.log(`\nℹ️  No changes needed in ${file}`);
    }

    return totalChanges;
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
    return 0;
  }
}

const fixes = fixDocumentationFile();
console.log(`\n📊 Applied ${fixes} total fixes to documentation examples`);
console.log('🎯 Documentation examples fixed!');