/**
 * Enterprise Compliance & Governance Manager
 * SOX, HIPAA, ISO 27001, audit trails, and data governance
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { dataProtectionService } from '../security/DataProtection';
import { Counter, Gauge, register } from 'prom-client';
import crypto from 'crypto';

export interface ComplianceFramework {
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  auditFrequency: number; // days
  lastAudit?: Date;
  nextAudit: Date;
  status: 'compliant' | 'non-compliant' | 'pending' | 'expired';
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  controls: ComplianceControl[];
  evidence: string[];
  lastReview?: Date;
  status: 'implemented' | 'partial' | 'not-implemented' | 'not-applicable';
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  automated: boolean;
  implementation: string;
  testing: {
    frequency: number; // days
    lastTest?: Date;
    nextTest: Date;
    results: TestResult[];
  };
  responsible: string;
  status: 'active' | 'inactive' | 'exception';
}

export interface TestResult {
  date: Date;
  tester: string;
  outcome: 'pass' | 'fail' | 'partial';
  findings: string[];
  recommendations: string[];
  evidence: string[];
}

export interface AuditTrail {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'warning';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceRelevant: boolean;
  retention: {
    category: 'operational' | 'security' | 'financial' | 'privacy';
    retentionPeriod: number; // days
    immutable: boolean;
  };
}

export interface DataLineage {
  datasetId: string;
  source: {
    system: string;
    table: string;
    fields: string[];
  };
  transformations: Array<{
    step: number;
    process: string;
    transformation: string;
    timestamp: Date;
  }>;
  destinations: Array<{
    system: string;
    table: string;
    fields: string[];
    purpose: string;
  }>;
  classification: {
    level: 'public' | 'internal' | 'confidential' | 'restricted';
    piiFields: string[];
    retentionPeriod: number;
  };
  access: Array<{
    user: string;
    role: string;
    permissions: string[];
    lastAccess: Date;
  }>;
}

export interface PrivacyImpactAssessment {
  id: string;
  projectName: string;
  description: string;
  dataTypes: string[];
  processingPurpose: string;
  legalBasis: string;
  riskAssessment: {
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
    mitigations: string[];
  };
  dataMinimization: {
    necessary: boolean;
    proportionate: boolean;
    limited: boolean;
    accurate: boolean;
  };
  dataSubjectRights: {
    access: boolean;
    rectification: boolean;
    erasure: boolean;
    portability: boolean;
    objection: boolean;
  };
  approvals: Array<{
    role: string;
    approver: string;
    date: Date;
    status: 'approved' | 'rejected' | 'conditional';
  }>;
  reviewDate: Date;
  status: 'draft' | 'under-review' | 'approved' | 'rejected';
}

// Compliance metrics
const complianceScore = new Gauge({
  name: 'compliance_score',
  help: 'Overall compliance score (0-100)',
  labelNames: ['framework'],
});

const auditTrailEvents = new Counter({
  name: 'audit_trail_events_total',
  help: 'Total number of audit trail events',
  labelNames: ['action', 'outcome', 'risk_level'],
});

const complianceViolations = new Counter({
  name: 'compliance_violations_total',
  help: 'Total number of compliance violations',
  labelNames: ['framework', 'requirement', 'severity'],
});

const dataAccess = new Counter({
  name: 'data_access_events_total',
  help: 'Total number of data access events',
  labelNames: ['user', 'resource', 'classification'],
});

register.registerMetric(complianceScore);
register.registerMetric(auditTrailEvents);
register.registerMetric(complianceViolations);
register.registerMetric(dataAccess);

export class ComplianceManager extends EventEmitter {
  private static instance: ComplianceManager;
  private frameworks = new Map<string, ComplianceFramework>();
  private auditTrails: AuditTrail[] = [];
  private dataLineageMap = new Map<string, DataLineage>();
  private privacyAssessments = new Map<string, PrivacyImpactAssessment>();
  private maxAuditTrailSize = 10000;
  private auditTrailCleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupComplianceFrameworks();
    this.startAuditTrailCleanup();
  }

  static getInstance(): ComplianceManager {
    if (!ComplianceManager.instance) {
      ComplianceManager.instance = new ComplianceManager();
    }
    return ComplianceManager.instance;
  }

  /**
   * Log audit trail event
   */
  async logAuditEvent(event: Omit<AuditTrail, 'id' | 'timestamp'>): Promise<string> {
    const auditEvent: AuditTrail = {
      ...event,
      id: this.generateAuditId(),
      timestamp: new Date(),
    };

    // Add to audit trail
    this.auditTrails.push(auditEvent);

    // Manage size
    if (this.auditTrails.length > this.maxAuditTrailSize) {
      this.auditTrails.shift();
    }

    // Update metrics
    auditTrailEvents.inc({
      action: event.action,
      outcome: event.outcome,
      risk_level: event.riskLevel,
    });

    // Log high-risk events
    if (event.riskLevel === 'critical' || event.riskLevel === 'high') {
      logger.warn({
        auditId: auditEvent.id,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        riskLevel: event.riskLevel,
      }, 'High-risk audit event');
    }

    // Check for compliance violations
    await this.checkComplianceViolations(auditEvent);

    this.emit('audit:logged', auditEvent);
    return auditEvent.id;
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    userId: string,
    resource: string,
    classification: string,
    action: string,
    success: boolean
  ): Promise<void> {
    await this.logAuditEvent({
      userId,
      action: `data_access_${action}`,
      resource,
      details: { classification, success },
      outcome: success ? 'success' : 'failure',
      riskLevel: this.determineDataAccessRisk(classification, action),
      complianceRelevant: true,
      retention: {
        category: 'privacy',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });

    dataAccess.inc({ user: userId, resource, classification });
  }

  /**
   * Create privacy impact assessment
   */
  async createPrivacyImpactAssessment(pia: Omit<PrivacyImpactAssessment, 'id'>): Promise<string> {
    const piaId = this.generatePIAId();
    const fullPIA: PrivacyImpactAssessment = {
      ...pia,
      id: piaId,
    };

    this.privacyAssessments.set(piaId, fullPIA);

    logger.info({
      piaId,
      projectName: pia.projectName,
      overallRisk: pia.riskAssessment.overallRisk,
    }, 'Privacy impact assessment created');

    await this.logAuditEvent({
      userId: 'system',
      action: 'privacy_impact_assessment_created',
      resource: `pia:${piaId}`,
      details: { projectName: pia.projectName, overallRisk: pia.riskAssessment.overallRisk },
      outcome: 'success',
      riskLevel: 'medium',
      complianceRelevant: true,
      retention: {
        category: 'privacy',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });

    return piaId;
  }

  /**
   * Register data lineage
   */
  async registerDataLineage(lineage: DataLineage): Promise<void> {
    this.dataLineageMap.set(lineage.datasetId, lineage);

    logger.info({
      datasetId: lineage.datasetId,
      source: lineage.source.system,
      destinations: lineage.destinations.length,
      classification: lineage.classification.level,
    }, 'Data lineage registered');

    await this.logAuditEvent({
      userId: 'system',
      action: 'data_lineage_registered',
      resource: `dataset:${lineage.datasetId}`,
      details: {
        source: lineage.source.system,
        classification: lineage.classification.level,
        piiFields: lineage.classification.piiFields.length,
      },
      outcome: 'success',
      riskLevel: lineage.classification.level === 'restricted' ? 'high' : 'medium',
      complianceRelevant: true,
      retention: {
        category: 'operational',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(frameworkName: string): Promise<{
    framework: ComplianceFramework;
    summary: {
      overallScore: number;
      implementedRequirements: number;
      totalRequirements: number;
      criticalIssues: number;
      lastAuditDate?: Date;
    };
    requirements: Array<{
      requirement: ComplianceRequirement;
      complianceGaps: string[];
      recommendations: string[];
    }>;
    auditTrailSummary: {
      totalEvents: number;
      highRiskEvents: number;
      recentViolations: number;
    };
  }> {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Framework ${frameworkName} not found`);
    }

    // Calculate compliance score
    const implementedRequirements = framework.requirements.filter(
      req => req.status === 'implemented'
    ).length;
    const totalRequirements = framework.requirements.length;
    const overallScore = Math.round((implementedRequirements / totalRequirements) * 100);

    // Count critical issues
    const criticalIssues = framework.requirements.filter(
      req => req.priority === 'critical' && req.status !== 'implemented'
    ).length;

    // Analyze requirements
    const requirementAnalysis = framework.requirements.map(requirement => {
      const gaps = this.identifyComplianceGaps(requirement);
      const recommendations = this.generateRecommendations(requirement, gaps);
      
      return {
        requirement,
        complianceGaps: gaps,
        recommendations,
      };
    });

    // Audit trail summary
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentEvents = this.auditTrails.filter(event => event.timestamp >= last30Days);
    const highRiskEvents = recentEvents.filter(
      event => event.riskLevel === 'high' || event.riskLevel === 'critical'
    ).length;
    
    // Update compliance score metric
    complianceScore.set({ framework: frameworkName }, overallScore);

    const report = {
      framework,
      summary: {
        overallScore,
        implementedRequirements,
        totalRequirements,
        criticalIssues,
        lastAuditDate: framework.lastAudit,
      },
      requirements: requirementAnalysis,
      auditTrailSummary: {
        totalEvents: this.auditTrails.length,
        highRiskEvents,
        recentViolations: 0, // Would be calculated based on violation detection
      },
    };

    // Log report generation
    await this.logAuditEvent({
      userId: 'system',
      action: 'compliance_report_generated',
      resource: `framework:${frameworkName}`,
      details: {
        overallScore,
        criticalIssues,
        implementedRequirements,
        totalRequirements,
      },
      outcome: 'success',
      riskLevel: criticalIssues > 0 ? 'high' : 'medium',
      complianceRelevant: true,
      retention: {
        category: 'operational',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });

    return report;
  }

  /**
   * Execute compliance control test
   */
  async executeControlTest(
    frameworkName: string,
    requirementId: string,
    controlId: string,
    tester: string
  ): Promise<TestResult> {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Framework ${frameworkName} not found`);
    }

    const requirement = framework.requirements.find(req => req.id === requirementId);
    if (!requirement) {
      throw new Error(`Requirement ${requirementId} not found`);
    }

    const control = requirement.controls.find(ctrl => ctrl.id === controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    // Execute test based on control type
    const testResult = await this.performControlTest(control);
    
    const result: TestResult = {
      date: new Date(),
      tester,
      outcome: testResult.outcome,
      findings: testResult.findings,
      recommendations: testResult.recommendations,
      evidence: testResult.evidence,
    };

    // Add result to control testing history
    control.testing.results.push(result);
    control.testing.lastTest = result.date;
    
    // Calculate next test date
    const nextTestDate = new Date(result.date);
    nextTestDate.setDate(nextTestDate.getDate() + control.testing.frequency);
    control.testing.nextTest = nextTestDate;

    // Log test execution
    await this.logAuditEvent({
      userId: tester,
      action: 'compliance_control_tested',
      resource: `control:${controlId}`,
      details: {
        framework: frameworkName,
        requirement: requirementId,
        outcome: result.outcome,
        findings: result.findings.length,
      },
      outcome: 'success',
      riskLevel: result.outcome === 'fail' ? 'high' : 'low',
      complianceRelevant: true,
      retention: {
        category: 'operational',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });

    // Record violations for failed tests
    if (result.outcome === 'fail') {
      complianceViolations.inc({
        framework: frameworkName,
        requirement: requirementId,
        severity: requirement.priority,
      });
    }

    logger.info({
      framework: frameworkName,
      requirement: requirementId,
      control: controlId,
      outcome: result.outcome,
      tester,
    }, 'Compliance control test executed');

    return result;
  }

  /**
   * Get audit trail with filters
   */
  getAuditTrail(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): AuditTrail[] {
    let filteredTrail = [...this.auditTrails];

    if (filters.userId) {
      filteredTrail = filteredTrail.filter(event => event.userId === filters.userId);
    }

    if (filters.action) {
      filteredTrail = filteredTrail.filter(event => event.action.includes(filters.action!));
    }

    if (filters.resource) {
      filteredTrail = filteredTrail.filter(event => event.resource.includes(filters.resource!));
    }

    if (filters.riskLevel) {
      filteredTrail = filteredTrail.filter(event => event.riskLevel === filters.riskLevel);
    }

    if (filters.startDate) {
      filteredTrail = filteredTrail.filter(event => event.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredTrail = filteredTrail.filter(event => event.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredTrail.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      filteredTrail = filteredTrail.slice(0, filters.limit);
    }

    return filteredTrail;
  }

  /**
   * Get data lineage for dataset
   */
  getDataLineage(datasetId: string): DataLineage | undefined {
    return this.dataLineageMap.get(datasetId);
  }

  /**
   * Get all privacy impact assessments
   */
  getPrivacyImpactAssessments(status?: PrivacyImpactAssessment['status']): PrivacyImpactAssessment[] {
    const assessments = Array.from(this.privacyAssessments.values());
    
    if (status) {
      return assessments.filter(pia => pia.status === status);
    }
    
    return assessments;
  }

  /**
   * Export compliance data for external audit
   */
  async exportComplianceData(frameworkName: string): Promise<{
    framework: ComplianceFramework;
    auditTrail: AuditTrail[];
    dataLineage: DataLineage[];
    privacyAssessments: PrivacyImpactAssessment[];
    exportMetadata: {
      exportDate: Date;
      exportedBy: string;
      version: string;
      checksum: string;
    };
  }> {
    const framework = this.frameworks.get(frameworkName);
    if (!framework) {
      throw new Error(`Framework ${frameworkName} not found`);
    }

    const relevantAuditTrail = this.auditTrails.filter(event => event.complianceRelevant);
    const allDataLineage = Array.from(this.dataLineageMap.values());
    const allPIAs = Array.from(this.privacyAssessments.values());

    const exportData = {
      framework,
      auditTrail: relevantAuditTrail,
      dataLineage: allDataLineage,
      privacyAssessments: allPIAs,
      exportMetadata: {
        exportDate: new Date(),
        exportedBy: 'system',
        version: '1.0',
        checksum: '',
      },
    };

    // Generate checksum for data integrity
    const dataString = JSON.stringify({
      framework: exportData.framework,
      auditTrail: exportData.auditTrail,
      dataLineage: exportData.dataLineage,
      privacyAssessments: exportData.privacyAssessments,
    });
    
    exportData.exportMetadata.checksum = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');

    // Log export
    await this.logAuditEvent({
      userId: 'system',
      action: 'compliance_data_exported',
      resource: `framework:${frameworkName}`,
      details: {
        auditTrailEvents: relevantAuditTrail.length,
        dataLineageEntries: allDataLineage.length,
        privacyAssessments: allPIAs.length,
        checksum: exportData.exportMetadata.checksum,
      },
      outcome: 'success',
      riskLevel: 'medium',
      complianceRelevant: true,
      retention: {
        category: 'operational',
        retentionPeriod: 2555, // 7 years
        immutable: true,
      },
    });

    return exportData;
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(auditEvent: AuditTrail): Promise<void> {
    // Check for suspicious patterns
    if (auditEvent.action.includes('data_access') && auditEvent.outcome === 'failure') {
      // Multiple failed access attempts
      const recentFailures = this.auditTrails.filter(event => 
        event.userId === auditEvent.userId &&
        event.action.includes('data_access') &&
        event.outcome === 'failure' &&
        event.timestamp.getTime() > Date.now() - 15 * 60 * 1000 // Last 15 minutes
      );

      if (recentFailures.length >= 5) {
        logger.warn({
          userId: auditEvent.userId,
          failures: recentFailures.length,
        }, 'Multiple data access failures detected');
      }
    }

    // Check for off-hours access to sensitive data
    if (auditEvent.action.includes('data_access') && 
        auditEvent.details.classification === 'restricted') {
      const hour = auditEvent.timestamp.getHours();
      if (hour < 6 || hour > 22) { // Outside business hours
        logger.warn({
          userId: auditEvent.userId,
          resource: auditEvent.resource,
          time: auditEvent.timestamp,
        }, 'Off-hours access to restricted data');
      }
    }
  }

  /**
   * Determine risk level for data access
   */
  private determineDataAccessRisk(classification: string, action: string): AuditTrail['riskLevel'] {
    if (classification === 'restricted') {
      return action.includes('delete') || action.includes('modify') ? 'critical' : 'high';
    }
    if (classification === 'confidential') {
      return action.includes('delete') ? 'high' : 'medium';
    }
    return 'low';
  }

  /**
   * Identify compliance gaps for requirement
   */
  private identifyComplianceGaps(requirement: ComplianceRequirement): string[] {
    const gaps: string[] = [];

    if (requirement.status !== 'implemented') {
      gaps.push(`Requirement not fully implemented: ${requirement.status}`);
    }

    // Check control testing
    for (const control of requirement.controls) {
      if (control.testing.results.length === 0) {
        gaps.push(`Control ${control.id} has never been tested`);
      } else {
        const lastResult = control.testing.results[control.testing.results.length - 1];
        if (lastResult.outcome === 'fail') {
          gaps.push(`Control ${control.id} failed last test`);
        }
        
        const daysSinceLastTest = (Date.now() - lastResult.date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastTest > control.testing.frequency * 1.5) {
          gaps.push(`Control ${control.id} testing overdue`);
        }
      }
    }

    // Check documentation
    if (requirement.evidence.length === 0) {
      gaps.push('No evidence documented');
    }

    return gaps;
  }

  /**
   * Generate recommendations for requirement
   */
  private generateRecommendations(requirement: ComplianceRequirement, gaps: string[]): string[] {
    const recommendations: string[] = [];

    if (gaps.some(gap => gap.includes('not fully implemented'))) {
      recommendations.push('Complete implementation of all required controls');
    }

    if (gaps.some(gap => gap.includes('never been tested'))) {
      recommendations.push('Establish regular testing schedule for all controls');
    }

    if (gaps.some(gap => gap.includes('failed last test'))) {
      recommendations.push('Remediate failed controls and retest');
    }

    if (gaps.some(gap => gap.includes('testing overdue'))) {
      recommendations.push('Update testing frequency and execute overdue tests');
    }

    if (gaps.some(gap => gap.includes('No evidence'))) {
      recommendations.push('Document evidence and maintain proper records');
    }

    return recommendations;
  }

  /**
   * Perform control test
   */
  private async performControlTest(control: ComplianceControl): Promise<{
    outcome: 'pass' | 'fail' | 'partial';
    findings: string[];
    recommendations: string[];
    evidence: string[];
  }> {
    // Simplified test execution - in practice would integrate with actual testing tools
    const isAutomated = control.automated;
    const hasImplementation = control.implementation && control.implementation.length > 0;
    
    if (!hasImplementation) {
      return {
        outcome: 'fail',
        findings: ['Control implementation not found or documented'],
        recommendations: ['Implement and document the control'],
        evidence: [],
      };
    }

    if (isAutomated) {
      // Simulate automated test
      const success = Math.random() > 0.1; // 90% success rate
      return {
        outcome: success ? 'pass' : 'fail',
        findings: success ? [] : ['Automated test failed'],
        recommendations: success ? [] : ['Review and fix automated control'],
        evidence: ['Automated test results'],
      };
    } else {
      // Manual test would require human verification
      return {
        outcome: 'partial',
        findings: ['Manual verification required'],
        recommendations: ['Complete manual testing and documentation'],
        evidence: ['Manual review checklist'],
      };
    }
  }

  /**
   * Setup compliance frameworks
   */
  private setupComplianceFrameworks(): void {
    // SOX Compliance Framework
    this.frameworks.set('SOX', {
      name: 'Sarbanes-Oxley Act',
      version: '2002',
      auditFrequency: 365, // Annual
      nextAudit: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'pending',
      requirements: [
        {
          id: 'SOX-302',
          title: 'Corporate Responsibility for Financial Reports',
          description: 'CEO and CFO certification of financial reports',
          category: 'Financial Reporting',
          priority: 'critical',
          status: 'implemented',
          evidence: ['CEO/CFO certifications', 'Internal control assessments'],
          controls: [
            {
              id: 'SOX-302-001',
              name: 'Financial Report Review',
              description: 'Quarterly review and certification process',
              type: 'detective',
              automated: false,
              implementation: 'Manual review process with documented sign-offs',
              responsible: 'CFO',
              status: 'active',
              testing: {
                frequency: 90, // Quarterly
                nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                results: [],
              },
            },
          ],
        },
        {
          id: 'SOX-404',
          title: 'Management Assessment of Internal Controls',
          description: 'Annual assessment of internal control effectiveness',
          category: 'Internal Controls',
          priority: 'critical',
          status: 'implemented',
          evidence: ['Internal control documentation', 'Annual assessment reports'],
          controls: [
            {
              id: 'SOX-404-001',
              name: 'Internal Control Testing',
              description: 'Annual testing of key financial controls',
              type: 'detective',
              automated: true,
              implementation: 'Automated control testing framework',
              responsible: 'Internal Audit',
              status: 'active',
              testing: {
                frequency: 365, // Annual
                nextTest: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                results: [],
              },
            },
          ],
        },
      ],
    });

    // ISO 27001 Framework
    this.frameworks.set('ISO27001', {
      name: 'ISO/IEC 27001:2013',
      version: '2013',
      auditFrequency: 365, // Annual
      nextAudit: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'pending',
      requirements: [
        {
          id: 'A.9.1.1',
          title: 'Access Control Policy',
          description: 'Information access control policy shall be established',
          category: 'Access Control',
          priority: 'high',
          status: 'implemented',
          evidence: ['Access control policy document', 'Policy approval records'],
          controls: [
            {
              id: 'A.9.1.1-001',
              name: 'Access Policy Review',
              description: 'Annual review of access control policies',
              type: 'detective',
              automated: false,
              implementation: 'Annual policy review process',
              responsible: 'Security Team',
              status: 'active',
              testing: {
                frequency: 365, // Annual
                nextTest: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                results: [],
              },
            },
          ],
        },
      ],
    });
  }

  /**
   * Start audit trail cleanup process
   */
  private startAuditTrailCleanup(): void {
    this.auditTrailCleanupInterval = setInterval(() => {
      this.cleanupAuditTrail();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Cleanup old audit trail entries based on retention policy
   */
  private cleanupAuditTrail(): void {
    const now = new Date();
    let cleaned = 0;

    this.auditTrails = this.auditTrails.filter(event => {
      const retentionMs = event.retention.retentionPeriod * 24 * 60 * 60 * 1000;
      const expiry = new Date(event.timestamp.getTime() + retentionMs);
      
      if (now > expiry && !event.retention.immutable) {
        cleaned++;
        return false;
      }
      return true;
    });

    if (cleaned > 0) {
      logger.info({ cleaned }, 'Cleaned up expired audit trail entries');
    }
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique PIA ID
   */
  private generatePIAId(): string {
    return `pia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.auditTrailCleanupInterval) {
      clearInterval(this.auditTrailCleanupInterval);
    }
  }
}

// Export singleton instance
export const complianceManager = ComplianceManager.getInstance();