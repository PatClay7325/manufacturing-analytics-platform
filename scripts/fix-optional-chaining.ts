#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

/**
 * Script to automatically fix common optional chaining syntax errors
 */

interface SyntaxError {
  file: string;
  line: number;
  original: string;
  fixed: string;
  type: string;
}

class OptionalChainingSyntaxFixer {
  private errors: SyntaxError[] = [];
  private fixedCount = 0;

  async fixAll(dryRun = false) {
    console.log(chalk.blue('🔍 Scanning for optional chaining syntax errors...\n'));
    
    const srcPath = path.join(process.cwd(), 'src');
    const files = glob.sync('**/*.{ts,tsx}', { 
      cwd: srcPath,
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/node_modules/**']
    }).map(file => path.join(srcPath, file));

    for (const file of files) {
      await this.processFile(file, dryRun);
    }

    this.printReport(dryRun);
  }

  private async processFile(filePath: string, dryRun: boolean) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let fixed = content;
      const fileErrors: SyntaxError[] = [];

      // Fix numeric literals (0?.1 -> 0.1)
      fixed = fixed.replace(/(\d+)\?\.(d+)/g, (match, p1, p2) => {
        const lineNum = this.getLineNumber(content, match);
        fileErrors.push({
          file: filePath,
          line: lineNum,
          original: match,
          fixed: `${p1}.${p2}`,
          type: 'Numeric literal'
        });
        return `${p1}.${p2}`;
      });

      // Fix className with malformed numbers
      fixed = fixed.replace(/className="([^"]*?)(\d+)\?\.(d+)([^"]*?)"/g, 
        (match, before, num1, num2, after) => {
          const lineNum = this.getLineNumber(content, match);
          const fixedValue = `className="${before}${num1}.${num2}${after}"`;
          fileErrors.push({
            file: filePath,
            line: lineNum,
            original: match,
            fixed: fixedValue,
            type: 'className attribute'
          });
          return fixedValue;
        }
      );

      // Fix strokeWidth, fillOpacity, etc.
      const numericProps = ['strokeWidth', 'fillOpacity', 'opacity', 'fontSize', 'lineHeight'];
      numericProps.forEach(prop => {
        const regex = new RegExp(`(${prop}[=:][\\s{]*)(\d+)\\?\\.(\\d+)`, 'g');
        fixed = fixed.replace(regex, (match, p1, num1, num2) => {
          const lineNum = this.getLineNumber(content, match);
          const fixedValue = `${p1}${num1}.${num2}`;
          fileErrors.push({
            file: filePath,
            line: lineNum,
            original: match,
            fixed: fixedValue,
            type: `${prop} property`
          });
          return fixedValue;
        });
      });

      // Fix imports missing quotes
      fixed = fixed.replace(/from\s+\/([^'"\s]+)'/g, (match, path) => {
        const lineNum = this.getLineNumber(content, match);
        const fixedValue = `from './${path}'`;
        fileErrors.push({
          file: filePath,
          line: lineNum,
          original: match,
          fixed: fixedValue,
          type: 'Import statement'
        });
        return fixedValue;
      });

      // Detect but don't auto-fix complex issues
      this.detectComplexIssues(content, filePath);

      if (fileErrors.length > 0) {
        this.errors.push(...fileErrors);
        this.fixedCount += fileErrors.length;

        if (!dryRun && fixed !== content) {
          fs.writeFileSync(filePath, fixed, 'utf-8');
          console.log(chalk.green(`✅ Fixed ${fileErrors.length} issues in ${path.relative(process.cwd(), filePath)}`));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}: ${error}`));
    }
  }

  private detectComplexIssues(content: string, filePath: string) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Detect typeof with optional chaining
      if (/typeof\s+\w+\?\.\w+/.test(line)) {
        console.log(chalk.yellow(
          `⚠️  ${path.relative(process.cwd(), filePath)}:${index + 1} - ` +
          `typeof with optional chaining needs manual fix: ${line.trim()}`
        ));
      }

      // Detect assignment to optional chaining
      if (/\w+\?\.\w+\s*=/.test(line) && !line.includes('==') && !line.includes('!=')) {
        console.log(chalk.yellow(
          `⚠️  ${path.relative(process.cwd(), filePath)}:${index + 1} - ` +
          `Assignment to optional chaining needs manual fix: ${line.trim()}`
        ));
      }
    });
  }

  private getLineNumber(content: string, match: string): number {
    const index = content.indexOf(match);
    if (index === -1) return 0;
    return content.substring(0, index).split('\n').length;
  }

  private printReport(dryRun: boolean) {
    console.log('\n' + chalk.blue('📊 Summary Report'));
    console.log(chalk.blue('─'.repeat(50)));

    if (this.errors.length === 0) {
      console.log(chalk.green('✨ No optional chaining syntax errors found!'));
      return;
    }

    // Group errors by type
    const errorsByType = this.errors.reduce((acc, error) => {
      if (!acc[error.type]) acc[error.type] = [];
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, SyntaxError[]>);

    // Print errors by type
    Object.entries(errorsByType).forEach(([type, errors]) => {
      console.log(`\n${chalk.bold(type)} (${errors.length} issues):`);
      errors.slice(0, 5).forEach(error => {
        const file = path.relative(process.cwd(), error.file);
        console.log(`  ${file}:${error.line}`);
        console.log(`    ${chalk.red(error.original)} → ${chalk.green(error.fixed)}`);
      });
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more`);
      }
    });

    console.log('\n' + chalk.blue('─'.repeat(50)));
    console.log(chalk.bold(`Total issues ${dryRun ? 'found' : 'fixed'}: ${this.fixedCount}`));
    
    if (dryRun) {
      console.log(chalk.yellow('\n⚠️  This was a dry run. To apply fixes, run without --dry-run'));
    }
  }
}

// CLI execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
${chalk.bold('Optional Chaining Syntax Fixer')}

Usage: npm run fix:syntax [options]

Options:
  -d, --dry-run    Show what would be fixed without making changes
  -h, --help       Show this help message

Fixes:
  • Numeric literals (0?.1 → 0.1)
  • className attributes with malformed numbers
  • Numeric properties (strokeWidth, fillOpacity, etc.)
  • Import statements missing quotes

Manual fixes required for:
  • typeof with optional chaining
  • Assignment to optional chaining expressions
`);
  process.exit(0);
}

const fixer = new OptionalChainingSyntaxFixer();
fixer.fixAll(dryRun).catch(console.error);