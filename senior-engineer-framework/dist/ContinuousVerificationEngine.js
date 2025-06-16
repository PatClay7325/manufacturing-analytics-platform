"use strict";
/**
 * Continuous Verification Engine
 *
 * Provides real-time monitoring and verification of code during development.
 * Ensures code quality standards are maintained throughout the development process.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuousVerificationEngine = void 0;
const chokidar = __importStar(require("chokidar"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const QuantumVerifier_1 = require("./QuantumVerifier");
/**
 * Continuous Verification Engine
 * Monitors and verifies code in real-time
 */
class ContinuousVerificationEngine {
    constructor(options = {}) {
        this.watcher = null;
        this.verificationState = new Map();
        this.activityLog = [];
        this.violations = [];
        this.isRunning = false;
        // Default options
        this.options = {
            verifier: {},
            watchPaths: ['src/**/*.{ts,tsx,js,jsx}'],
            ignorePaths: ['**/node_modules/**', '**/.git/**', '**/*.test.{ts,tsx,js,jsx}'],
            gitMonitoring: true,
            autoFix: false,
            commitBlocking: true,
            reportingInterval: 3600000, // 1 hour
            ...options
        };
        // Initialize verifier
        this.verifier = new QuantumVerifier_1.QuantumVerifier(this.options.verifier);
    }
    /**
     * Starts the continuous verification engine
     */
    start() {
        if (this.isRunning) {
            console.log('Continuous Verification Engine is already running');
            return;
        }
        console.log('🔍 Starting Continuous Verification Engine...');
        // Setup file watcher
        this.watcher = chokidar.watch(this.options.watchPaths, {
            ignored: this.options.ignorePaths,
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });
        // Watch for file changes
        this.watcher
            .on('add', path => this.handleFileChange('add', path))
            .on('change', path => this.handleFileChange('change', path))
            .on('unlink', path => this.handleFileRemoval(path));
        // Setup git monitoring
        if (this.options.gitMonitoring) {
            this.setupGitMonitoring();
        }
        // Setup periodic reporting
        this.setupPeriodicReporting();
        this.isRunning = true;
        console.log('✅ Continuous Verification Engine started');
        console.log(`   Watching: ${this.options.watchPaths.join(', ')}`);
    }
    /**
     * Stops the continuous verification engine
     */
    stop() {
        if (!this.isRunning) {
            console.log('Continuous Verification Engine is not running');
            return;
        }
        console.log('🛑 Stopping Continuous Verification Engine...');
        // Close file watcher
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.isRunning = false;
        // Generate final report
        this.generateReport();
        console.log('✅ Continuous Verification Engine stopped');
    }
    /**
     * Handles file changes (add/change)
     */
    async handleFileChange(event, filePath) {
        // Skip if file doesn't exist or is a directory
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            return;
        }
        // Record activity
        this.recordActivity('file-change', filePath, {
            event,
            size: fs.statSync(filePath).size
        });
        console.log(`📝 ${event === 'add' ? 'New' : 'Changed'} file: ${filePath}`);
        try {
            // Read file content
            const content = fs.readFileSync(filePath, 'utf-8');
            // Skip empty files
            if (!content.trim()) {
                return;
            }
            // Verify file
            const result = await this.verifier.verifyCode(content, filePath);
            // Update verification state
            this.verificationState.set(filePath, {
                filePath,
                verified: result.passed,
                lastVerified: Date.now(),
                report: result
            });
            // Record verification activity
            this.recordActivity('verification', filePath, {
                passed: result.passed,
                metrics: result.metrics,
                verificationId: result.verificationId
            });
            // Log result
            if (result.passed) {
                console.log(`✅ ${filePath}: Verified successfully`);
            }
            else {
                console.warn(`⚠️ ${filePath}: Verification issues found`);
                this.logVerificationIssues(filePath, result);
                // Auto-fix if enabled
                if (this.options.autoFix) {
                    await this.attemptAutoFix(filePath, result);
                }
            }
        }
        catch (error) {
            console.error(`❌ ${filePath}: Verification failed:`, error.message);
            // Update verification state
            this.verificationState.set(filePath, {
                filePath,
                verified: false,
                lastVerified: Date.now(),
                error
            });
            // Record verification activity
            this.recordActivity('verification', filePath, {
                passed: false,
                error: error.message
            });
            // Record violation
            this.recordViolation(filePath, 'verification-failure', error, 'high');
        }
    }
    /**
     * Handles file removals
     */
    handleFileRemoval(filePath) {
        console.log(`🗑️ Removed file: ${filePath}`);
        // Record activity
        this.recordActivity('file-change', filePath, {
            event: 'remove'
        });
        // Remove from verification state
        this.verificationState.delete(filePath);
    }
    /**
     * Sets up Git monitoring
     */
    setupGitMonitoring() {
        // Check if in a Git repository
        try {
            (0, child_process_1.execSync)('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        }
        catch (error) {
            console.log('Not in a Git repository, skipping Git monitoring');
            return;
        }
        console.log('🔍 Setting up Git monitoring...');
        // Watch for pre-commit
        try {
            // Create or update pre-commit hook
            const hookPath = path.join('.git', 'hooks', 'pre-commit');
            const hookContent = `#!/bin/sh
# Quantum Verification pre-commit hook
echo "🔍 Running Quantum Verification before commit..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(js|jsx|ts|tsx)$')

if [ -z "$STAGED_FILES" ]; then
  echo "No JavaScript/TypeScript files staged, skipping verification"
  exit 0
fi

# Run verification script on staged files
for FILE in $STAGED_FILES; do
  echo "Verifying $FILE..."
  node ${path.join(process.cwd(), 'senior-engineer-framework/scripts/verify-file.js')} "$FILE"
  if [ $? -ne 0 ]; then
    echo "❌ Verification failed for $FILE"
    echo "Commit aborted. Fix the issues and try again."
    exit 1
  fi
done

echo "✅ All files verified successfully"
exit 0
`;
            fs.writeFileSync(hookPath, hookContent);
            fs.chmodSync(hookPath, '0755'); // Make executable
            console.log('✅ Git pre-commit hook installed');
        }
        catch (error) {
            console.error('Failed to setup Git hook:', error.message);
        }
    }
    /**
     * Sets up periodic reporting
     */
    setupPeriodicReporting() {
        if (this.options.reportingInterval <= 0) {
            return;
        }
        // Schedule periodic reporting
        setInterval(() => {
            this.generateReport();
        }, this.options.reportingInterval);
        console.log(`📊 Periodic reporting enabled (every ${this.options.reportingInterval / 60000} minutes)`);
    }
    /**
     * Logs verification issues
     */
    logVerificationIssues(filePath, result) {
        console.log(`\nVerification issues in ${filePath}:`);
        // Type check issues
        if (!result.stages.typeCheck.passed) {
            console.log('\n🔤 Type issues:');
            result.stages.typeCheck.details.forEach((issue) => {
                console.log(`  - ${issue.message} ${issue.location ? `(${issue.location})` : ''}`);
            });
        }
        // Linting issues
        if (!result.stages.linting.passed) {
            console.log('\n🧹 Linting issues:');
            result.stages.linting.details.forEach((issue) => {
                console.log(`  - ${issue.message} ${issue.count ? `(${issue.count} occurrences)` : ''}`);
            });
        }
        // Security issues
        if (!result.stages.security.passed) {
            console.log('\n🔒 Security issues:');
            result.stages.security.details.forEach((issue) => {
                console.log(`  - ${issue.message} ${issue.severity ? `[${issue.severity}]` : ''}`);
            });
        }
        // Test issues
        if (!result.stages.tests.passed) {
            console.log('\n🧪 Test issues:');
            console.log(`  - Coverage: ${result.stages.tests.coverage}% (required: ${this.options.verifier.testRequirements?.coverageThreshold || 90}%)`);
        }
        // Performance issues
        if (!result.stages.performance.passed) {
            console.log('\n⚡ Performance issues:');
            console.log(`  - Time complexity: ${result.stages.performance.details.timeComplexity}`);
            console.log(`  - Memory usage: ${result.stages.performance.details.memoryUsage}`);
        }
        // Accessibility issues
        if (!result.stages.accessibility.passed) {
            console.log('\n♿ Accessibility issues:');
            result.stages.accessibility.details.forEach((issue) => {
                console.log(`  - ${issue.message} ${issue.count ? `(${issue.count} occurrences)` : ''}`);
            });
        }
        console.log('\n📊 Quality metrics:');
        console.log(`  - Overall score: ${result.metrics.overallScore}/100`);
        console.log(`  - Type safety: ${result.metrics.typeScore}/100`);
        console.log(`  - Test coverage: ${result.metrics.testCoverage}%`);
        console.log(`  - Security: ${result.metrics.securityScore}/100`);
        console.log(`  - Performance: ${result.metrics.performanceScore}/100`);
        console.log(`  - Accessibility: ${result.metrics.accessibilityScore}/100`);
        console.log(`  - Maintainability: ${result.metrics.maintainabilityIndex}/100`);
        console.log(''); // Empty line
    }
    /**
     * Attempts to automatically fix issues
     */
    async attemptAutoFix(filePath, result) {
        console.log(`🔧 Attempting to auto-fix issues in ${filePath}...`);
        try {
            // Read file content
            const content = fs.readFileSync(filePath, 'utf-8');
            // Apply fixes
            let fixedContent = content;
            let fixesApplied = 0;
            // Fix linting issues
            if (!result.stages.linting.passed) {
                const lintingFixes = this.applyLintingFixes(fixedContent, result.stages.linting.details);
                if (lintingFixes.fixesApplied > 0) {
                    fixedContent = lintingFixes.content;
                    fixesApplied += lintingFixes.fixesApplied;
                }
            }
            // Fix security issues
            if (!result.stages.security.passed) {
                const securityFixes = this.applySecurityFixes(fixedContent, result.stages.security.details);
                if (securityFixes.fixesApplied > 0) {
                    fixedContent = securityFixes.content;
                    fixesApplied += securityFixes.fixesApplied;
                }
            }
            // Apply accessibility fixes
            if (!result.stages.accessibility.passed) {
                const accessibilityFixes = this.applyAccessibilityFixes(fixedContent, result.stages.accessibility.details);
                if (accessibilityFixes.fixesApplied > 0) {
                    fixedContent = accessibilityFixes.content;
                    fixesApplied += accessibilityFixes.fixesApplied;
                }
            }
            // Write fixed content if changes were made
            if (fixesApplied > 0) {
                fs.writeFileSync(filePath, fixedContent);
                // Record activity
                this.recordActivity('fix-applied', filePath, {
                    fixesApplied,
                    categories: {
                        linting: !result.stages.linting.passed,
                        security: !result.stages.security.passed,
                        accessibility: !result.stages.accessibility.passed
                    }
                });
                console.log(`✅ Applied ${fixesApplied} auto-fixes to ${filePath}`);
                return true;
            }
            else {
                console.log(`⚠️ No auto-fixes could be applied to ${filePath}`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Failed to apply auto-fixes to ${filePath}:`, error.message);
            return false;
        }
    }
    /**
     * Applies linting fixes
     */
    applyLintingFixes(content, issues) {
        let fixedContent = content;
        let fixesApplied = 0;
        // Fix console.log
        if (issues.some(issue => issue.message.includes('console.log'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/console\.log\([^)]*\);?/g, '');
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        // Fix TODO comments
        if (issues.some(issue => issue.message.includes('TODO'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/\/\/\s*TODO.*$/gm, '');
            fixedContent = fixedContent.replace(/\/\*\s*TODO[^*]*\*\//g, '');
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        return { content: fixedContent, fixesApplied };
    }
    /**
     * Applies security fixes
     */
    applySecurityFixes(content, issues) {
        let fixedContent = content;
        let fixesApplied = 0;
        // Fix type coercion (== to ===)
        if (issues.some(issue => issue.message.includes('Type coercion'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/([^=!])===?(?!=)/g, '$1===');
            fixedContent = fixedContent.replace(/([^=!])!==?(?!=)/g, '$1!==');
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        // Fix innerHTML (replace with textContent where possible)
        if (issues.some(issue => issue.message.includes('innerHTML'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/\.innerHTML\s*=\s*(['"`])((?!\$\{).)*\1/g, (match) => {
                return match.replace('innerHTML', 'textContent');
            });
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        return { content: fixedContent, fixesApplied };
    }
    /**
     * Applies accessibility fixes
     */
    applyAccessibilityFixes(content, issues) {
        let fixedContent = content;
        let fixesApplied = 0;
        // Fix images without alt
        if (issues.some(issue => issue.message.includes('Image without alt'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/<img([^>]*?)(?!\salt=)([^>]*)>/g, '<img$1 alt="Image"$2>');
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        // Fix buttons without aria-label
        if (issues.some(issue => issue.message.includes('Empty button without aria-label'))) {
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(/<button([^>]*?)>(\s*)<\/button>/g, '<button$1 aria-label="Button">$2</button>');
            if (oldContent !== fixedContent) {
                fixesApplied++;
            }
        }
        return { content: fixedContent, fixesApplied };
    }
    /**
     * Records an activity
     */
    recordActivity(activity, filePath, data) {
        this.activityLog.push({
            timestamp: Date.now(),
            activity,
            filePath,
            data
        });
    }
    /**
     * Records a violation
     */
    recordViolation(filePath, type, evidence, severity) {
        this.violations.push({
            timestamp: Date.now(),
            type,
            filePath,
            evidence,
            severity
        });
        console.warn(`⚠️ ${severity.toUpperCase()} Violation in ${filePath}: ${type}`);
    }
    /**
     * Generates a verification report
     */
    generateReport() {
        // Skip if no activity
        if (this.activityLog.length === 0) {
            return;
        }
        console.log('📊 Generating verification report...');
        const reportDir = path.join(process.cwd(), 'senior-engineer-framework/reports');
        // Create directory if it doesn't exist
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        // Create report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: this.verificationState.size,
                verifiedFiles: [...this.verificationState.values()].filter(state => state.verified).length,
                failedFiles: [...this.verificationState.values()].filter(state => !state.verified).length,
                totalActivities: this.activityLog.length,
                totalViolations: this.violations.length
            },
            files: [...this.verificationState.values()].map(state => ({
                filePath: state.filePath,
                verified: state.verified,
                lastVerified: new Date(state.lastVerified).toISOString(),
                metrics: state.report?.metrics
            })),
            violations: this.violations.map(violation => ({
                timestamp: new Date(violation.timestamp).toISOString(),
                type: violation.type,
                filePath: violation.filePath,
                severity: violation.severity
            })),
            activitySummary: {
                fileChanges: this.activityLog.filter(a => a.activity === 'file-change').length,
                verifications: this.activityLog.filter(a => a.activity === 'verification').length,
                fixes: this.activityLog.filter(a => a.activity === 'fix-applied').length
            }
        };
        // Write report
        const reportPath = path.join(reportDir, `verification-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`✅ Report generated: ${reportPath}`);
        // Log summary
        console.log('\n📊 Verification Summary:');
        console.log(`   Files: ${report.summary.totalFiles} total, ${report.summary.verifiedFiles} verified, ${report.summary.failedFiles} failed`);
        console.log(`   Activities: ${report.summary.totalActivities} total`);
        console.log(`   Violations: ${report.summary.totalViolations} total`);
    }
    /**
     * Gets the current verification state
     */
    getVerificationState() {
        return this.verificationState;
    }
    /**
     * Gets the verification report for a file
     */
    getFileReport(filePath) {
        return this.verificationState.get(filePath);
    }
    /**
     * Gets all violations
     */
    getViolations() {
        return this.violations;
    }
    /**
     * Gets all activities
     */
    getActivities() {
        return this.activityLog;
    }
    /**
     * Verifies all files
     */
    async verifyAllFiles() {
        console.log('🔍 Verifying all files...');
        // Get all files
        const files = [...this.verificationState.keys()];
        let passed = 0;
        let failed = 0;
        // Verify each file
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const result = await this.verifier.verifyCode(content, filePath);
                // Update verification state
                this.verificationState.set(filePath, {
                    filePath,
                    verified: result.passed,
                    lastVerified: Date.now(),
                    report: result
                });
                if (result.passed) {
                    passed++;
                }
                else {
                    failed++;
                }
            }
            catch (error) {
                // Update verification state
                this.verificationState.set(filePath, {
                    filePath,
                    verified: false,
                    lastVerified: Date.now(),
                    error
                });
                failed++;
            }
        }
        console.log(`✅ Verification complete: ${passed} passed, ${failed} failed`);
        return {
            total: files.length,
            passed,
            failed
        };
    }
}
exports.ContinuousVerificationEngine = ContinuousVerificationEngine;
// Export the engine
exports.default = ContinuousVerificationEngine;
//# sourceMappingURL=ContinuousVerificationEngine.js.map