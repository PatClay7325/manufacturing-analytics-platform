/**
 * Continuous Verification Engine
 *
 * Provides real-time monitoring and verification of code during development.
 * Ensures code quality standards are maintained throughout the development process.
 */
import { VerificationResult, VerificationOptions } from './QuantumVerifier';
export interface ContinuousVerificationOptions {
    verifier: Partial<VerificationOptions>;
    watchPaths: string[];
    ignorePaths: string[];
    gitMonitoring: boolean;
    autoFix: boolean;
    commitBlocking: boolean;
    reportingInterval: number;
}
export interface VerificationState {
    filePath: string;
    verified: boolean;
    lastVerified: number;
    report?: VerificationResult;
    error?: any;
}
export type ActivityType = 'file-change' | 'verification' | 'command' | 'git-operation' | 'fix-applied';
export interface ActivityRecord {
    timestamp: number;
    activity: ActivityType;
    filePath?: string;
    data: any;
}
export interface ViolationRecord {
    timestamp: number;
    type: string;
    filePath: string;
    evidence: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
/**
 * Continuous Verification Engine
 * Monitors and verifies code in real-time
 */
export declare class ContinuousVerificationEngine {
    private options;
    private verifier;
    private watcher;
    private verificationState;
    private activityLog;
    private violations;
    private isRunning;
    constructor(options?: Partial<ContinuousVerificationOptions>);
    /**
     * Starts the continuous verification engine
     */
    start(): void;
    /**
     * Stops the continuous verification engine
     */
    stop(): void;
    /**
     * Handles file changes (add/change)
     */
    private handleFileChange;
    /**
     * Handles file removals
     */
    private handleFileRemoval;
    /**
     * Sets up Git monitoring
     */
    private setupGitMonitoring;
    /**
     * Sets up periodic reporting
     */
    private setupPeriodicReporting;
    /**
     * Logs verification issues
     */
    private logVerificationIssues;
    /**
     * Attempts to automatically fix issues
     */
    private attemptAutoFix;
    /**
     * Applies linting fixes
     */
    private applyLintingFixes;
    /**
     * Applies security fixes
     */
    private applySecurityFixes;
    /**
     * Applies accessibility fixes
     */
    private applyAccessibilityFixes;
    /**
     * Records an activity
     */
    private recordActivity;
    /**
     * Records a violation
     */
    private recordViolation;
    /**
     * Generates a verification report
     */
    private generateReport;
    /**
     * Gets the current verification state
     */
    getVerificationState(): Map<string, VerificationState>;
    /**
     * Gets the verification report for a file
     */
    getFileReport(filePath: string): VerificationState | undefined;
    /**
     * Gets all violations
     */
    getViolations(): ViolationRecord[];
    /**
     * Gets all activities
     */
    getActivities(): ActivityRecord[];
    /**
     * Verifies all files
     */
    verifyAllFiles(): Promise<{
        total: number;
        passed: number;
        failed: number;
    }>;
}
export default ContinuousVerificationEngine;
