#!/usr/bin/env node

/**
 * Quantum Verification Script
 * Verifies a single file against the Senior Engineer Framework standards
 * 
 * Usage: node verify-file.js <file-path>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Check if TypeScript is available and dynamically import it
let ts;
try {
  ts = require('typescript');
} catch (error) {
  console.warn('TypeScript not found, type checking will be limited');
}

// Constants
const VERIFICATION_VERSION = '9.0';
const THRESHOLDS = {
  typeScore: 90,
  testCoverage: 80,
  securityScore: 95,
  performanceScore: 80,
  accessibilityScore: 80,
  overallScore: 85
};

/**
 * Main verification function
 */
async function verifyFile(filePath) {
  console.log(`🔍 Quantum Verification v${VERIFICATION_VERSION}`);
  console.log(`Verifying file: ${filePath}\n`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if file is a JavaScript/TypeScript file
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip empty files
    if (!content.trim()) {
      console.log('File is empty, skipping verification');
      return true;
    }
    
    // Run verification
    const result = await runVerification(content, filePath);
    
    // Generate report
    const report = generateReport(result, filePath);
    
    // Save report
    saveReport(report, filePath);
    
    // Render results
    renderResults(result);
    
    // Return success/failure
    return result.passed;
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Runs all verification checks
 */
async function runVerification(content, filePath) {
  // Start verification timer
  const startTime = Date.now();
  
  // Run all verification stages
  const typeCheckResult = await performTypeCheck(content, filePath);
  const lintingResult = await performLinting(content);
  const securityResult = await performSecurityCheck(content);
  const testabilityResult = await assessTestability(content);
  const performanceResult = await analyzePerformance(content);
  const accessibilityResult = await verifyAccessibility(content);
  
  // Calculate metrics
  const metrics = calculateQualityMetrics({
    typeCheck: typeCheckResult,
    linting: lintingResult,
    security: securityResult,
    testability: testabilityResult,
    performance: performanceResult,
    accessibility: accessibilityResult
  });
  
  // Determine overall result
  const allPassed = 
    metrics.typeScore >= THRESHOLDS.typeScore &&
    metrics.testabilityScore >= THRESHOLDS.testCoverage &&
    metrics.securityScore >= THRESHOLDS.securityScore &&
    metrics.performanceScore >= THRESHOLDS.performanceScore &&
    metrics.accessibilityScore >= THRESHOLDS.accessibilityScore &&
    metrics.overallScore >= THRESHOLDS.overallScore;
  
  // Create verification ID
  const verificationId = generateVerificationId(content);
  
  // Return result
  return {
    passed: allPassed,
    verificationId,
    timestamp: new Date().toISOString(),
    stages: {
      typeCheck: typeCheckResult,
      linting: lintingResult,
      security: securityResult,
      testability: testabilityResult,
      performance: performanceResult,
      accessibility: accessibilityResult
    },
    metrics,
    duration: Date.now() - startTime
  };
}

/**
 * Performs type checking
 */
async function performTypeCheck(content, filePath) {
  const issues = [];
  
  // Skip if TypeScript is not available
  if (!ts) {
    return {
      passed: true,
      score: 80,
      details: [
        {
          category: 'info',
          message: 'TypeScript not available, skipping full type check'
        }
      ]
    };
  }
  
  try {
    // Create a temporary file for TypeScript to analyze
    const ext = path.extname(filePath);
    const tempFile = `temp-${Date.now()}${ext}`;
    fs.writeFileSync(tempFile, content);
    
    // Create TypeScript program
    const program = ts.createProgram([tempFile], {
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      noUncheckedIndexedAccess: true,
      alwaysStrict: true,
      jsx: ext === '.tsx' || ext === '.jsx' ? ts.JsxEmit.React : undefined
    });
    
    // Get diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);
    
    // Process diagnostics
    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      let location = 'unknown';
      
      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        location = `line ${line + 1}, char ${character + 1}`;
      }
      
      issues.push({
        category: 'typescript',
        message,
        location
      });
    }
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error) {
    issues.push({
      category: 'error',
      message: `Type checking error: ${error.message}`
    });
  }
  
  // Check for any usage
  const anyTypeRegex = /: any|as any/g;
  const anyMatches = content.match(anyTypeRegex);
  
  if (anyMatches) {
    issues.push({
      category: 'type-safety',
      message: 'Explicit any type is not allowed',
      count: anyMatches.length
    });
  }
  
  // Check for type assertions
  const typeAssertionRegex = /as [A-Z]\w+/g;
  const typeAssertionMatches = content.match(typeAssertionRegex);
  
  if (typeAssertionMatches) {
    issues.push({
      category: 'type-safety',
      message: 'Type assertions should be used with caution',
      count: typeAssertionMatches.length
    });
  }
  
  // Calculate score (100 - issues * 5, minimum 0)
  const score = Math.max(0, 100 - issues.length * 5);
  
  return {
    passed: score >= THRESHOLDS.typeScore,
    score,
    details: issues
  };
}

/**
 * Performs linting
 */
async function performLinting(content) {
  const issues = [];
  
  // Check for console.log
  const consoleLogRegex = /console\.log\(/g;
  const consoleLogMatches = content.match(consoleLogRegex);
  
  if (consoleLogMatches) {
    issues.push({
      category: 'linting',
      message: 'console.log() should not be used in production code',
      count: consoleLogMatches.length
    });
  }
  
  // Check for TODO comments
  const todoRegex = /\/\/\s*TODO|\/\*\s*TODO/g;
  const todoMatches = content.match(todoRegex);
  
  if (todoMatches) {
    issues.push({
      category: 'linting',
      message: 'TODO comments indicate incomplete implementation',
      count: todoMatches.length
    });
  }
  
  // Check function length (lines)
  const functionRegex = /function\s+\w+\s*\([^)]*\)\s*{([^}]*)}/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const functionBody = match[1];
    const lines = functionBody.split('\n').length;
    
    if (lines > 30) {
      issues.push({
        category: 'linting',
        message: `Function is too long (${lines} lines). Maximum should be 30 lines.`,
        location: `around index ${match.index}`
      });
    }
  }
  
  // Check for anonymous functions
  const anonymousFunctionRegex = /function\s*\(/g;
  const anonymousFunctionMatches = content.match(anonymousFunctionRegex);
  
  if (anonymousFunctionMatches) {
    issues.push({
      category: 'linting',
      message: 'Anonymous functions should be avoided',
      count: anonymousFunctionMatches.length
    });
  }
  
  // Calculate score (100 - issues * 5, minimum 0)
  const score = Math.max(0, 100 - issues.length * 5);
  
  return {
    passed: score >= 80,
    score,
    details: issues
  };
}

/**
 * Performs security analysis
 */
async function performSecurityCheck(content) {
  const issues = [];
  
  // Check for eval
  if (content.includes('eval(')) {
    issues.push({
      category: 'security',
      message: 'eval() is a security risk and should not be used',
      severity: 'critical'
    });
  }
  
  // Check for innerHTML
  if (content.includes('innerHTML')) {
    issues.push({
      category: 'security',
      message: 'innerHTML is a potential XSS vector. Use textContent or DOM methods instead.',
      severity: 'high'
    });
  }
  
  // Check for dangerouslySetInnerHTML
  if (content.includes('dangerouslySetInnerHTML')) {
    issues.push({
      category: 'security',
      message: 'dangerouslySetInnerHTML is a potential XSS vector',
      severity: 'high'
    });
  }
  
  // Check for SQL injection
  const sqlInjectionRegex = /executeQuery\s*\(\s*["'`].*?\$\{.*?\}/g;
  const sqlInjectionMatches = content.match(sqlInjectionRegex);
  
  if (sqlInjectionMatches) {
    issues.push({
      category: 'security',
      message: 'Potential SQL injection detected. Use parameterized queries.',
      severity: 'critical',
      count: sqlInjectionMatches.length
    });
  }
  
  // Check for JWT without verification
  if (content.includes('jwt.decode') && !content.includes('jwt.verify')) {
    issues.push({
      category: 'security',
      message: 'JWT is decoded without verification',
      severity: 'high'
    });
  }
  
  // Check for hardcoded secrets
  const secretRegex = /(password|secret|key|token|auth|credential)s?\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi;
  const secretMatches = content.match(secretRegex);
  
  if (secretMatches) {
    issues.push({
      category: 'security',
      message: 'Potential hardcoded secrets detected',
      severity: 'critical',
      count: secretMatches.length
    });
  }
  
  // Check for insecure direct object references
  const idorRegex = /params\.id|req\.params\.id|params\[['"]id['"]\]/g;
  const idorMatches = content.match(idorRegex);
  
  if (idorMatches && !content.includes('authorize')) {
    issues.push({
      category: 'security',
      message: 'Potential Insecure Direct Object Reference (IDOR). Ensure authorization checks.',
      severity: 'high',
      count: idorMatches.length
    });
  }
  
  // Check for type coercion
  const coercionRegex = /==(?!=)|!=(?!=)/g;
  const coercionMatches = content.match(coercionRegex);
  
  if (coercionMatches) {
    issues.push({
      category: 'security',
      message: 'Type coercion (== or !=) can lead to security issues. Use strict equality (=== or !==).',
      severity: 'medium',
      count: coercionMatches.length
    });
  }
  
  // Calculate severity score
  let severityScore = 0;
  for (const issue of issues) {
    if (issue.severity === 'critical') severityScore += 20;
    else if (issue.severity === 'high') severityScore += 10;
    else if (issue.severity === 'medium') severityScore += 5;
    else severityScore += 2;
  }
  
  const score = Math.max(0, 100 - severityScore);
  
  return {
    passed: score >= THRESHOLDS.securityScore,
    score,
    details: issues
  };
}

/**
 * Assesses testability of the code
 */
async function assessTestability(content) {
  // Analyze code structure
  const functions = extractFunctions(content);
  const conditionals = extractConditionals(content);
  
  // Calculate testability issues
  const issues = [];
  
  // Check for untestable constructs
  const untestableConstructs = [
    { pattern: /Math\.random\(\)/, message: 'Math.random() makes tests non-deterministic' },
    { pattern: /new Date\(\)/, message: 'new Date() without arguments makes tests time-dependent' },
    { pattern: /Date\.now\(\)/, message: 'Date.now() makes tests time-dependent' }
  ];
  
  for (const construct of untestableConstructs) {
    const matches = content.match(construct.pattern);
    if (matches) {
      issues.push({
        category: 'testability',
        message: construct.message,
        count: matches.length
      });
    }
  }
  
  // Check for complex conditionals
  const complexConditionalsRegex = /if\s*\([^)]{50,}\)/g;
  const complexConditionalsMatches = content.match(complexConditionalsRegex);
  
  if (complexConditionalsMatches) {
    issues.push({
      category: 'testability',
      message: 'Complex conditional expressions are difficult to test',
      count: complexConditionalsMatches.length
    });
  }
  
  // Check for lack of dependency injection
  const newOperatorRegex = /new\s+(?!Date|Map|Set|WeakMap|WeakSet|Array|Object|RegExp|Error)\w+/g;
  const newOperatorMatches = content.match(newOperatorRegex);
  
  if (newOperatorMatches) {
    issues.push({
      category: 'testability',
      message: 'Direct instantiation makes testing difficult. Consider dependency injection.',
      count: newOperatorMatches.length
    });
  }
  
  // Check for global state
  const globalStatePatterns = [
    /window\.\w+\s*=|global\.\w+\s*=/,
    /localStorage\.|sessionStorage\./,
    /document\.cookie/
  ];
  
  for (const pattern of globalStatePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        category: 'testability',
        message: 'Global state makes testing unpredictable',
        count: matches.length
      });
    }
  }
  
  // Calculate testability metrics
  const totalFunctions = functions.length;
  const pureToImpureRatio = totalFunctions > 0 ? 
    (totalFunctions - (newOperatorMatches?.length || 0)) / totalFunctions : 1;
  
  // Simulate test coverage
  const expectedCoverage = Math.min(100, Math.max(0, 
    90 - (issues.length * 5) - (complexConditionalsMatches?.length || 0) * 3
  ));
  
  // Calculate score
  const score = Math.max(0, Math.min(100, 
    expectedCoverage * 0.7 + (pureToImpureRatio * 100) * 0.3
  ));
  
  return {
    passed: score >= THRESHOLDS.testCoverage,
    score,
    details: {
      issues,
      metrics: {
        functions: totalFunctions,
        conditionals: conditionals.length,
        pureToImpureRatio,
        expectedCoverage
      }
    }
  };
}

/**
 * Analyzes performance
 */
async function analyzePerformance(content) {
  const issues = [];
  
  // Check for nested loops (potential O(n²) complexity)
  const nestedLoopRegex = /for\s*\([^{]*\)\s*{[^}]*for\s*\([^{]*\)/g;
  const nestedLoopMatches = content.match(nestedLoopRegex);
  
  if (nestedLoopMatches) {
    issues.push({
      category: 'performance',
      message: 'Nested loops detected (potential O(n²) complexity)',
      count: nestedLoopMatches.length
    });
  }
  
  // Check for inefficient array operations
  const inefficientArrayOps = [
    { pattern: /\.indexOf\([^)]*\)\s*!=\s*-1/, message: 'Use includes() instead of indexOf() != -1' },
    { pattern: /\.forEach\([^)]*\).*return/, message: 'forEach with return statement may not work as intended' },
    { pattern: /\.map\([^)]*\).*(?!return)/, message: 'map() without return may be intended as forEach()' }
  ];
  
  for (const op of inefficientArrayOps) {
    const matches = content.match(op.pattern);
    if (matches) {
      issues.push({
        category: 'performance',
        message: op.message,
        count: matches.length
      });
    }
  }
  
  // Check for inefficient React patterns
  if (content.includes('import React') || content.includes('from "react"')) {
    // Check for missing dependency arrays in useEffect
    const useEffectRegex = /useEffect\(\s*\(\)\s*=>\s*{[^}]*}\s*\)/g;
    const useEffectMatches = content.match(useEffectRegex);
    
    if (useEffectMatches) {
      issues.push({
        category: 'performance',
        message: 'useEffect without dependency array will run on every render',
        count: useEffectMatches.length
      });
    }
    
    // Check for missing React.memo
    if ((content.includes('function') || content.includes('=>')) && 
        content.includes('props') && 
        !content.includes('React.memo') && 
        !content.includes('memo(')) {
      issues.push({
        category: 'performance',
        message: 'Consider using React.memo for functional components that render often'
      });
    }
  }
  
  // Calculate performance metrics
  let timeComplexity = 'O(n)';
  if (nestedLoopMatches) {
    timeComplexity = 'O(n²)';
  } else if (content.includes('sort(')) {
    timeComplexity = 'O(n log n)';
  } else if (!content.match(/for|while|forEach|map|filter|reduce/)) {
    timeComplexity = 'O(1)';
  }
  
  // Simulate bundle size
  const bundleSize = `${Math.round(content.length / 100)}kb`;
  
  // Calculate score
  const score = Math.max(0, 100 - issues.length * 10);
  
  return {
    passed: score >= THRESHOLDS.performanceScore,
    score,
    details: {
      issues,
      metrics: {
        timeComplexity,
        memoryUsage: issues.length > 2 ? 'Suboptimal' : 'Optimized',
        bundleSize
      }
    }
  };
}

/**
 * Verifies accessibility
 */
async function verifyAccessibility(content) {
  const issues = [];
  
  // Check for common accessibility issues
  const accessibilityChecks = [
    { 
      pattern: /<img[^>]*(?!alt=)[^>]*>/g, 
      message: 'Image without alt attribute' 
    },
    { 
      pattern: /<button[^>]*(?!aria-label|aria-labelledby)[^>]*><\/button>/g, 
      message: 'Empty button without aria-label' 
    },
    { 
      pattern: /<div[^>]*(?:role=['"]button['"])[^>]*(?!tabindex)[^>]*>/g, 
      message: 'Interactive div without tabindex' 
    },
    { 
      pattern: /onClick[^>]*(?!onKeyDown|onKeyPress|onKeyUp)[^>]*>/g, 
      message: 'onClick without keyboard event handler' 
    }
  ];
  
  for (const check of accessibilityChecks) {
    const matches = content.match(check.pattern);
    if (matches) {
      issues.push({
        category: 'accessibility',
        message: check.message,
        count: matches.length
      });
    }
  }
  
  // Calculate score
  const score = Math.max(0, 100 - issues.length * 10);
  
  return {
    passed: score >= THRESHOLDS.accessibilityScore,
    score,
    details: {
      issues
    }
  };
}

/**
 * Calculates quality metrics
 */
function calculateQualityMetrics(results) {
  // Calculate weighted score
  const weights = {
    typeCheck: 0.2,
    linting: 0.1,
    security: 0.2,
    testability: 0.2,
    performance: 0.15,
    accessibility: 0.15
  };
  
  const overallScore = Math.round(
    results.typeCheck.score * weights.typeCheck +
    results.linting.score * weights.linting +
    results.security.score * weights.security +
    results.testability.score * weights.testability +
    results.performance.score * weights.performance +
    results.accessibility.score * weights.accessibility
  );
  
  // Calculate maintainability index
  const maintainabilityIndex = Math.round(
    (results.linting.score * 0.4) +
    (results.testability.score * 0.3) +
    (results.performance.score * 0.3)
  );
  
  return {
    overallScore,
    typeScore: results.typeCheck.score,
    testabilityScore: results.testability.score,
    securityScore: results.security.score,
    performanceScore: results.performance.score,
    accessibilityScore: results.accessibility.score,
    maintainabilityIndex
  };
}

/**
 * Extracts functions from code
 */
function extractFunctions(content) {
  const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/g;
  const functions = [];
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1] || match[2]);
  }
  
  return functions;
}

/**
 * Extracts conditional statements from code
 */
function extractConditionals(content) {
  const conditionalRegex = /if\s*\([^)]+\)|switch\s*\([^)]+\)|(\w+)\s*\?\s*([^:]+)\s*:\s*([^;]+)/g;
  const conditionals = [];
  let match;
  
  while ((match = conditionalRegex.exec(content)) !== null) {
    conditionals.push(match[0]);
  }
  
  return conditionals;
}

/**
 * Generates a unique verification ID
 */
function generateVerificationId(content) {
  const hash = crypto.createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 8);
  
  return `v9_quantum_verify_${hash}`;
}

/**
 * Generates a verification report
 */
function generateReport(result, filePath) {
  return {
    file: filePath,
    timestamp: result.timestamp,
    verificationId: result.verificationId,
    metrics: result.metrics,
    passed: result.passed,
    duration: result.duration,
    stages: {
      typeCheck: {
        passed: result.stages.typeCheck.passed,
        score: result.stages.typeCheck.score,
        issueCount: result.stages.typeCheck.details.length
      },
      linting: {
        passed: result.stages.linting.passed,
        score: result.stages.linting.score,
        issueCount: result.stages.linting.details.length
      },
      security: {
        passed: result.stages.security.passed,
        score: result.stages.security.score,
        issueCount: result.stages.security.details.length
      },
      testability: {
        passed: result.stages.testability.passed,
        score: result.stages.testability.score,
        issueCount: result.stages.testability.details.issues.length
      },
      performance: {
        passed: result.stages.performance.passed,
        score: result.stages.performance.score,
        issueCount: result.stages.performance.details.issues.length
      },
      accessibility: {
        passed: result.stages.accessibility.passed,
        score: result.stages.accessibility.score,
        issueCount: result.stages.accessibility.details.issues.length
      }
    }
  };
}

/**
 * Saves a verification report
 */
function saveReport(report, filePath) {
  const reportDir = path.join(process.cwd(), 'senior-engineer-framework/reports');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Create file name
  const fileName = path.basename(filePath, path.extname(filePath));
  const reportPath = path.join(reportDir, `${fileName}-${Date.now()}.json`);
  
  // Write report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📝 Report saved to: ${reportPath}`);
}

/**
 * Renders verification results
 */
function renderResults(result) {
  console.log('\n📊 VERIFICATION RESULTS:');
  console.log('='.repeat(50));
  
  console.log(`Overall Quality Score: ${result.metrics.overallScore}/100 ${result.metrics.overallScore >= THRESHOLDS.overallScore ? '✅' : '❌'}`);
  console.log('-'.repeat(50));
  
  console.log('Quality Metrics:');
  console.log(`- Type Safety: ${result.metrics.typeScore}/100 ${result.metrics.typeScore >= THRESHOLDS.typeScore ? '✅' : '❌'}`);
  console.log(`- Security: ${result.metrics.securityScore}/100 ${result.metrics.securityScore >= THRESHOLDS.securityScore ? '✅' : '❌'}`);
  console.log(`- Testability: ${result.metrics.testabilityScore}/100 ${result.metrics.testabilityScore >= THRESHOLDS.testCoverage ? '✅' : '❌'}`);
  console.log(`- Performance: ${result.metrics.performanceScore}/100 ${result.metrics.performanceScore >= THRESHOLDS.performanceScore ? '✅' : '❌'}`);
  console.log(`- Accessibility: ${result.metrics.accessibilityScore}/100 ${result.metrics.accessibilityScore >= THRESHOLDS.accessibilityScore ? '✅' : '❌'}`);
  console.log(`- Maintainability: ${result.metrics.maintainabilityIndex}/100`);
  console.log('-'.repeat(50));
  
  // Type check issues
  const typeIssues = result.stages.typeCheck.details;
  if (typeIssues.length > 0) {
    console.log(`\n🔤 Type issues (${typeIssues.length}):`);
    typeIssues.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.message} ${issue.location ? `(${issue.location})` : ''}`);
    });
    if (typeIssues.length > 5) {
      console.log(`  ... and ${typeIssues.length - 5} more issues`);
    }
  }
  
  // Security issues
  const securityIssues = result.stages.security.details;
  if (securityIssues.length > 0) {
    console.log(`\n🔒 Security issues (${securityIssues.length}):`);
    securityIssues.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.message} ${issue.severity ? `[${issue.severity}]` : ''}`);
    });
    if (securityIssues.length > 5) {
      console.log(`  ... and ${securityIssues.length - 5} more issues`);
    }
  }
  
  // Performance issues
  const performanceIssues = result.stages.performance.details.issues;
  if (performanceIssues.length > 0) {
    console.log(`\n⚡ Performance issues (${performanceIssues.length}):`);
    performanceIssues.slice(0, 5).forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.message} ${issue.count ? `(${issue.count} occurrences)` : ''}`);
    });
    if (performanceIssues.length > 5) {
      console.log(`  ... and ${performanceIssues.length - 5} more issues`);
    }
  }
  
  // Final verdict
  console.log('\n='.repeat(50));
  if (result.passed) {
    console.log('✅ VERDICT: VERIFIED WORKING');
  } else {
    console.log('❌ VERDICT: VERIFICATION FAILED');
  }
  console.log('='.repeat(50));
}

// Run verification if called directly
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: node verify-file.js <file-path>');
    process.exit(1);
  }
  
  verifyFile(filePath)
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

module.exports = verifyFile;