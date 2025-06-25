import { z } from 'zod';
import { logger } from '@/lib/logger';
import { ManufacturingIntent } from '@/lib/embeddings/embeddingService';

// ISO Standard Schema
export const ISOStandardSchema = z.enum([
  'ISO9001',      // Quality Management Systems
  'ISO14001',     // Environmental Management Systems
  'ISO14224',     // Reliability & Maintenance
  'ISO22400-2',   // KPIs for Manufacturing Operations
  'ISO45001',     // Occupational Health & Safety
  'ISO50001',     // Energy Management Systems
  'ISO55000',     // Asset Management
]);

export type ISOStandard = z.infer<typeof ISOStandardSchema>;

// ISO Compliance Details Schema
export const ISOComplianceDetailsSchema = z.object({
  standardId: ISOStandardSchema,
  title: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  metrics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    unit: z.string().optional(),
    calculation: z.string().optional(),
  })),
  documentation: z.array(z.string()),
  auditChecks: z.array(z.string()),
});

export type ISOComplianceDetails = z.infer<typeof ISOComplianceDetailsSchema>;

// Input/Output schemas
export const isoComplianceInputSchema = z.object({
  intent: z.string(),
  context: z.record(z.any()).optional(),
  includeMetrics: z.boolean().default(true),
  includeRequirements: z.boolean().default(true),
});

export const isoComplianceOutputSchema = z.object({
  standards: z.array(ISOComplianceDetailsSchema),
  primaryStandard: ISOStandardSchema.optional(),
  complianceScore: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type ISOComplianceInput = z.infer<typeof isoComplianceInputSchema>;
export type ISOComplianceOutput = z.infer<typeof isoComplianceOutputSchema>;

/**
 * ISO Compliance Agent
 * Maps manufacturing intents to relevant ISO standards and provides compliance guidance
 */
export class ISOComplianceAgent {
  private static instance: ISOComplianceAgent;
  private standardsMap: Map<ISOStandard, ISOComplianceDetails>;

  private constructor() {
    this.standardsMap = this.initializeStandardsMap();
  }

  static getInstance(): ISOComplianceAgent {
    if (!ISOComplianceAgent.instance) {
      ISOComplianceAgent.instance = new ISOComplianceAgent();
    }
    return ISOComplianceAgent.instance;
  }

  /**
   * Get ISO standards relevant to the given intent
   */
  async getStandards(input: ISOComplianceInput): Promise<ISOComplianceOutput> {
    try {
      const validatedInput = isoComplianceInputSchema.parse(input);
      
      logger.info({ intent: validatedInput.intent }, 'Getting ISO standards');

      // Map intent to standards
      const relevantStandards = this.mapIntentToStandards(validatedInput.intent as ManufacturingIntent);
      
      // Get detailed information for each standard
      const standards = relevantStandards
        .map(standardId => this.standardsMap.get(standardId))
        .filter((details): details is ISOComplianceDetails => details !== undefined);

      // Determine primary standard
      const primaryStandard = relevantStandards[0];

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        validatedInput.intent as ManufacturingIntent,
        standards
      );

      const response: ISOComplianceOutput = {
        standards,
        primaryStandard,
        recommendations,
      };

      logger.info({ 
        standardsCount: standards.length,
        primaryStandard 
      }, 'ISO standards retrieved');

      return response;
    } catch (error) {
      logger.error({ error, input }, 'Failed to get ISO standards');
      throw error;
    }
  }

  /**
   * Map manufacturing intent to relevant ISO standards
   */
  private mapIntentToStandards(intent: ManufacturingIntent): ISOStandard[] {
    const intentStandardsMap: Record<ManufacturingIntent, ISOStandard[]> = {
      'analyze-oee': ['ISO22400-2'],
      'quality-analysis': ['ISO9001', 'ISO22400-2'],
      'track-downtime': ['ISO14224', 'ISO22400-2'],
      'predictive-maintenance': ['ISO14224', 'ISO55000'],
      'production-optimization': ['ISO22400-2'],
      'energy-monitoring': ['ISO50001'],
      'inventory-management': ['ISO9001'],
      'shift-performance': ['ISO22400-2'],
      'root-cause-analysis': ['ISO9001', 'ISO14224'],
      'compliance-check': ['ISO9001', 'ISO14001', 'ISO45001'],
      'unknown-intent': [],
    };

    return intentStandardsMap[intent] || [];
  }

  /**
   * Initialize the standards map with detailed information
   */
  private initializeStandardsMap(): Map<ISOStandard, ISOComplianceDetails> {
    const map = new Map<ISOStandard, ISOComplianceDetails>();

    // ISO 22400-2: KPIs for Manufacturing Operations
    map.set('ISO22400-2', {
      standardId: 'ISO22400-2',
      title: 'Key Performance Indicators for Manufacturing Operations',
      description: 'Defines KPIs for manufacturing operations management including OEE, availability, performance, and quality metrics.',
      requirements: [
        'Implement OEE calculation (Availability × Performance × Quality)',
        'Track equipment availability and planned/unplanned downtime',
        'Monitor performance efficiency against ideal cycle times',
        'Measure quality rate and first-pass yield',
        'Establish data collection procedures for all KPIs',
      ],
      metrics: [
        {
          name: 'Overall Equipment Effectiveness (OEE)',
          description: 'Composite metric of availability, performance, and quality',
          unit: '%',
          calculation: 'Availability × Performance × Quality',
        },
        {
          name: 'Availability',
          description: 'Ratio of operating time to planned production time',
          unit: '%',
          calculation: '(Planned Production Time - Downtime) / Planned Production Time × 100',
        },
        {
          name: 'Performance',
          description: 'Ratio of actual to ideal production rate',
          unit: '%',
          calculation: '(Actual Production / Standard Production) × 100',
        },
        {
          name: 'Quality',
          description: 'Ratio of good parts to total parts produced',
          unit: '%',
          calculation: '(Good Parts / Total Parts) × 100',
        },
      ],
      documentation: [
        'OEE calculation procedures',
        'Data collection methods',
        'KPI reporting templates',
        'Continuous improvement plans',
      ],
      auditChecks: [
        'Verify OEE calculation accuracy',
        'Check data collection frequency and methods',
        'Review KPI trending and analysis',
        'Validate improvement actions based on KPIs',
      ],
    });

    // ISO 9001: Quality Management Systems
    map.set('ISO9001', {
      standardId: 'ISO9001',
      title: 'Quality Management Systems',
      description: 'Requirements for quality management systems to consistently provide products that meet customer and regulatory requirements.',
      requirements: [
        'Establish quality policy and objectives',
        'Implement process approach to quality management',
        'Maintain documented procedures for key processes',
        'Conduct regular internal audits',
        'Implement corrective and preventive actions',
        'Ensure customer satisfaction measurement',
      ],
      metrics: [
        {
          name: 'First Pass Yield',
          description: 'Percentage of units that pass quality inspection on first attempt',
          unit: '%',
        },
        {
          name: 'Customer Complaints',
          description: 'Number of quality-related customer complaints',
          unit: 'count',
        },
        {
          name: 'Cost of Poor Quality',
          description: 'Total cost of scrap, rework, and warranty claims',
          unit: 'currency',
        },
        {
          name: 'Supplier Quality Rating',
          description: 'Average quality score of incoming materials',
          unit: '%',
        },
      ],
      documentation: [
        'Quality manual',
        'Process procedures',
        'Work instructions',
        'Quality records',
        'Audit reports',
      ],
      auditChecks: [
        'Review quality policy implementation',
        'Verify process controls effectiveness',
        'Check calibration records',
        'Validate corrective action effectiveness',
        'Assess customer satisfaction data',
      ],
    });

    // ISO 14224: Reliability and Maintenance
    map.set('ISO14224', {
      standardId: 'ISO14224',
      title: 'Reliability and Maintenance Data Collection',
      description: 'Standard for collection and exchange of reliability and maintenance data for equipment.',
      requirements: [
        'Establish equipment hierarchy and taxonomy',
        'Define failure modes and failure mechanisms',
        'Implement reliability data collection system',
        'Calculate MTBF and MTTR metrics',
        'Track maintenance activities and costs',
      ],
      metrics: [
        {
          name: 'Mean Time Between Failures (MTBF)',
          description: 'Average time between equipment failures',
          unit: 'hours',
          calculation: 'Total Operating Time / Number of Failures',
        },
        {
          name: 'Mean Time To Repair (MTTR)',
          description: 'Average time to repair equipment',
          unit: 'hours',
          calculation: 'Total Repair Time / Number of Repairs',
        },
        {
          name: 'Equipment Availability',
          description: 'Percentage of time equipment is available for use',
          unit: '%',
          calculation: 'MTBF / (MTBF + MTTR) × 100',
        },
      ],
      documentation: [
        'Equipment taxonomy',
        'Failure mode catalog',
        'Maintenance procedures',
        'Reliability reports',
      ],
      auditChecks: [
        'Verify failure data accuracy',
        'Check maintenance record completeness',
        'Validate MTBF/MTTR calculations',
        'Review preventive maintenance compliance',
      ],
    });

    // ISO 50001: Energy Management
    map.set('ISO50001', {
      standardId: 'ISO50001',
      title: 'Energy Management Systems',
      description: 'Specifies requirements for establishing, implementing, maintaining and improving an energy management system.',
      requirements: [
        'Establish energy policy and objectives',
        'Conduct energy review and establish baseline',
        'Identify significant energy uses',
        'Set energy performance indicators (EnPIs)',
        'Implement energy monitoring and measurement',
      ],
      metrics: [
        {
          name: 'Energy Intensity',
          description: 'Energy consumption per unit of production',
          unit: 'kWh/unit',
        },
        {
          name: 'Energy Performance Indicator',
          description: 'Ratio of actual to baseline energy consumption',
          unit: '%',
        },
        {
          name: 'Renewable Energy Percentage',
          description: 'Percentage of energy from renewable sources',
          unit: '%',
        },
      ],
      documentation: [
        'Energy policy',
        'Energy review reports',
        'EnPI methodology',
        'Energy monitoring plan',
      ],
      auditChecks: [
        'Verify energy baseline accuracy',
        'Check EnPI calculation methods',
        'Review energy objectives progress',
        'Validate measurement system accuracy',
      ],
    });

    // Add other standards as needed...

    return map;
  }

  /**
   * Generate recommendations based on intent and applicable standards
   */
  private generateRecommendations(
    intent: ManufacturingIntent,
    standards: ISOComplianceDetails[]
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations
    recommendations.push('Ensure all data collection systems are calibrated and validated');
    recommendations.push('Implement regular internal audits for compliance verification');

    // Intent-specific recommendations
    switch (intent) {
      case 'analyze-oee':
        recommendations.push('Establish automated OEE data collection from equipment');
        recommendations.push('Create real-time OEE dashboards for operators');
        recommendations.push('Set OEE improvement targets based on industry benchmarks');
        break;
      
      case 'quality-analysis':
        recommendations.push('Implement Statistical Process Control (SPC) charts');
        recommendations.push('Establish quality gates at critical process points');
        recommendations.push('Create quality cost tracking system');
        break;
      
      case 'track-downtime':
        recommendations.push('Categorize downtime by failure mode and cause');
        recommendations.push('Implement predictive maintenance based on MTBF data');
        recommendations.push('Create downtime Pareto charts for prioritization');
        break;
      
      case 'energy-monitoring':
        recommendations.push('Install sub-metering for significant energy uses');
        recommendations.push('Establish energy baseline by product type');
        recommendations.push('Implement energy waste identification system');
        break;
    }

    // Add standard-specific recommendations
    standards.forEach(standard => {
      if (standard.requirements.length > 0) {
        recommendations.push(`Review ${standard.standardId} requirements checklist`);
      }
    });

    return recommendations;
  }

  /**
   * Check compliance status for a specific standard
   */
  async checkCompliance(
    standardId: ISOStandard,
    context: Record<string, any>
  ): Promise<{
    compliant: boolean;
    score: number;
    gaps: string[];
    actions: string[];
  }> {
    // This would integrate with actual compliance checking logic
    // For now, return a mock implementation
    logger.info({ standardId }, 'Checking compliance');

    return {
      compliant: false,
      score: 75,
      gaps: [
        'Missing documented procedures for data collection',
        'Calibration records not up to date',
        'Internal audit schedule not defined',
      ],
      actions: [
        'Create data collection SOP',
        'Update calibration schedule',
        'Develop annual audit plan',
      ],
    };
  }
}