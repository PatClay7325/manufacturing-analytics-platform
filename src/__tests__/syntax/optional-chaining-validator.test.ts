// Jest test - using global test functions
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Test suite to detect incorrect optional chaining syntax patterns
 * that cause compilation errors
 */
describe('Optional Chaining Syntax Validation', () => {
  // Pattern to detect incorrect numeric literals with optional chaining
  const incorrectNumericPattern = /\d+\?\.\d+/g;
  
  // Pattern to detect typeof with optional chaining
  const typeofOptionalChainingPattern = /typeof\s+\w+\?\.\w+/g;
  
  // Pattern to detect assignment to optional chaining
  const assignmentToOptionalChaining = /\w+\?\.\w+\s*=/g;
  
  // Pattern to detect property assignment with optional chaining on left side
  const propertyAssignmentPattern = /\.\w+\?\.\w+\s*=/g;

  // Get all TypeScript/TSX files
  const getSourceFiles = () => {
    const srcPath = path.join(process.cwd(), 'src');
    return glob.sync('**/*.{ts,tsx}', { 
      cwd: srcPath,
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
    }).map(file => path.join(srcPath, file));
  };

  it('should not contain malformed numeric literals (e.g., 0.1)', () => {
    const files = getSourceFiles();
    const errors: Array<{ file: string; line: number; match: string }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const matches = line.match(incorrectNumericPattern);
        if (matches) {
          matches.forEach(match => {
            errors.push({
              file: file.replace(process.cwd(), '.'),
              line: index + 1,
              match
            });
          });
        }
      });
    });

    if (errors.length > 0) {
      const errorMessage = errors.map(e => 
        `${e.file}:${e.line} - Found "${e.match}" (should be "${e.match.replace('?.', '.')}")`
      ).join('\n');
      
      expect(errors).toHaveLength(0);
      throw new Error(`Found ${errors.length} malformed numeric literals:\n${errorMessage}`);
    }
  });

  it('should not use typeof with optional chaining', () => {
    const files = getSourceFiles();
    const errors: Array<{ file: string; line: number; match: string }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const matches = line.match(typeofOptionalChainingPattern);
        if (matches) {
          matches.forEach(match => {
            errors.push({
              file: file.replace(process.cwd(), '.'),
              line: index + 1,
              match
            });
          });
        }
      });
    });

    if (errors.length > 0) {
      const errorMessage = errors.map(e => 
        `${e.file}:${e.line} - Found "${e.match}" (typeof cannot be used with optional chaining)`
      ).join('\n');
      
      expect(errors).toHaveLength(0);
      throw new Error(`Found ${errors.length} typeof with optional chaining errors:\n${errorMessage}`);
    }
  });

  it('should not assign to optional chaining expressions', () => {
    const files = getSourceFiles();
    const errors: Array<{ file: string; line: number; match: string; context: string }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip if it's a comparison (==, ===, !=, !==)
        if (line.includes('==') || line.includes('!=')) {
          return;
        }
        
        // Skip type annotations (e.g., : Highcharts?.Options)
        if (line.includes(':') && /:\s*\w+\?\.\w+/.test(line)) {
          return;
        }
        
        // Skip arrow function return types (e.g. ): JSX?.Element =>)
        if (/\):\s*\w+\?\.\w+\s*=>/.test(line)) {
          return;
        }
        
        const matches = line.match(assignmentToOptionalChaining);
        if (matches) {
          matches.forEach(match => {
            // Check if it's actually an assignment (not comparison or type annotation)
            const trimmedMatch = match.trim();
            if (trimmedMatch.endsWith('=') && !line.includes('==') && !line.includes('!=')) {
              // Additional check to ensure it's not part of a type annotation
              const beforeMatch = line.substring(0, line.indexOf(match));
              if (!beforeMatch.includes(':') || !/:\s*[^=]*$/.test(beforeMatch)) {
                errors.push({
                  file: file.replace(process.cwd(), '.'),
                  line: index + 1,
                  match: trimmedMatch,
                  context: line.trim()
                });
              }
            }
          });
        }
      });
    });

    if (errors.length > 0) {
      const errorMessage = errors.map(e => 
        `${e.file}:${e.line} - Cannot assign to "${e.match}"\n  Context: ${e.context}`
      ).join('\n\n');
      
      expect(errors).toHaveLength(0);
      throw new Error(`Found ${errors.length} assignment to optional chaining errors:\n${errorMessage}`);
    }
  });

  it('should detect common React/TypeScript syntax errors', () => {
    const files = getSourceFiles();
    const errors: Array<{ file: string; line: number; issue: string; suggestion: string }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for className with numeric values containing ?
        if (line.includes('className=') && line.includes('?.') && /\d+\?\.\d+/.test(line)) {
          errors.push({
            file: file.replace(process.cwd(), '.'),
            line: index + 1,
            issue: 'Numeric value with ?. in className',
            suggestion: 'Replace ?. with . in numeric values (e.g., py-1.5 -> py-1.5)'
          });
        }

        // Check for strokeWidth, fillOpacity with ?.
        const numericProps = ['strokeWidth', 'fillOpacity', 'opacity', 'fontSize'];
        numericProps.forEach(prop => {
          if (line.includes(prop) && /\d+\?\.\d+/.test(line)) {
            errors.push({
              file: file.replace(process.cwd(), '.'),
              line: index + 1,
              issue: `${prop} with malformed numeric value`,
              suggestion: `Replace ?. with . in numeric values`
            });
          }
        });

        // Check for .innerHTML = with optional chaining
        if (line.includes('?.innerHTML') && line.includes('=') && !line.includes('==')) {
          errors.push({
            file: file.replace(process.cwd(), '.'),
            line: index + 1,
            issue: 'Assignment to optional chaining (?.innerHTML =)',
            suggestion: 'Use if statement: if (element) { element.innerHTML = ... }'
          });
        }
      });
    });

    if (errors.length > 0) {
      const errorMessage = errors.map(e => 
        `${e.file}:${e.line}\n  Issue: ${e.issue}\n  Fix: ${e.suggestion}`
      ).join('\n\n');
      
      expect(errors).toHaveLength(0);
      throw new Error(`Found ${errors.length} syntax issues:\n${errorMessage}`);
    }
  });

  it('should validate imports have proper quotes', () => {
    const files = getSourceFiles();
    const errors: Array<{ file: string; line: number; match: string }> = [];

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for imports missing opening quote
        if (line.includes('import') && line.includes('from') && line.includes('/')) {
          const importMatch = line.match(/from\s+([^'"\s]+)'|from\s+([^'"\s]+)"/);
          if (importMatch && importMatch[1] && importMatch[1].startsWith('/')) {
            errors.push({
              file: file.replace(process.cwd(), '.'),
              line: index + 1,
              match: line.trim()
            });
          }
        }
      });
    });

    if (errors.length > 0) {
      const errorMessage = errors.map(e => 
        `${e.file}:${e.line} - Missing quotes in import: ${e.match}`
      ).join('\n');
      
      expect(errors).toHaveLength(0);
      throw new Error(`Found ${errors.length} import syntax errors:\n${errorMessage}`);
    }
  });
});

/**
 * Auto-fix utilities for common syntax errors
 */
export const syntaxFixers = {
  fixNumericLiterals: (content: string): string => {
    return content.replace(/(\d+)\?\.(d+)/g, '$1.$2');
  },

  fixTypeofOptionalChaining: (content: string): string => {
    return content.replace(/typeof\s+(\w+)\?\.\w+/g, (match, variable) => {
      console.warn(`Cannot use typeof with optional chaining: ${match}`);
      return `'string'`; // Default type, should be manually reviewed
    });
  },

  fixAssignmentToOptionalChaining: (content: string): string => {
    // This is complex and should be done manually
    const lines = content.split('\n');
    const warnings: string[] = [];
    
    lines.forEach((line, index) => {
      if (/\w+\?\.\w+\s*=/.test(line) && !line.includes('==')) {
        warnings.push(`Line ${index + 1}: Assignment to optional chaining detected`);
      }
    });
    
    if (warnings.length > 0) {
      console.warn('Manual fixes required:\n' + warnings.join('\n'));
    }
    
    return content;
  }
};