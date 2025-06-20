#!/usr/bin/env tsx

/**
 * Review and clean up all markdown documentation files
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface DocumentationIssue {
  file: string;
  line: number;
  content: string;
  issueType: 'grafana' | 'analytics' | 'filename';
  suggestion?: string;
}

interface FileToRename {
  oldPath: string;
  newPath: string;
}

const findDocumentationIssues = (): DocumentationIssue[] => {
  const issues: DocumentationIssue[] = [];
  const mdFiles = glob.sync('**/*.md', {
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**']
  });

  mdFiles.forEach(file => {
    // Check for Grafana in filename
    if (file.toLowerCase().includes('grafana')) {
      issues.push({
        file,
        line: 0,
        content: path.basename(file),
        issueType: 'filename',
        suggestion: path.basename(file)
          .replace(/grafana/gi, 'manufacturing-analytics')
          .replace(/GRAFANA/g, 'MANUFACTURING-ANALYTICS')
      });
    }

    // Check file content
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Direct Grafana references
        if (/\bgrafana\b/i.test(line)) {
          issues.push({
            file,
            line: index + 1,
            content: line.trim(),
            issueType: 'grafana',
            suggestion: line
              .replace(/\bGrafana\b/g, 'Manufacturing Analytics Platform')
              .replace(/\bgrafana\b/g, 'manufacturing analytics platform')
              .replace(/\bGRAFANA\b/g, 'MANUFACTURING ANALYTICS PLATFORM')
          });
        }

        // Generic Analytics references that might need context
        else if (/\bAnalytics\b/i.test(line) && !line.includes('Manufacturing Analytics')) {
          // Only flag if it seems to be referring to the platform
          const contextWords = ['dashboard', 'platform', 'system', 'integration', 'configuration', 'parallel', 'style'];
          if (contextWords.some(word => line.toLowerCase().includes(word))) {
            issues.push({
              file,
              line: index + 1,
              content: line.trim(),
              issueType: 'analytics',
              suggestion: 'Review: Consider if this should be "Manufacturing Analytics Platform"'
            });
          }
        }
      });
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  });

  return issues;
};

const suggestFileRenames = (issues: DocumentationIssue[]): FileToRename[] => {
  const renames: FileToRename[] = [];
  
  issues
    .filter(issue => issue.issueType === 'filename')
    .forEach(issue => {
      const dir = path.dirname(issue.file);
      const oldName = path.basename(issue.file);
      const newName = oldName
        .replace(/grafana/gi, 'manufacturing-analytics')
        .replace(/GRAFANA/g, 'MANUFACTURING-ANALYTICS');
      
      renames.push({
        oldPath: issue.file,
        newPath: path.join(dir, newName)
      });
    });

  return renames;
};

const generateReport = (issues: DocumentationIssue[]) => {
  console.log('📋 Markdown Documentation Review Report\n');
  console.log('=' .repeat(80) + '\n');

  // Group by file
  const byFile = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, DocumentationIssue[]>);

  // Summary
  const grafanaIssues = issues.filter(i => i.issueType === 'grafana');
  const analyticsIssues = issues.filter(i => i.issueType === 'analytics');
  const filenameIssues = issues.filter(i => i.issueType === 'filename');

  console.log('📊 Summary:');
  console.log(`   Total files with issues: ${Object.keys(byFile).length}`);
  console.log(`   Grafana references: ${grafanaIssues.length}`);
  console.log(`   Generic Analytics references: ${analyticsIssues.length}`);
  console.log(`   Files needing rename: ${filenameIssues.length}`);
  console.log('\n' + '-'.repeat(80) + '\n');

  // Files needing rename
  if (filenameIssues.length > 0) {
    console.log('📁 Files that should be renamed:\n');
    const renames = suggestFileRenames(filenameIssues);
    renames.forEach(({ oldPath, newPath }) => {
      console.log(`   ${oldPath}`);
      console.log(`   → ${newPath}\n`);
    });
    console.log('-'.repeat(80) + '\n');
  }

  // Files with Grafana references
  const filesWithGrafana = Object.entries(byFile)
    .filter(([_, issues]) => issues.some(i => i.issueType === 'grafana'))
    .sort((a, b) => b[1].length - a[1].length);

  if (filesWithGrafana.length > 0) {
    console.log('🔍 Files with Grafana references:\n');
    filesWithGrafana.forEach(([file, fileIssues]) => {
      const grafanaCount = fileIssues.filter(i => i.issueType === 'grafana').length;
      console.log(`📄 ${file} (${grafanaCount} references)`);
      
      // Show first 3 examples
      fileIssues
        .filter(i => i.issueType === 'grafana')
        .slice(0, 3)
        .forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.content.substring(0, 80)}${issue.content.length > 80 ? '...' : ''}`);
        });
      
      if (grafanaCount > 3) {
        console.log(`   ... and ${grafanaCount - 3} more references\n`);
      } else {
        console.log('');
      }
    });
    console.log('-'.repeat(80) + '\n');
  }

  // Files with generic Analytics references
  const filesWithAnalytics = Object.entries(byFile)
    .filter(([_, issues]) => issues.some(i => i.issueType === 'analytics'))
    .slice(0, 10); // Show top 10

  if (filesWithAnalytics.length > 0) {
    console.log('⚠️  Files with generic "Analytics" references (review needed):\n');
    filesWithAnalytics.forEach(([file, fileIssues]) => {
      const analyticsCount = fileIssues.filter(i => i.issueType === 'analytics').length;
      console.log(`📄 ${file} (${analyticsCount} references)`);
      
      // Show first 2 examples
      fileIssues
        .filter(i => i.issueType === 'analytics')
        .slice(0, 2)
        .forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.content.substring(0, 80)}${issue.content.length > 80 ? '...' : ''}`);
        });
      console.log('');
    });
    
    if (Object.keys(byFile).filter(f => byFile[f].some(i => i.issueType === 'analytics')).length > 10) {
      console.log(`... and ${Object.keys(byFile).filter(f => byFile[f].some(i => i.issueType === 'analytics')).length - 10} more files\n`);
    }
  }

  // Recommendations
  console.log('💡 Recommendations:\n');
  console.log('1. Rename files with "GRAFANA" in the name to use "MANUFACTURING-ANALYTICS"');
  console.log('2. Replace all "Grafana" references with "Manufacturing Analytics Platform"');
  console.log('3. Review generic "Analytics" references and update where appropriate:');
  console.log('   - "Analytics Dashboard" → "Manufacturing Analytics Dashboard"');
  console.log('   - "Analytics-parallel" → "Enterprise-grade analytics"');
  console.log('   - "Analytics integration" → "Manufacturing Analytics integration"');
  console.log('4. Consider archiving or removing outdated Grafana implementation guides');
  console.log('\n' + '='.repeat(80));
};

const createCleanupScript = (issues: DocumentationIssue[]) => {
  const outputPath = path.join(process.cwd(), 'scripts', 'cleanup-markdown-docs.ts');
  
  const grafanaFiles = [...new Set(issues
    .filter(i => i.issueType === 'grafana')
    .map(i => i.file))];

  const renames = suggestFileRenames(issues);

  const script = `#!/usr/bin/env tsx

/**
 * Auto-generated script to clean up markdown documentation
 * Generated on: ${new Date().toISOString()}
 */

import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = ${JSON.stringify(grafanaFiles, null, 2)};

const fileRenames = ${JSON.stringify(renames, null, 2)};

const cleanupDocs = (dryRun: boolean = false) => {
  console.log('🧹 Cleaning up markdown documentation...\\n');

  // Rename files
  if (fileRenames.length > 0) {
    console.log('📁 Renaming files...\\n');
    fileRenames.forEach(({ oldPath, newPath }) => {
      if (fs.existsSync(oldPath)) {
        if (dryRun) {
          console.log(\`Would rename: \${oldPath} → \${newPath}\`);
        } else {
          fs.renameSync(oldPath, newPath);
          console.log(\`✅ Renamed: \${oldPath} → \${newPath}\`);
        }
      }
    });
    console.log('');
  }

  // Update file contents
  console.log('📝 Updating file contents...\\n');
  
  const filesToProcess = [
    ...filesToUpdate,
    ...fileRenames.map(r => r.newPath)
  ];

  filesToProcess.forEach(file => {
    const filePath = fileRenames.find(r => r.newPath === file) ? file : file;
    
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Replace Grafana references
    content = content
      .replace(/\\bGrafana\\b/g, 'Manufacturing Analytics Platform')
      .replace(/\\bgrafana\\b/g, 'manufacturing analytics platform')
      .replace(/\\bGRAFANA\\b/g, 'MANUFACTURING ANALYTICS PLATFORM')
      .replace(/Grafana-style/gi, 'Manufacturing Analytics')
      .replace(/Grafana-parallel/gi, 'Enterprise-grade analytics')
      .replace(/Grafana-compliant/gi, 'Industry-standard compliant')
      .replace(/Grafana Dashboard/gi, 'Manufacturing Analytics Dashboard')
      .replace(/Grafana Integration/gi, 'Manufacturing Analytics Integration');

    if (content !== originalContent) {
      if (dryRun) {
        console.log(\`Would update: \${filePath}\`);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(\`✅ Updated: \${filePath}\`);
      }
    }
  });

  console.log(\`\\n✅ Cleanup \${dryRun ? 'would be' : 'is'} complete!\\n\`);
};

// Run with --dry-run flag for preview
const isDryRun = process.argv.includes('--dry-run');
cleanupDocs(isDryRun);
`;

  fs.writeFileSync(outputPath, script, 'utf-8');
  console.log(`\n✅ Created cleanup script: ${outputPath}`);
  console.log('   Run with: npm run cleanup:docs or npx tsx scripts/cleanup-markdown-docs.ts');
  console.log('   Preview with: npx tsx scripts/cleanup-markdown-docs.ts --dry-run\n');
};

// Main execution
const main = () => {
  console.log('🔍 Reviewing all markdown documentation files...\n');
  
  const issues = findDocumentationIssues();
  
  if (issues.length === 0) {
    console.log('✅ No issues found in markdown documentation!');
    console.log('🏭 Your documentation is clean!\n');
    return;
  }

  generateReport(issues);
  
  if (issues.some(i => i.issueType === 'grafana' || i.issueType === 'filename')) {
    createCleanupScript(issues);
  }
};

main();