/**
 * Compliance Types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the types and interfaces for the manufacturing standards
 * compliance framework.
 */

/**
 * Compliance standard type
 */
export enum ComplianceStandardType {
  ISO = 'iso',
  IEC = 'iec',
  ANSI = 'ansi',
  ISA = 'isa',
  CUSTOM = 'custom',
}

/**
 * Compliance standard
 */
export interface ComplianceStandard {
  /**
   * Standard ID
   */
  id: string;
  
  /**
   * Standard name
   */
  name: string;
  
  /**
   * Standard version
   */
  version: string;
  
  /**
   * Standard type
   */
  type: ComplianceStandardType;
  
  /**
   * Standard description
   */
  description: string;
  
  /**
   * Standard scope
   */
  scope: string;
  
  /**
   * Standard categories
   */
  categories: string[];
  
  /**
   * Standard documentation URL
   */
  documentationUrl?: string;
  
  /**
   * Standard reference
   */
  reference?: string;
}

/**
 * Compliance requirement level
 */
export enum ComplianceRequirementLevel {
  MANDATORY = 'mandatory',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  /**
   * Requirement ID
   */
  id: string;
  
  /**
   * Standard ID
   */
  standardId: string;
  
  /**
   * Requirement code
   */
  code: string;
  
  /**
   * Requirement name
   */
  name: string;
  
  /**
   * Requirement description
   */
  description: string;
  
  /**
   * Requirement level
   */
  level: ComplianceRequirementLevel;
  
  /**
   * Requirement category
   */
  category: string;
  
  /**
   * Requirement tags
   */
  tags: string[];
  
  /**
   * Implementation guidance
   */
  guidance?: string;
  
  /**
   * Requirement references
   */
  references?: string[];
}

/**
 * Compliance verification method
 */
export enum ComplianceVerificationMethod {
  AUTOMATED = 'automated',
  SEMI_AUTOMATED = 'semi_automated',
  MANUAL = 'manual',
}

/**
 * Compliance check status
 */
export enum ComplianceCheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  NOT_APPLICABLE = 'not_applicable',
  NOT_CHECKED = 'not_checked',
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  /**
   * Requirement ID
   */
  requirementId: string;
  
  /**
   * Check status
   */
  status: ComplianceCheckStatus;
  
  /**
   * Check timestamp
   */
  timestamp: Date;
  
  /**
   * Check details
   */
  details?: string;
  
  /**
   * Check evidence
   */
  evidence?: string;
  
  /**
   * Remediation steps
   */
  remediation?: string;
}

/**
 * Compliance profile
 */
export interface ComplianceProfile {
  /**
   * Profile ID
   */
  id: string;
  
  /**
   * Profile name
   */
  name: string;
  
  /**
   * Profile description
   */
  description: string;
  
  /**
   * Standards included in the profile
   */
  standardIds: string[];
  
  /**
   * Requirements included in the profile
   */
  requirementIds: string[];
  
  /**
   * Profile tags
   */
  tags: string[];
  
  /**
   * Profile creation date
   */
  createdAt: Date;
  
  /**
   * Profile update date
   */
  updatedAt: Date;
  
  /**
   * Tenant ID if this is a tenant-specific profile
   */
  tenantId?: string;
  
  /**
   * Whether this profile is tenant-specific
   */
  isTenantSpecific?: boolean;
}

/**
 * Compliance assessment
 */
export interface ComplianceAssessment {
  /**
   * Assessment ID
   */
  id: string;
  
  /**
   * Profile ID
   */
  profileId: string;
  
  /**
   * Assessment name
   */
  name: string;
  
  /**
   * Assessment description
   */
  description: string;
  
  /**
   * Assessment start date
   */
  startDate: Date;
  
  /**
   * Assessment end date
   */
  endDate?: Date;
  
  /**
   * Assessment status
   */
  status: 'in_progress' | 'completed' | 'cancelled';
  
  /**
   * Assessment results
   */
  results: ComplianceCheckResult[];
  
  /**
   * Assessment summary
   */
  summary?: {
    passed: number;
    failed: number;
    notApplicable: number;
    notChecked: number;
    complianceScore: number;
  };
  
  /**
   * Assessment tags
   */
  tags: string[];
}

/**
 * Manufacturing data standard
 */
export interface ManufacturingDataStandard {
  /**
   * Standard ID
   */
  id: string;
  
  /**
   * Standard name
   */
  name: string;
  
  /**
   * Standard version
   */
  version: string;
  
  /**
   * Standard description
   */
  description: string;
  
  /**
   * Data schemas
   */
  schemas: Record<string, unknown>;
  
  /**
   * Validation rules
   */
  validationRules: Record<string, unknown>;
}

/**
 * Manufacturing term
 */
export interface ManufacturingTerm {
  /**
   * Term ID
   */
  id: string;
  
  /**
   * Term name
   */
  name: string;
  
  /**
   * Term definition
   */
  definition: string;
  
  /**
   * Term standard reference
   */
  standardReference: string;
  
  /**
   * Term aliases
   */
  aliases?: string[];
  
  /**
   * Term related terms
   */
  relatedTerms?: string[];
}