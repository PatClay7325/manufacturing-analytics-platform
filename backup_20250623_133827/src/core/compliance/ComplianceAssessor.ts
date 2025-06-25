/**
 * Compliance Assessor Implementation
 * 
 * This class implements the ComplianceAssessor interface and provides
 * functionality for managing assessments and generating reports.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractBaseService } from './architecture/BaseService';
import { ComplianceAssessor, ComplianceRegistry, ComplianceChecker } from './interfaces';
import {
  ComplianceAssessment,
  ComplianceCheckResult,
  ComplianceCheckStatus,
} from './types';

/**
 * Compliance assessor implementation
 */
export class ComplianceAssessorImpl extends AbstractBaseService implements ComplianceAssessor {
  /**
   * Map of assessments by ID
   */
  private assessments: Map<string, ComplianceAssessment> = new Map();
  
  /**
   * Map of assessments by profile ID
   */
  private assessmentsByProfile: Map<string, Set<string>> = new Map();
  
  /**
   * Compliance registry instance
   */
  private registry: ComplianceRegistry;
  
  /**
   * Compliance checker instance
   */
  private checker: ComplianceChecker;
  
  /**
   * Create a new compliance assessor
   * @param registry Compliance registry
   * @param checker Compliance checker
   */
  constructor(registry: ComplianceRegistry, checker: ComplianceChecker) {
    super('ComplianceAssessor', '1.0.0');
    this.registry = registry;
    this.checker = checker;
  }
  
  /**
   * Initialize the assessor
   */
  protected async doInitialize(): Promise<void> {
    // Clear maps
    this.assessments.clear();
    this.assessmentsByProfile.clear();
    
    console.log('Compliance assessor initialized');
  }
  
  /**
   * Start the assessor
   */
  protected async doStart(): Promise<void> {
    console.log('Compliance assessor started');
  }
  
  /**
   * Stop the assessor
   */
  protected async doStop(): Promise<void> {
    console.log('Compliance assessor stopped');
  }
  
  /**
   * Create a new assessment
   * @param profileId Profile ID
   * @param name Assessment name
   * @param description Assessment description
   */
  public async createAssessment(
    profileId: string,
    name: string,
    description: string
  ): Promise<ComplianceAssessment> {
    // Get profile
    const profile = await this.registry.getProfile(profileId);
    
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    // Create assessment
    const assessmentId = uuidv4();
    const now = new Date();
    
    const assessment: ComplianceAssessment = {
      id: assessmentId,
      profileId,
      name,
      description,
      startDate: now,
      status: 'in_progress',
      results: [],
      tags: [],
    };
    
    // Store assessment
    this.assessments.set(assessmentId, assessment);
    
    // Add to assessments by profile map
    if (!this.assessmentsByProfile.has(profileId)) {
      this.assessmentsByProfile.set(profileId, new Set());
    }
    this.assessmentsByProfile.get(profileId)?.add(assessmentId);
    
    console.log(`Assessment created: ${name} (${assessmentId}) for profile ${profileId}`);
    
    return { ...assessment };
  }
  
  /**
   * Get an assessment by ID
   * @param assessmentId Assessment ID
   */
  public async getAssessment(assessmentId: string): Promise<ComplianceAssessment | null> {
    const assessment = this.assessments.get(assessmentId);
    return assessment ? { ...assessment } : null;
  }
  
  /**
   * Get assessments by profile ID
   * @param profileId Profile ID
   */
  public async getAssessmentsByProfile(profileId: string): Promise<ComplianceAssessment[]> {
    const assessmentIds = this.assessmentsByProfile.get(profileId) || new Set();
    
    const assessments = Array.from(assessmentIds)
      .map(id => this.assessments.get(id))
      .filter((assessment): assessment is ComplianceAssessment => !!assessment)
      .map(assessment => ({ ...assessment }));
    
    return assessments;
  }
  
  /**
   * Run an assessment
   * @param assessmentId Assessment ID
   * @param context Context data for the assessment
   */
  public async runAssessment(
    assessmentId: string,
    context: Record<string, unknown>
  ): Promise<ComplianceAssessment> {
    // Get assessment
    const assessment = this.assessments.get(assessmentId);
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    // Get profile
    const profile = await this.registry.getProfile(assessment.profileId);
    
    if (!profile) {
      throw new Error(`Profile ${assessment.profileId} not found`);
    }
    
    // Run checks for all requirements in the profile
    const results = await this.checker.checkMultipleCompliance(
      profile.requirementIds,
      context
    );
    
    // Update assessment
    assessment.results = results;
    assessment.status = 'completed';
    assessment.endDate = new Date();
    
    // Calculate summary
    assessment.summary = this.calculateSummary(results);
    
    console.log(`Assessment completed: ${assessment.name} (${assessmentId})`);
    
    return { ...assessment };
  }
  
  /**
   * Update assessment results
   * @param assessmentId Assessment ID
   * @param results Assessment results
   */
  public async updateAssessmentResults(
    assessmentId: string,
    results: ComplianceCheckResult[]
  ): Promise<void> {
    // Get assessment
    const assessment = this.assessments.get(assessmentId);
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    // Update results
    assessment.results = [...results];
    
    // Calculate summary
    assessment.summary = this.calculateSummary(results);
    
    console.log(`Assessment results updated: ${assessment.name} (${assessmentId})`);
  }
  
  /**
   * Generate assessment report
   * @param assessmentId Assessment ID
   * @param format Report format
   */
  public async generateReport(
    assessmentId: string,
    format: 'pdf' | 'html' | 'json'
  ): Promise<string> {
    // Get assessment
    const assessment = await this.getAssessment(assessmentId);
    
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }
    
    // Get profile
    const profile = await this.registry.getProfile(assessment.profileId);
    
    if (!profile) {
      throw new Error(`Profile ${assessment.profileId} not found`);
    }
    
    // Get requirements
    const requirements = await Promise.all(
      assessment.results.map(result => this.registry.getRequirement(result.requirementId))
    );
    
    // Generate report based on format
    switch (format) {
      case 'json':
        return this.generateJsonReport(assessment, profile.name, requirements);
        
      case 'html':
        return this.generateHtmlReport(assessment, profile.name, requirements);
        
      case 'pdf':
        // For now, generate HTML report
        // In a real implementation, this would convert HTML to PDF
        return this.generateHtmlReport(assessment, profile.name, requirements);
        
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }
  
  /**
   * Calculate assessment summary
   * @param results Assessment results
   */
  private calculateSummary(results: ComplianceCheckResult[]): {
    passed: number;
    failed: number;
    notApplicable: number;
    notChecked: number;
    complianceScore: number;
  } {
    // Count results by status
    const passed = results.filter(result => result.status === ComplianceCheckStatus.PASSED).length;
    const failed = results.filter(result => result.status === ComplianceCheckStatus.FAILED).length;
    const notApplicable = results.filter(result => result.status === ComplianceCheckStatus.NOT_APPLICABLE).length;
    const notChecked = results.filter(result => result.status === ComplianceCheckStatus.NOT_CHECKED).length;
    
    // Calculate compliance score (percentage of passed checks out of applicable checks)
    const applicableChecks = passed + failed;
    const complianceScore = applicableChecks > 0 ? (passed / applicableChecks) * 100 : 0;
    
    return {
      passed,
      failed,
      notApplicable,
      notChecked,
      complianceScore,
    };
  }
  
  /**
   * Generate JSON report
   * @param assessment Assessment
   * @param profileName Profile name
   * @param requirements Requirements
   */
  private generateJsonReport(
    assessment: ComplianceAssessment,
    profileName: string,
    requirements: (ComplianceRequirement | null)[]
  ): string {
    // Create report object
    const report = {
      assessment: {
        id: assessment.id,
        name: assessment.name,
        description: assessment.description,
        profile: {
          id: assessment.profileId,
          name: profileName,
        },
        startDate: assessment.startDate,
        endDate: assessment.endDate,
        status: assessment.status,
        summary: assessment.summary,
      },
      results: assessment.results.map((result, index) => {
        const requirement = requirements[index];
        
        return {
          requirement: requirement ? {
            id: requirement.id,
            code: requirement.code,
            name: requirement.name,
            description: requirement.description,
            level: requirement.level,
            category: requirement.category,
          } : { id: result.requirementId },
          status: result.status,
          details: result.details,
          evidence: result.evidence,
          remediation: result.remediation,
          timestamp: result.timestamp,
        };
      }),
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Generate HTML report
   * @param assessment Assessment
   * @param profileName Profile name
   * @param requirements Requirements
   */
  private generateHtmlReport(
    assessment: ComplianceAssessment,
    profileName: string,
    requirements: (ComplianceRequirement | null)[]
  ): string {
    // Format date
    const formatDate = (date?: Date) => {
      if (!date) return 'N/A';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };
    
    // Get status class
    const getStatusClass = (status: ComplianceCheckStatus) => {
      switch (status) {
        case ComplianceCheckStatus.PASSED:
          return 'status-passed';
        case ComplianceCheckStatus.FAILED:
          return 'status-failed';
        case ComplianceCheckStatus.NOT_APPLICABLE:
          return 'status-na';
        case ComplianceCheckStatus.NOT_CHECKED:
          return 'status-not-checked';
        default:
          return '';
      }
    };
    
    // Generate HTML
    return `<!DOCTYPE html>
<html>
<head>
  <title>Compliance Assessment Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .summary { display: flex; margin: 20px 0; }
    .summary-item { flex: 1; padding: 10px; text-align: center; border: 1px solid #ddd; margin-right: 10px; }
    .summary-item:last-child { margin-right: 0; }
    .summary-item h3 { margin: 0; }
    .summary-item.score { background-color: #f8f8f8; }
    .status-passed { background-color: #dff0d8; }
    .status-failed { background-color: #f2dede; }
    .status-na { background-color: #fcf8e3; }
    .status-not-checked { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Compliance Assessment Report</h1>
  
  <div>
    <p><strong>Assessment:</strong> ${assessment.name}</p>
    <p><strong>Description:</strong> ${assessment.description}</p>
    <p><strong>Profile:</strong> ${profileName}</p>
    <p><strong>Start Date:</strong> ${formatDate(assessment.startDate)}</p>
    <p><strong>End Date:</strong> ${formatDate(assessment.endDate)}</p>
    <p><strong>Status:</strong> ${assessment.status}</p>
  </div>
  
  <h2>Summary</h2>
  
  <div class="summary">
    <div class="summary-item">
      <h3>${assessment.summary?.passed || 0}</h3>
      <p>Passed</p>
    </div>
    <div class="summary-item">
      <h3>${assessment.summary?.failed || 0}</h3>
      <p>Failed</p>
    </div>
    <div class="summary-item">
      <h3>${assessment.summary?.notApplicable || 0}</h3>
      <p>Not Applicable</p>
    </div>
    <div class="summary-item">
      <h3>${assessment.summary?.notChecked || 0}</h3>
      <p>Not Checked</p>
    </div>
    <div class="summary-item score">
      <h3>${assessment.summary?.complianceScore.toFixed(1) || 0}%</h3>
      <p>Compliance Score</p>
    </div>
  </div>
  
  <h2>Results</h2>
  
  <table>
    <tr>
      <th>Requirement</th>
      <th>Description</th>
      <th>Category</th>
      <th>Level</th>
      <th>Status</th>
      <th>Details</th>
    </tr>
    ${assessment.results.map((result, index) => {
      const requirement = requirements[index];
      return `
    <tr class="${getStatusClass(result.status)}">
      <td>${requirement?.code || 'Unknown'}</td>
      <td>${requirement?.name || 'Unknown'}</td>
      <td>${requirement?.category || 'Unknown'}</td>
      <td>${requirement?.level || 'Unknown'}</td>
      <td>${result.status}</td>
      <td>${result.details || ''}</td>
    </tr>`;
    }).join('')}
  </table>
</body>
</html>`;
  }
}