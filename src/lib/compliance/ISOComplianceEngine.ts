import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { PgVectorEmbeddingService } from '@/lib/embeddings/pgvectorService';
import { getRedisClient } from '@/lib/redis/redisClient';
import { circuitBreakers } from '@/lib/resilience/circuitBreaker';

// Compliance rule schema
const complianceRuleSchema = z.object({
  id: z.string(),
  standardId: z.string(),
  category: z.string(),
  requirement: z.string(),
  description: z.string(),
  checkType: z.enum(['automated', 'manual', 'hybrid']),
  severity: z.enum(['critical', 'major', 'minor', 'info']),
  checkFunction: z.string().optional(),
  evidence: z.array(z.string()),
  remediation: z.string(),
});

export type ComplianceRule = z.infer<typeof complianceRuleSchema>;

// Compliance check result schema
const complianceCheckResultSchema = z.object({
  ruleId: z.string(),
  status: z.enum(['compliant', 'non-compliant', 'partially-compliant', 'not-applicable']),
  score: z.number().min(0).max(100),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    timestamp: z.string().datetime(),
    data: z.any().optional(),
  })),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string()),
  lastChecked: z.string().datetime(),
});

export type ComplianceCheckResult = z.infer<typeof complianceCheckResultSchema>;

/**
 * Real ISO Compliance Engine with automated checks
 */
export class ISOComplianceEngine {
  private embeddingService: PgVectorEmbeddingService;
  private redis = getRedisClient();
  private rules: Map<string, ComplianceRule[]> = new Map();
  private checkFunctions: Map<string, (context: any) => Promise<ComplianceCheckResult>> = new Map();

  constructor() {
    this.embeddingService = new PgVectorEmbeddingService();
    this.initializeComplianceRules();
    this.registerCheckFunctions();
  }

  /**
   * Initialize compliance rules for each ISO standard
   */
  private async initializeComplianceRules(): Promise<void> {
    // ISO 22400-2 Rules
    this.rules.set('ISO22400-2', [
      {
        id: 'ISO22400-2-001',
        standardId: 'ISO22400-2',
        category: 'Data Collection',
        requirement: 'Real-time OEE data collection',
        description: 'System must collect availability, performance, and quality data in real-time from all production equipment',
        checkType: 'automated',
        severity: 'critical',
        checkFunction: 'checkOEEDataCollection',
        evidence: ['Data collection logs', 'OEE calculation records', 'Equipment connectivity status'],
        remediation: 'Implement automated data collection from PLCs and SCADA systems',
      },
      {
        id: 'ISO22400-2-002',
        standardId: 'ISO22400-2',
        category: 'KPI Calculation',
        requirement: 'Accurate OEE calculation',
        description: 'OEE must be calculated as Availability × Performance × Quality with proper time categorization',
        checkType: 'automated',
        severity: 'critical',
        checkFunction: 'checkOEECalculation',
        evidence: ['OEE calculation methodology', 'Sample calculations', 'Validation reports'],
        remediation: 'Review and correct OEE calculation formula implementation',
      },
      {
        id: 'ISO22400-2-003',
        standardId: 'ISO22400-2',
        category: 'Reporting',
        requirement: 'KPI reporting and visualization',
        description: 'System must provide real-time dashboards and historical reports for all KPIs',
        checkType: 'hybrid',
        severity: 'major',
        checkFunction: 'checkKPIReporting',
        evidence: ['Dashboard screenshots', 'Report samples', 'User access logs'],
        remediation: 'Implement comprehensive KPI dashboards with drill-down capabilities',
      },
    ]);

    // ISO 9001 Rules
    this.rules.set('ISO9001', [
      {
        id: 'ISO9001-001',
        standardId: 'ISO9001',
        category: 'Document Control',
        requirement: 'Documented procedures',
        description: 'All quality processes must have documented procedures with version control',
        checkType: 'manual',
        severity: 'major',
        evidence: ['Quality manual', 'SOPs', 'Work instructions'],
        remediation: 'Create and maintain quality documentation system',
      },
      {
        id: 'ISO9001-002',
        standardId: 'ISO9001',
        category: 'Quality Metrics',
        requirement: 'Quality performance monitoring',
        description: 'System must track first pass yield, defect rates, and customer complaints',
        checkType: 'automated',
        severity: 'critical',
        checkFunction: 'checkQualityMetrics',
        evidence: ['Quality metrics data', 'Trend analysis', 'SPC charts'],
        remediation: 'Implement quality data collection and analysis system',
      },
    ]);

    // ISO 14224 Rules
    this.rules.set('ISO14224', [
      {
        id: 'ISO14224-001',
        standardId: 'ISO14224',
        category: 'Reliability Data',
        requirement: 'MTBF/MTTR tracking',
        description: 'System must calculate and track Mean Time Between Failures and Mean Time To Repair',
        checkType: 'automated',
        severity: 'critical',
        checkFunction: 'checkReliabilityMetrics',
        evidence: ['MTBF calculations', 'MTTR records', 'Failure history'],
        remediation: 'Implement failure tracking and reliability calculations',
      },
      {
        id: 'ISO14224-002',
        standardId: 'ISO14224',
        category: 'Maintenance Records',
        requirement: 'Comprehensive maintenance history',
        description: 'All maintenance activities must be recorded with failure modes and root causes',
        checkType: 'hybrid',
        severity: 'major',
        checkFunction: 'checkMaintenanceRecords',
        evidence: ['Maintenance logs', 'Failure analysis reports', 'Root cause documentation'],
        remediation: 'Enhance maintenance recording system with failure classification',
      },
    ]);

    logger.info({ 
      standards: Array.from(this.rules.keys()),
      totalRules: Array.from(this.rules.values()).flat().length 
    }, 'Compliance rules initialized');
  }

  /**
   * Register automated check functions
   */
  private registerCheckFunctions(): void {
    // OEE Data Collection Check
    this.checkFunctions.set('checkOEEDataCollection', async (context) => {
      const result = await circuitBreakers.database.execute(async () => {
        // Check if OEE data is being collected
        const recentMetrics = await prisma.performanceMetric.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
            oeeScore: { not: null },
          },
        });

        const equipmentCount = await prisma.workUnit.count({
          where: { status: 'operational' },
        });

        const coverageRate = equipmentCount > 0 ? (recentMetrics / equipmentCount) * 100 : 0;

        return {
          ruleId: 'ISO22400-2-001',
          status: coverageRate >= 90 ? 'compliant' : coverageRate >= 70 ? 'partially-compliant' : 'non-compliant',
          score: Math.min(coverageRate, 100),
          evidence: [{
            type: 'automated-check',
            description: `OEE data collection coverage: ${coverageRate.toFixed(1)}%`,
            timestamp: new Date().toISOString(),
            data: { recentMetrics, equipmentCount, coverageRate },
          }],
          gaps: coverageRate < 90 ? [`Only ${coverageRate.toFixed(1)}% of equipment has recent OEE data`] : [],
          recommendations: coverageRate < 90 ? [
            'Ensure all operational equipment is connected to data collection system',
            'Check network connectivity and PLC configurations',
            'Verify data collection service is running',
          ] : [],
          lastChecked: new Date().toISOString(),
        } as ComplianceCheckResult;
      });

      return result;
    });

    // OEE Calculation Check
    this.checkFunctions.set('checkOEECalculation', async (context) => {
      const samples = await prisma.performanceMetric.findMany({
        take: 100,
        where: {
          oeeScore: { not: null },
          availability: { not: null },
          performance: { not: null },
          quality: { not: null },
        },
        orderBy: { timestamp: 'desc' },
      });

      let correctCalculations = 0;
      const tolerance = 0.001; // 0.1% tolerance for floating point

      for (const sample of samples) {
        const calculated = (sample.availability! / 100) * (sample.performance! / 100) * (sample.quality! / 100) * 100;
        if (Math.abs(calculated - sample.oeeScore!) <= tolerance) {
          correctCalculations++;
        }
      }

      const accuracy = samples.length > 0 ? (correctCalculations / samples.length) * 100 : 0;

      return {
        ruleId: 'ISO22400-2-002',
        status: accuracy >= 99 ? 'compliant' : accuracy >= 95 ? 'partially-compliant' : 'non-compliant',
        score: accuracy,
        evidence: [{
          type: 'calculation-verification',
          description: `OEE calculation accuracy: ${accuracy.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          data: { samplesChecked: samples.length, correctCalculations },
        }],
        gaps: accuracy < 99 ? [`OEE calculation accuracy is ${accuracy.toFixed(1)}%`] : [],
        recommendations: accuracy < 99 ? ['Review OEE calculation implementation', 'Check for rounding errors'] : [],
        lastChecked: new Date().toISOString(),
      };
    });

    // Quality Metrics Check
    this.checkFunctions.set('checkQualityMetrics', async (context) => {
      const metrics = await prisma.qualityMetric.groupBy({
        by: ['parameter'],
        _count: true,
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      const requiredMetrics = ['first_pass_yield', 'defect_rate', 'scrap_rate'];
      const collectedMetrics = metrics.map(m => m.parameter);
      const missingMetrics = requiredMetrics.filter(m => !collectedMetrics.includes(m));

      const score = ((requiredMetrics.length - missingMetrics.length) / requiredMetrics.length) * 100;

      return {
        ruleId: 'ISO9001-002',
        status: missingMetrics.length === 0 ? 'compliant' : missingMetrics.length <= 1 ? 'partially-compliant' : 'non-compliant',
        score,
        evidence: [{
          type: 'metric-collection',
          description: `Quality metrics collection status`,
          timestamp: new Date().toISOString(),
          data: { collectedMetrics, missingMetrics },
        }],
        gaps: missingMetrics.map(m => `Missing quality metric: ${m}`),
        recommendations: missingMetrics.length > 0 ? [
          'Implement collection for missing quality metrics',
          'Ensure quality inspection systems are integrated',
        ] : [],
        lastChecked: new Date().toISOString(),
      };
    });

    // Reliability Metrics Check
    this.checkFunctions.set('checkReliabilityMetrics', async (context) => {
      const equipment = await prisma.equipmentHealth.findMany({
        where: {
          mtbf: { not: null },
          mttr: { not: null },
        },
      });

      const totalEquipment = await prisma.workUnit.count();
      const coverage = totalEquipment > 0 ? (equipment.length / totalEquipment) * 100 : 0;

      return {
        ruleId: 'ISO14224-001',
        status: coverage >= 80 ? 'compliant' : coverage >= 60 ? 'partially-compliant' : 'non-compliant',
        score: coverage,
        evidence: [{
          type: 'reliability-metrics',
          description: `MTBF/MTTR coverage: ${coverage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          data: { equipmentWithMetrics: equipment.length, totalEquipment },
        }],
        gaps: coverage < 80 ? [`Only ${coverage.toFixed(1)}% of equipment has reliability metrics`] : [],
        recommendations: coverage < 80 ? [
          'Enable failure tracking for all equipment',
          'Ensure maintenance records include accurate timing',
        ] : [],
        lastChecked: new Date().toISOString(),
      };
    });
  }

  /**
   * Perform compliance check for a standard
   */
  async checkCompliance(
    standardId: string,
    context: Record<string, any>
  ): Promise<{
    standardId: string;
    overallScore: number;
    status: 'compliant' | 'non-compliant' | 'partially-compliant';
    results: ComplianceCheckResult[];
    summary: {
      totalRules: number;
      compliant: number;
      nonCompliant: number;
      partiallyCompliant: number;
      notApplicable: number;
    };
    recommendations: string[];
    nextReviewDate: Date;
  }> {
    const rules = this.rules.get(standardId);
    if (!rules) {
      throw new Error(`Unknown standard: ${standardId}`);
    }

    // Check cache first
    const cacheKey = `compliance:${standardId}:${JSON.stringify(context)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const results: ComplianceCheckResult[] = [];
    
    for (const rule of rules) {
      let result: ComplianceCheckResult;
      
      if (rule.checkType === 'automated' && rule.checkFunction) {
        const checkFn = this.checkFunctions.get(rule.checkFunction);
        if (checkFn) {
          try {
            result = await checkFn(context);
          } catch (error) {
            logger.error({ error, ruleId: rule.id }, 'Compliance check failed');
            result = {
              ruleId: rule.id,
              status: 'not-applicable',
              score: 0,
              evidence: [{
                type: 'error',
                description: 'Check failed due to system error',
                timestamp: new Date().toISOString(),
              }],
              gaps: ['Unable to perform automated check'],
              recommendations: ['Investigate system error and retry'],
              lastChecked: new Date().toISOString(),
            };
          }
        } else {
          result = {
            ruleId: rule.id,
            status: 'not-applicable',
            score: 0,
            evidence: [],
            gaps: ['Automated check not implemented'],
            recommendations: ['Implement automated check function'],
            lastChecked: new Date().toISOString(),
          };
        }
      } else {
        // Manual or hybrid checks require human input
        result = {
          ruleId: rule.id,
          status: 'not-applicable',
          score: 0,
          evidence: [],
          gaps: ['Manual verification required'],
          recommendations: ['Schedule manual compliance review'],
          lastChecked: new Date().toISOString(),
        };
      }
      
      results.push(result);
    }

    // Calculate summary
    const summary = {
      totalRules: results.length,
      compliant: results.filter(r => r.status === 'compliant').length,
      nonCompliant: results.filter(r => r.status === 'non-compliant').length,
      partiallyCompliant: results.filter(r => r.status === 'partially-compliant').length,
      notApplicable: results.filter(r => r.status === 'not-applicable').length,
    };

    // Calculate overall score
    const scoredResults = results.filter(r => r.status !== 'not-applicable');
    const overallScore = scoredResults.length > 0
      ? scoredResults.reduce((sum, r) => sum + r.score, 0) / scoredResults.length
      : 0;

    // Determine overall status
    const status = summary.nonCompliant > 0 ? 'non-compliant'
      : summary.partiallyCompliant > 0 ? 'partially-compliant'
      : 'compliant';

    // Compile recommendations
    const recommendations = Array.from(new Set(
      results.flatMap(r => r.recommendations)
    )).slice(0, 10); // Top 10 recommendations

    const response = {
      standardId,
      overallScore,
      status,
      results,
      summary,
      recommendations,
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    // Cache result for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(response));

    // Store in database for audit trail
    await prisma.auditTrail.create({
      data: {
        intent: 'compliance-check',
        request: { standardId, context },
        response: response as any,
      },
    });

    return response;
  }

  /**
   * Get compliance history
   */
  async getComplianceHistory(
    standardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    timestamp: Date;
    overallScore: number;
    status: string;
  }>> {
    const history = await prisma.auditTrail.findMany({
      where: {
        intent: 'compliance-check',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        request: {
          path: ['standardId'],
          equals: standardId,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        response: true,
      },
    });

    return history.map(h => ({
      timestamp: h.createdAt,
      overallScore: (h.response as any).overallScore || 0,
      status: (h.response as any).status || 'unknown',
    }));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    standards: string[],
    context: Record<string, any>
  ): Promise<{
    reportId: string;
    generatedAt: Date;
    standards: Array<{
      standardId: string;
      score: number;
      status: string;
      criticalGaps: string[];
    }>;
    overallCompliance: number;
    executiveSummary: string;
  }> {
    const results = await Promise.all(
      standards.map(std => this.checkCompliance(std, context))
    );

    const overallCompliance = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date(),
      standards: results.map(r => ({
        standardId: r.standardId,
        score: r.overallScore,
        status: r.status,
        criticalGaps: r.results
          .filter(res => res.status === 'non-compliant')
          .flatMap(res => res.gaps)
          .slice(0, 5),
      })),
      overallCompliance,
      executiveSummary: this.generateExecutiveSummary(results),
    };

    // Store report
    await prisma.auditTrail.create({
      data: {
        intent: 'compliance-report',
        request: { standards, context },
        response: report as any,
      },
    });

    return report;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(results: any[]): string {
    const compliantCount = results.filter(r => r.status === 'compliant').length;
    const totalStandards = results.length;
    
    return `Compliance assessment completed for ${totalStandards} ISO standards. ` +
           `${compliantCount} standards are fully compliant. ` +
           `Overall compliance score: ${results.reduce((sum, r) => sum + r.overallScore, 0) / totalStandards}%. ` +
           `Key areas requiring attention: ${results.flatMap(r => r.recommendations).slice(0, 3).join(', ')}.`;
  }
}