#!/usr/bin/env tsx

/**
 * Fix remaining syntax errors that require manual intervention
 */

import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  lineNumber: number;
  original: string;
  fixed: string;
  description: string;
}

const fixes: Fix[] = [
  // DashboardEmbed.tsx - innerHTML assignment
  {
    file: 'src/components/Analytics/DashboardEmbed.tsx',
    lineNumber: 38,
    original: '    style?.innerHTML = `',
    fixed: '    if (style) {\n      style.innerHTML = `',
    description: 'Wrap innerHTML assignment in if statement'
  },
  
  // ManufacturingDashboard.tsx - iframe src assignment
  {
    file: 'src/components/Analytics/ManufacturingDashboard.tsx',
    lineNumber: 71,
    original: '        iframe?.src = iframe?.src;',
    fixed: '        if (iframe) {\n          iframe.src = iframe.src;\n        }',
    description: 'Wrap iframe src assignment in if statement'
  },
  
  // explore/page.tsx - anchor element assignments
  {
    file: 'src/app/explore/page.tsx',
    lineNumber: 213,
    original: '    a?.href = url;',
    fixed: '    if (a) {\n      a.href = url;',
    description: 'Wrap anchor href assignment in if statement'
  },
  {
    file: 'src/app/explore/page.tsx',
    lineNumber: 214,
    original: '    a?.download = `explore_data_${Date.now()}.csv`;',
    fixed: '      a.download = `explore_data_${Date.now()}.csv`;\n    }',
    description: 'Complete if statement for anchor assignments'
  },
  
  // dashboards/edit/[id]/page.tsx - dashboard uid assignment
  {
    file: 'src/app/dashboards/edit/[id]/page.tsx',
    lineNumber: 30,
    original: '  sampleDashboard?.uid = params?.id;',
    fixed: '  if (sampleDashboard) {\n    sampleDashboard.uid = params?.id;',
    description: 'Wrap dashboard uid assignment in if statement'
  },
  
  // QueryHistory.tsx - typeof check
  {
    file: 'src/components/explore/QueryHistory.tsx',
    lineNumber: 97,
    original: '              {typeof item?.query === \'object\' && item?.query.expr',
    fixed: '              {item?.query && typeof item.query === \'object\' && item.query.expr',
    description: 'Replace typeof optional chaining with null check'
  }
];

const applyFixes = (dryRun: boolean) => {
  console.log(`🔧 ${dryRun ? 'Previewing' : 'Applying'} fixes for remaining syntax errors...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Group fixes by file
  const fixesByFile = fixes.reduce((acc, fix) => {
    if (!acc[fix.file]) acc[fix.file] = [];
    acc[fix.file].push(fix);
    return acc;
  }, {} as Record<string, Fix[]>);
  
  // Apply fixes file by file
  Object.entries(fixesByFile).forEach(([file, fileFixes]) => {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${file}`);
      errorCount++;
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    console.log(`\n📁 ${file}:`);
    
    // Sort fixes by line number in reverse order to avoid line number shifts
    fileFixes.sort((a, b) => b.lineNumber - a.lineNumber);
    
    let modified = false;
    fileFixes.forEach(fix => {
      const lineIndex = fix.lineNumber - 1;
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const currentLine = lines[lineIndex];
        
        if (currentLine.includes(fix.original.trim())) {
          console.log(`  Line ${fix.lineNumber}: ${fix.description}`);
          
          if (!dryRun) {
            // Handle multi-line replacements
            if (fix.fixed.includes('\n')) {
              const replacementLines = fix.fixed.split('\n');
              lines.splice(lineIndex, 1, ...replacementLines);
            } else {
              lines[lineIndex] = currentLine.replace(fix.original, fix.fixed);
            }
            modified = true;
          }
          
          successCount++;
        } else {
          console.log(`  ⚠️  Line ${fix.lineNumber}: Pattern not found (may have been already fixed)`);
        }
      }
    });
    
    if (modified && !dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      console.log(`  ✅ Fixed ${fileFixes.length} issues`);
    }
  });
  
  // Handle special case for closing brace after innerHTML assignment
  if (!dryRun) {
    const analyticsEmbedPath = path.join(process.cwd(), 'src/components/Analytics/DashboardEmbed.tsx');
    if (fs.existsSync(analyticsEmbedPath)) {
      let content = fs.readFileSync(analyticsEmbedPath, 'utf-8');
      
      // Find the innerHTML assignment and ensure proper closing
      const innerHTMLRegex = /if \(style\) \{\s*style\.innerHTML = `([^`]+)`/;
      const match = content.match(innerHTMLRegex);
      
      if (match) {
        // Find the closing backtick and add closing brace
        const startIndex = content.indexOf(match[0]);
        const afterMatch = content.substring(startIndex + match[0].length);
        const endBacktickIndex = afterMatch.indexOf('`;');
        
        if (endBacktickIndex !== -1) {
          const beforeEnd = content.substring(0, startIndex + match[0].length + endBacktickIndex + 2);
          const afterEnd = content.substring(startIndex + match[0].length + endBacktickIndex + 2);
          
          if (!afterEnd.trimStart().startsWith('}')) {
            content = beforeEnd + '\n    }' + afterEnd;
            fs.writeFileSync(analyticsEmbedPath, content, 'utf-8');
            console.log('\n📁 src/components/Analytics/DashboardEmbed.tsx:');
            console.log('  ✅ Added closing brace for innerHTML if statement');
          }
        }
      }
    }
    
    // Similar fix for dashboards/edit/[id]/page.tsx
    const dashboardEditPath = path.join(process.cwd(), 'src/app/dashboards/edit/[id]/page.tsx');
    if (fs.existsSync(dashboardEditPath)) {
      let content = fs.readFileSync(dashboardEditPath, 'utf-8');
      
      // Check if we need to add closing brace after uid assignment
      if (content.includes('if (sampleDashboard) {') && content.includes('sampleDashboard.uid = params?.id;')) {
        const lines = content.split('\n');
        let foundIf = false;
        let foundAssignment = false;
        let needsClosingBrace = false;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('if (sampleDashboard) {')) {
            foundIf = true;
          }
          if (foundIf && lines[i].includes('sampleDashboard.uid = params?.id;')) {
            foundAssignment = true;
            // Check if next non-empty line is a closing brace
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === '') j++;
            
            if (j < lines.length && !lines[j].trim().startsWith('}')) {
              needsClosingBrace = true;
              lines.splice(i + 1, 0, '  }');
              break;
            }
          }
        }
        
        if (needsClosingBrace) {
          fs.writeFileSync(dashboardEditPath, lines.join('\n'), 'utf-8');
          console.log('\n📁 src/app/dashboards/edit/[id]/page.tsx:');
          console.log('  ✅ Added closing brace for uid assignment if statement');
        }
      }
    }
  }
  
  console.log(`\n\n📊 Summary:`);
  console.log(`──────────────────────────────────────────────────`);
  console.log(`Successfully ${dryRun ? 'would fix' : 'fixed'}: ${successCount} issues`);
  if (errorCount > 0) {
    console.log(`Errors encountered: ${errorCount}`);
  }
  
  if (dryRun && successCount > 0) {
    console.log(`\nRun without --dry-run to apply these fixes.`);
  }
};

const main = () => {
  const isDryRun = process.argv.includes('--dry-run');
  applyFixes(isDryRun);
};

main();