import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

describe('Comprehensive Syntax Validation', () => {
  const projectRoot = path.resolve(process.cwd());
  
  // Common syntax error patterns
  const syntaxPatterns = {
    // Numeric optional chaining errors
    incorrectNumericOptionalChaining: /\d+\?\.\d+/g,
    
    // Typeof with optional chaining
    typeofOptionalChaining: /typeof\s+\w+\?\.\w+/g,
    
    // Assignment to optional chaining
    assignmentToOptionalChaining: /\w+\?\.\w+\s*=/g,
    
    // Malformed JSX/XML attributes
    malformedXmlns: /xmlns="[^"]*\?[^"]*"/g,
    
    // Missing quotes in imports
    unquotedImport: /from\s+[^'"]\S+(?=[;\s])/g,
    
    // Unclosed JSX tags
    unclosedJsx: /<(\w+)(?:\s[^>]*)?>(?![\s\S]*<\/\1>)/g,
    
    // Double dots in property access
    doubleDots: /\.\.\w+/g,
    
    // Missing semicolons (optional, but can catch issues)
    missingSemicolon: /[^{};]\s*\n\s*(?:const|let|var|function|class|export|import)/g,
    
    // Trailing commas in function calls (ES5 compatibility)
    trailingCommaInCall: /,\s*\)/g,
    
    // Template literal syntax errors
    unclosedTemplateLiteral: /`[^`]*$/gm,
    
    // Arrow function syntax errors
    malformedArrowFunction: /=>\s*{[^}]*$/gm,
    
    // Destructuring syntax errors
    malformedDestructuring: /{\s*\.{3}\s*}/g,
    
    // JSX expression syntax errors
    emptyJsxExpression: /{[\s]*}/g,
    
    // Invalid TypeScript type syntax
    invalidTypeAnnotation: /:\s*[,;)\]}]/g,
  };

  // File extensions to check
  const fileExtensions = ['ts', 'tsx', 'js', 'jsx'];
  
  // Directories to exclude
  const excludeDirs = [
    'node_modules',
    '.next',
    'dist',
    'build',
    'coverage',
    '.git',
    'playwright-report',
    'test-results'
  ];

  const getFilesToCheck = async () => {
    const pattern = `**/*.{${fileExtensions.join(',')}}`;
    const files = await glob(pattern, {
      cwd: projectRoot,
      ignore: excludeDirs.map(dir => `**/${dir}/**`),
      absolute: true
    });
    return files;
  };

  const checkFileForSyntaxErrors = async (filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8');
    const errors: Array<{ type: string; message: string; line?: number; column?: number }> = [];

    // Check for pattern-based syntax errors
    for (const [patternName, pattern] of Object.entries(syntaxPatterns)) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const lines = content.substring(0, match.index).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        errors.push({
          type: patternName,
          message: `Found ${patternName}: "${match[0]}"`,
          line,
          column
        });
      }
    }

    // Parse with Babel for more comprehensive syntax checking
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining'
        ],
        errorRecovery: true
      });

      // Additional AST-based checks
      traverse(ast, {
        // Check for missing return statements in arrow functions
        ArrowFunctionExpression(path) {
          if (path.node.body.type === 'BlockStatement' && 
              path.node.body.body.length === 0) {
            errors.push({
              type: 'emptyArrowFunction',
              message: 'Empty arrow function body',
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column
            });
          }
        },

        // Check for duplicate keys in objects
        ObjectExpression(path) {
          const keys = new Set<string>();
          for (const prop of path.node.properties) {
            if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
              const keyName = prop.key.name;
              if (keys.has(keyName)) {
                errors.push({
                  type: 'duplicateObjectKey',
                  message: `Duplicate key "${keyName}" in object`,
                  line: prop.loc?.start.line,
                  column: prop.loc?.start.column
                });
              }
              keys.add(keyName);
            }
          }
        },

        // Check for unreachable code
        BlockStatement(path) {
          let foundReturn = false;
          for (const statement of path.node.body) {
            if (foundReturn) {
              errors.push({
                type: 'unreachableCode',
                message: 'Unreachable code detected',
                line: statement.loc?.start.line,
                column: statement.loc?.start.column
              });
            }
            if (statement.type === 'ReturnStatement') {
              foundReturn = true;
            }
          }
        }
      });
    } catch (parseError: any) {
      if (parseError.loc) {
        errors.push({
          type: 'parseError',
          message: parseError.message,
          line: parseError.loc.line,
          column: parseError.loc.column
        });
      }
    }

    return errors;
  };

  it('should not have syntax errors in any TypeScript/JavaScript files', async () => {
    const files = await getFilesToCheck();
    const allErrors: Record<string, any[]> = {};
    
    for (const file of files) {
      const errors = await checkFileForSyntaxErrors(file);
      if (errors.length > 0) {
        const relativePath = path.relative(projectRoot, file);
        allErrors[relativePath] = errors;
      }
    }

    // Report findings
    if (Object.keys(allErrors).length > 0) {
      console.error('\n❌ Syntax errors found:\n');
      for (const [file, errors] of Object.entries(allErrors)) {
        console.error(`\n📄 ${file}:`);
        for (const error of errors) {
          const location = error.line ? ` (${error.line}:${error.column || 0})` : '';
          console.error(`   ⚠️  ${error.type}: ${error.message}${location}`);
        }
      }
      console.error(`\n📊 Total files with errors: ${Object.keys(allErrors).length}`);
      console.error(`📊 Total errors found: ${Object.values(allErrors).flat().length}\n`);
    }

    expect(Object.keys(allErrors).length).toBe(0);
  }, 60000); // 60 second timeout for large projects

  // Specific test for common React/JSX errors
  it('should not have JSX-specific syntax errors', async () => {
    const files = await glob('**/*.{tsx,jsx}', {
      cwd: projectRoot,
      ignore: excludeDirs.map(dir => `**/${dir}/**`),
      absolute: true
    });

    const jsxErrors: Record<string, string[]> = {};

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const errors: string[] = [];

      // Check for self-closing tag errors
      const selfClosingError = /<(\w+)(?:\s[^>]*)?\s*\/(?!>)/g;
      const selfClosingMatches = [...content.matchAll(selfClosingError)];
      for (const match of selfClosingMatches) {
        errors.push(`Invalid self-closing tag: "${match[0]}"`);
      }

      // Check for JSX fragment syntax errors
      const fragmentError = /<>\s*</g;
      const fragmentMatches = [...content.matchAll(fragmentError)];
      for (const match of fragmentMatches) {
        errors.push(`Empty JSX fragment`);
      }

      // Check for missing key props in arrays
      const arrayMapWithoutKey = /\.map\s*\([^)]*\)\s*=>\s*[^{]*<(?!.*\skey=)/g;
      const mapMatches = [...content.matchAll(arrayMapWithoutKey)];
      for (const match of mapMatches) {
        errors.push(`Possible missing key prop in map: "${match[0].substring(0, 50)}..."`);
      }

      if (errors.length > 0) {
        jsxErrors[path.relative(projectRoot, file)] = errors;
      }
    }

    if (Object.keys(jsxErrors).length > 0) {
      console.error('\n❌ JSX-specific errors found:\n');
      for (const [file, errors] of Object.entries(jsxErrors)) {
        console.error(`\n📄 ${file}:`);
        for (const error of errors) {
          console.error(`   ⚠️  ${error}`);
        }
      }
    }

    expect(Object.keys(jsxErrors).length).toBe(0);
  });

  // Test for import/export syntax errors
  it('should have valid import/export statements', async () => {
    const files = await getFilesToCheck();
    const importErrors: Record<string, string[]> = {};

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const errors: string[] = [];

      // Check for invalid import paths
      const importStatements = content.matchAll(/import\s+(?:(?:\*\s+as\s+\w+)|(?:{[^}]+})|(?:\w+))?\s*(?:,\s*(?:{[^}]+}|\w+))?\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of importStatements) {
        const importPath = match[1];
        
        // Check for common import path errors
        if (importPath.includes('??') || importPath.includes('?.')) {
          errors.push(`Invalid import path with optional chaining: "${importPath}"`);
        }
        if (importPath.endsWith('.') || importPath.endsWith('/')) {
          errors.push(`Import path ends with invalid character: "${importPath}"`);
        }
        if (importPath.includes('//')) {
          errors.push(`Double slashes in import path: "${importPath}"`);
        }
      }

      // Check for circular dependencies (basic check)
      const relativeImports = [...content.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)];
      for (const match of relativeImports) {
        const importPath = match[1];
        const resolvedPath = path.resolve(path.dirname(file), importPath);
        
        try {
          const importedContent = await fs.readFile(resolvedPath + '.ts', 'utf-8').catch(() => 
            fs.readFile(resolvedPath + '.tsx', 'utf-8').catch(() => 
              fs.readFile(resolvedPath + '/index.ts', 'utf-8').catch(() => 
                fs.readFile(resolvedPath + '/index.tsx', 'utf-8').catch(() => null)
              )
            )
          );
          
          if (importedContent && importedContent.includes(`from '${path.relative(path.dirname(resolvedPath), file).replace(/\\/g, '/')}'`)) {
            errors.push(`Possible circular dependency with: "${importPath}"`);
          }
        } catch (e) {
          // File doesn't exist or can't be read, skip
        }
      }

      if (errors.length > 0) {
        importErrors[path.relative(projectRoot, file)] = errors;
      }
    }

    if (Object.keys(importErrors).length > 0) {
      console.error('\n❌ Import/Export errors found:\n');
      for (const [file, errors] of Object.entries(importErrors)) {
        console.error(`\n📄 ${file}:`);
        for (const error of errors) {
          console.error(`   ⚠️  ${error}`);
        }
      }
    }

    expect(Object.keys(importErrors).length).toBe(0);
  });
});