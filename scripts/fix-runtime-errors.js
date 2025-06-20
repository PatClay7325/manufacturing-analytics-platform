#!/usr/bin/env node

/**
 * Automated script to fix common runtime errors in React components
 * This script analyzes components and applies common fixes for undefined props, etc.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common patterns that cause runtime errors and their fixes
const errorPatterns = [
  {
    // Fix: object.property access without optional chaining
    pattern: /(\w+)\.(\w+)(?!\?\.)/g,
    fix: (match, obj, prop) => {
      // Skip if it's already optional chaining or a known safe pattern
      if (match.includes('?.') || 
          ['console', 'window', 'document', 'process', 'React'].includes(obj)) {
        return match;
      }
      return `${obj}?.${prop}`;
    },
    description: 'Add optional chaining to prevent undefined access'
  },
  {
    // Fix: array.map without safety check
    pattern: /(\w+)\.map\(/g,
    fix: (match, arrayName) => {
      return `(${arrayName} || []).map(`;
    },
    description: 'Add safety check for array.map calls'
  },
  {
    // Fix: destructuring without default values
    pattern: /const\s*{\s*([^}]+)\s*}\s*=\s*(\w+);/g,
    fix: (match, props, source) => {
      return `const { ${props} } = ${source} || {};`;
    },
    description: 'Add default value for destructuring'
  },
  {
    // Fix: Missing default props in function components
    pattern: /export\s+(?:default\s+)?function\s+(\w+)\s*\(\s*{\s*([^}]+)\s*}\s*:/g,
    fix: (match, componentName, props) => {
      const defaultProps = props.split(',').map(prop => {
        const trimmed = prop.trim();
        if (trimmed.includes('=')) return trimmed; // Already has default
        if (trimmed.includes('[]')) return trimmed; // Array prop
        return `${trimmed} = {}`;
      }).join(', ');
      
      return match.replace(`{ ${props} }`, `{ ${defaultProps} }`);
    },
    description: 'Add default values to component props'
  }
];

// TypeScript interface fixes
const typescriptFixes = [
  {
    pattern: /interface\s+(\w+Props)\s*{([^}]+)}/g,
    fix: (match, interfaceName, props) => {
      // Make all props optional by adding ?
      const optionalProps = props.replace(/(\w+):\s*/g, '$1?: ');
      return `interface ${interfaceName} {${optionalProps}}`;
    },
    description: 'Make interface properties optional'
  }
];

function findReactFiles() {
  const patterns = [
    'src/components/**/*.{ts,tsx}',
    'src/app/**/*.tsx',
    'src/panels/**/*.tsx',
    'src/charts/**/*.tsx'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    const found = glob.sync(pattern, { cwd: process.cwd() });
    files = files.concat(found);
  });
  
  return files.filter(file => 
    !file.includes('.test.') && 
    !file.includes('.spec.') &&
    !file.includes('node_modules')
  );
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for common error patterns
  errorPatterns.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'runtime_error',
        pattern: pattern.toString(),
        description,
        matches: matches.length,
        examples: matches.slice(0, 3) // Show first 3 examples
      });
    }
  });
  
  // Check for TypeScript issues
  typescriptFixes.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'typescript_safety',
        pattern: pattern.toString(),
        description,
        matches: matches.length
      });
    }
  });
  
  // Check for specific React errors
  const reactErrorChecks = [
    {
      pattern: /\.map\(/g,
      check: (content, matches) => {
        // Check if there's a safety check before .map
        return matches.some(match => {
          const lineStart = content.lastIndexOf('\n', content.indexOf(match));
          const line = content.substring(lineStart, content.indexOf('\n', content.indexOf(match)));
          return !line.includes('||') && !line.includes('Array.isArray');
        });
      },
      description: 'Array.map without safety check'
    },
    {
      pattern: /\w+\.\w+/g,
      check: (content, matches) => {
        return matches.some(match => !match.includes('?.') && !match.includes('console.'));
      },
      description: 'Object property access without optional chaining'
    }
  ];
  
  reactErrorChecks.forEach(({ pattern, check, description }) => {
    const matches = content.match(pattern) || [];
    if (check(content, matches)) {
      issues.push({
        type: 'react_safety',
        description,
        severity: 'high'
      });
    }
  });
  
  return issues;
}

function fixFile(filePath, dryRun = false) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let fixedContent = originalContent;
  const appliedFixes = [];
  
  // Apply automatic fixes
  errorPatterns.forEach(({ pattern, fix, description }) => {
    const matches = fixedContent.match(pattern);
    if (matches) {
      fixedContent = fixedContent.replace(pattern, fix);
      appliedFixes.push({
        description,
        count: matches.length
      });
    }
  });
  
  // Apply TypeScript fixes
  typescriptFixes.forEach(({ pattern, fix, description }) => {
    const matches = fixedContent.match(pattern);
    if (matches) {
      fixedContent = fixedContent.replace(pattern, fix);
      appliedFixes.push({
        description,
        count: matches.length
      });
    }
  });
  
  // Only write if there were changes and not a dry run
  if (fixedContent !== originalContent && !dryRun) {
    fs.writeFileSync(filePath, fixedContent);
  }
  
  return {
    changed: fixedContent !== originalContent,
    fixes: appliedFixes
  };
}

function generateReport() {
  const files = findReactFiles();
  const report = {
    totalFiles: files.length,
    filesWithIssues: 0,
    issuesByType: {},
    fileReports: []
  };
  
  console.log(`🔍 Analyzing ${files.length} React files...`);
  
  files.forEach(filePath => {
    const issues = analyzeFile(filePath);
    
    if (issues.length > 0) {
      report.filesWithIssues++;
      report.fileReports.push({
        file: filePath,
        issues
      });
      
      // Count issues by type
      issues.forEach(issue => {
        if (!report.issuesByType[issue.type]) {
          report.issuesByType[issue.type] = 0;
        }
        report.issuesByType[issue.type]++;
      });
    }
  });
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  
  switch (command) {
    case 'analyze':
      const report = generateReport();
      console.log('\n📊 Error Analysis Report:');
      console.log(`Total files: ${report.totalFiles}`);
      console.log(`Files with issues: ${report.filesWithIssues}`);
      console.log('\nIssues by type:');
      Object.entries(report.issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      if (args.includes('--detailed')) {
        console.log('\n🔍 Detailed Issues:');
        report.fileReports.forEach(({ file, issues }) => {
          console.log(`\n📁 ${file}:`);
          issues.forEach(issue => {
            console.log(`  ⚠️  ${issue.description}`);
            if (issue.examples) {
              console.log(`     Examples: ${issue.examples.join(', ')}`);
            }
          });
        });
      }
      break;
      
    case 'fix':
      const dryRun = args.includes('--dry-run');
      const files = findReactFiles();
      let totalFixed = 0;
      
      console.log(`🔧 ${dryRun ? 'Simulating fixes' : 'Applying fixes'} to ${files.length} files...`);
      
      files.forEach(filePath => {
        const result = fixFile(filePath, dryRun);
        if (result.changed) {
          totalFixed++;
          console.log(`✅ ${dryRun ? 'Would fix' : 'Fixed'} ${filePath}`);
          result.fixes.forEach(fix => {
            console.log(`   - ${fix.description} (${fix.count} instances)`);
          });
        }
      });
      
      console.log(`\n📊 Summary: ${totalFixed} files ${dryRun ? 'would be' : 'were'} modified`);
      break;
      
    case 'test':
      // Generate tests and run them
      require('./generate-component-tests').generateTests();
      console.log('\n🧪 Running error detection tests...');
      const { execSync } = require('child_process');
      try {
        execSync('npm run test:errors', { stdio: 'inherit' });
      } catch (error) {
        console.log('❌ Tests found errors - check output above');
        process.exit(1);
      }
      break;
      
    default:
      console.log(`Usage: node ${__filename} <command>
      
Commands:
  analyze [--detailed]  - Analyze files for potential runtime errors
  fix [--dry-run]      - Apply automatic fixes to common issues
  test                 - Generate and run comprehensive error tests
  
Examples:
  node ${__filename} analyze --detailed
  node ${__filename} fix --dry-run
  node ${__filename} fix
  node ${__filename} test`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, fixFile, generateReport };