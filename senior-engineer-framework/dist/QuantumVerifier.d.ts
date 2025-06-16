/**
 * Quantum Verifier Core Engine
 *
 * Provides comprehensive verification capabilities for code quality,
 * type safety, security, performance, and more.
 *
 * This is the core engine behind the Senior Engineer Framework v9.0
 */
export interface VerificationOptions {
    strict: boolean;
    typeCheckLevel: 'standard' | 'strict' | 'quantum';
    securityCheckLevel: 'standard' | 'strict' | 'quantum';
    performanceCheckLevel: 'standard' | 'strict' | 'quantum';
    testRequirements: {
        coverageThreshold: number;
        unitTestsRequired: boolean;
        integrationTestsRequired: boolean;
        e2eTestsRequired: boolean;
    };
    evidenceStore: {
        enabled: boolean;
        storageLocation: string;
        useBlockchain: boolean;
    };
}
export interface VerificationResult {
    passed: boolean;
    verificationId: string;
    timestamp: string;
    stages: {
        typeCheck: StageResult;
        linting: StageResult;
        security: StageResult;
        tests: TestStageResult;
        performance: PerformanceStageResult;
        accessibility: StageResult;
    };
    metrics: QualityMetrics;
    evidencePackage?: EvidencePackage;
}
export interface StageResult {
    passed: boolean;
    score: number;
    details: any[];
}
export interface TestStageResult extends StageResult {
    coverage: number;
    details: {
        unitTests: number;
        integrationTests: number;
        e2eTests: number;
        passRate: string;
    };
}
export interface PerformanceStageResult extends StageResult {
    details: {
        timeComplexity: string;
        memoryUsage: string;
        bundleSize: string;
    };
}
export interface QualityMetrics {
    overallScore: number;
    typeScore: number;
    testCoverage: number;
    securityScore: number;
    performanceScore: number;
    accessibilityScore: number;
    maintainabilityIndex: number;
}
export interface EvidencePackage {
    proofHash: string;
    blockchainRecord?: {
        blockIndex: number;
        previousHash: string;
        timestamp: string;
        nonce: number;
    };
    immutableEvidence: {
        testResults: string;
        coverageReport: string;
        securityAnalysis: string;
        performanceProfile: string;
    };
}
/**
 * Quantum Verifier - Core verification engine
 */
export declare class QuantumVerifier {
    private options;
    private evidenceStore;
    constructor(options?: Partial<VerificationOptions>);
    /**
     * Verifies code meets all quality requirements
     */
    verifyCode(code: string, filePath?: string): Promise<VerificationResult>;
    /**
     * Performs comprehensive type checking
     */
    private performTypeCheck;
    /**
     * Performs quantum type checking beyond TypeScript's capabilities
     */
    private performQuantumTypeCheck;
    /**
     * Performs linting
     */
    private performLinting;
    /**
     * Performs security analysis
     */
    private performSecurityCheck;
    /**
     * Generates and runs tests for the code
     */
    private generateAndRunTests;
    /**
     * Analyzes code performance
     */
    private analyzePerformance;
    /**
     * Verifies accessibility
     */
    private verifyAccessibility;
    /**
     * Calculates quality metrics based on verification results
     */
    private calculateQualityMetrics;
    /**
     * Extracts functions from code
     */
    private extractFunctions;
    /**
     * Extracts conditional statements from code
     */
    private extractConditionals;
    /**
     * Creates a temporary file for analysis
     */
    private createTempFile;
    /**
     * Deletes a temporary file
     */
    private deleteTempFile;
    /**
     * Generates a unique verification ID
     */
    private generateVerificationId;
}
export default QuantumVerifier;
