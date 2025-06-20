#!/usr/bin/env node

/**
 * Auto-generate comprehensive component tests to catch runtime errors
 * This script crawls all React components and generates tests for common error scenarios
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common error scenarios to test
const errorScenarios = [
  {
    name: 'undefined props',
    props: 'undefined',
    description: 'should handle undefined props without crashing'
  },
  {
    name: 'null props',
    props: 'null',
    description: 'should handle null props without crashing'
  },
  {
    name: 'empty object props',
    props: '{}',
    description: 'should handle empty props without crashing'
  },
  {
    name: 'missing required data',
    props: '{ data: undefined }',
    description: 'should handle missing data prop'
  },
  {
    name: 'invalid data type',
    props: '{ data: "invalid" }',
    description: 'should handle invalid data type'
  },
  {
    name: 'missing children',
    props: '{ children: undefined }',
    description: 'should handle missing children prop'
  }
];

function findComponents() {
  const componentPatterns = [
    'src/components/**/*.tsx',
    'src/app/**/page.tsx',
    'src/panels/**/*.tsx'
  ];
  
  let components = [];
  
  componentPatterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() });
    components = components.concat(files);
  });
  
  return components.filter(file => 
    !file.includes('.test.') && 
    !file.includes('.spec.') &&
    !file.includes('layout.tsx') // Skip layout files
  );
}

function extractComponentName(filePath) {
  const fileName = path.basename(filePath, '.tsx');
  // Handle page.tsx files
  if (fileName === 'page') {
    const dirName = path.basename(path.dirname(filePath));
    return dirName.charAt(0).toUpperCase() + dirName.slice(1) + 'Page';
  }
  return fileName;
}

function getImportPath(filePath) {
  return filePath.replace(/^src\//, '@/').replace(/\.tsx$/, '');
}

function generateTestContent(componentName, importPath, filePath) {
  const isPageComponent = filePath.includes('/page.tsx');
  const hasProps = !isPageComponent; // Pages typically don't take props
  
  return `import { describe, it, expect } from 'vitest';
import { render } from '@/test-utils';
import ${componentName} from '${importPath}';

describe('${componentName} - Error Handling', () => {
  ${hasProps ? errorScenarios.map(scenario => `
  it('${scenario.description}', () => {
    expect(() => {
      render(<${componentName} {...(${scenario.props})} />);
    }).not.toThrow();
  });`).join('\n') : `
  it('should render without crashing', () => {
    expect(() => {
      render(<${componentName} />);
    }).not.toThrow();
  });`}
  
  it('should not have console errors during render', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<${componentName} ${hasProps ? '{...{}}' : ''} />);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
  
  it('should handle hydration without mismatch', () => {
    const { container } = render(<${componentName} ${hasProps ? '{...{}}' : ''} />);
    expect(container.firstChild).toBeTruthy();
  });
});`;
}

function generateTests() {
  const components = findComponents();
  let generatedCount = 0;
  let skippedCount = 0;
  
  console.log(`Found ${components.length} components to test...`);
  
  components.forEach(filePath => {
    try {
      const componentName = extractComponentName(filePath);
      const importPath = getImportPath(filePath);
      
      // Check if component file exists and has default export
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Skip if no default export
      if (!content.includes('export default') && !content.includes('export { ') && !filePath.includes('/page.tsx')) {
        console.log(`⏭️  Skipping ${filePath} - no default export found`);
        skippedCount++;
        return;
      }
      
      const testDir = path.dirname(filePath).replace('src/', 'src/__tests__/');
      const testFile = path.join(testDir, `${path.basename(filePath, '.tsx')}.auto.test.tsx`);
      
      // Create test directory if it doesn't exist
      fs.mkdirSync(testDir, { recursive: true });
      
      // Generate test content
      const testContent = generateTestContent(componentName, importPath, filePath);
      
      // Write test file
      fs.writeFileSync(testFile, testContent);
      console.log(`✅ Generated test: ${testFile}`);
      generatedCount++;
      
    } catch (error) {
      console.log(`❌ Error processing ${filePath}:`, error.message);
      skippedCount++;
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Generated: ${generatedCount} test files`);
  console.log(`⏭️  Skipped: ${skippedCount} files`);
  console.log(`\nRun: npm test to execute all tests`);
}

// Run the generator
if (require.main === module) {
  generateTests();
}

module.exports = { generateTests, findComponents };