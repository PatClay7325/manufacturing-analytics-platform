/**
 * Compliance Interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the interfaces for the manufacturing standards
 * compliance framework.
 */

import { ModularService } from './services/interfaces';
import {
  ComplianceStandard,
  ComplianceRequirement,
  ComplianceCheckResult,
  ComplianceProfile,
  ComplianceAssessment,
  ManufacturingDataStandard,
  ManufacturingTerm,
  ComplianceVerificationMethod,
} from './types';

/**
 * Compliance registry interface
 * Manages standards, requirements, and profiles
 */
export interface ComplianceRegistry {
  /**
   * Register a standard
   * @param standard Standard to register
   */
  registerStandard(standard: ComplianceStandard): Promise<void>;
  
  /**
   * Get a standard by ID
   * @param standardId Standard ID
   */
  getStandard(standardId: string): Promise<ComplianceStandard | null>;
  
  /**
   * Get all standards
   * @param filter Optional filter criteria
   */
  getStandards(filter?: Record<string, unknown>): Promise<ComplianceStandard[]>;
  
  /**
   * Register a requirement
   * @param requirement Requirement to register
   */
  registerRequirement(requirement: ComplianceRequirement): Promise<void>;
  
  /**
   * Get a requirement by ID
   * @param requirementId Requirement ID
   */
  getRequirement(requirementId: string): Promise<ComplianceRequirement | null>;
  
  /**
   * Get requirements by standard ID
   * @param standardId Standard ID
   * @param filter Optional filter criteria
   */
  getRequirementsByStandard(
    standardId: string,
    filter?: Record<string, unknown>
  ): Promise<ComplianceRequirement[]>;
  
  /**
   * Create a compliance profile
   * @param profile Profile to create
   */
  createProfile(profile: ComplianceProfile): Promise<void>;
  
  /**
   * Get a profile by ID
   * @param profileId Profile ID
   */
  getProfile(profileId: string): Promise<ComplianceProfile | null>;
  
  /**
   * Get all profiles
   * @param filter Optional filter criteria
   */
  getProfiles(filter?: Record<string, unknown>): Promise<ComplianceProfile[]>;
}

/**
 * Compliance checker interface
 * Verifies compliance with requirements
 */
export interface ComplianceChecker {
  /**
   * Check compliance with a requirement
   * @param requirementId Requirement ID
   * @param context Context data for the check
   */
  checkCompliance(
    requirementId: string,
    context: Record<string, unknown>
  ): Promise<ComplianceCheckResult>;
  
  /**
   * Check compliance with multiple requirements
   * @param requirementIds Requirement IDs
   * @param context Context data for the check
   */
  checkMultipleCompliance(
    requirementIds: string[],
    context: Record<string, unknown>
  ): Promise<ComplianceCheckResult[]>;
  
  /**
   * Register a compliance check implementation
   * @param requirementId Requirement ID
   * @param method Verification method
   * @param checker Function to perform the check
   */
  registerComplianceCheck(
    requirementId: string,
    method: ComplianceVerificationMethod,
    checker: (context: Record<string, unknown>) => Promise<ComplianceCheckResult>
  ): void;
}

/**
 * Compliance assessment interface
 * Manages assessment sessions and results
 */
export interface ComplianceAssessor {
  /**
   * Create a new assessment
   * @param profileId Profile ID
   * @param name Assessment name
   * @param description Assessment description
   */
  createAssessment(
    profileId: string,
    name: string,
    description: string
  ): Promise<ComplianceAssessment>;
  
  /**
   * Get an assessment by ID
   * @param assessmentId Assessment ID
   */
  getAssessment(assessmentId: string): Promise<ComplianceAssessment | null>;
  
  /**
   * Get assessments by profile ID
   * @param profileId Profile ID
   */
  getAssessmentsByProfile(profileId: string): Promise<ComplianceAssessment[]>;
  
  /**
   * Run an assessment
   * @param assessmentId Assessment ID
   * @param context Context data for the assessment
   */
  runAssessment(
    assessmentId: string,
    context: Record<string, unknown>
  ): Promise<ComplianceAssessment>;
  
  /**
   * Update assessment results
   * @param assessmentId Assessment ID
   * @param results Assessment results
   */
  updateAssessmentResults(
    assessmentId: string,
    results: ComplianceCheckResult[]
  ): Promise<void>;
  
  /**
   * Generate assessment report
   * @param assessmentId Assessment ID
   * @param format Report format
   */
  generateReport(
    assessmentId: string,
    format: 'pdf' | 'html' | 'json'
  ): Promise<string>;
}

/**
 * Data standard manager interface
 * Manages data standards and validation
 */
export interface DataStandardManager {
  /**
   * Register a data standard
   * @param standard Data standard to register
   */
  registerDataStandard(standard: ManufacturingDataStandard): Promise<void>;
  
  /**
   * Get a data standard by ID
   * @param standardId Standard ID
   */
  getDataStandard(standardId: string): Promise<ManufacturingDataStandard | null>;
  
  /**
   * Get all data standards
   */
  getDataStandards(): Promise<ManufacturingDataStandard[]>;
  
  /**
   * Validate data against a standard
   * @param standardId Standard ID
   * @param data Data to validate
   * @param schemaName Schema name within the standard
   */
  validateData(
    standardId: string,
    data: unknown,
    schemaName: string
  ): Promise<{
    valid: boolean;
    errors?: string[];
  }>;
  
  /**
   * Transform data between standards
   * @param sourceStandardId Source standard ID
   * @param targetStandardId Target standard ID
   * @param data Data to transform
   * @param options Transformation options
   */
  transformData(
    sourceStandardId: string,
    targetStandardId: string,
    data: unknown,
    options?: Record<string, unknown>
  ): Promise<unknown>;
}

/**
 * Terminology manager interface
 * Manages standardized manufacturing terms
 */
export interface TerminologyManager {
  /**
   * Register a term
   * @param term Term to register
   */
  registerTerm(term: ManufacturingTerm): Promise<void>;
  
  /**
   * Get a term by ID
   * @param termId Term ID
   */
  getTerm(termId: string): Promise<ManufacturingTerm | null>;
  
  /**
   * Get a term by name
   * @param name Term name
   */
  getTermByName(name: string): Promise<ManufacturingTerm | null>;
  
  /**
   * Search terms
   * @param query Search query
   */
  searchTerms(query: string): Promise<ManufacturingTerm[]>;
  
  /**
   * Get related terms
   * @param termId Term ID
   */
  getRelatedTerms(termId: string): Promise<ManufacturingTerm[]>;
}

/**
 * Compliance service interface
 * Main interface for the compliance framework
 */
export interface ComplianceService extends ModularService {
  /**
   * Get the compliance registry
   */
  getRegistry(): ComplianceRegistry;
  
  /**
   * Get the compliance checker
   */
  getChecker(): ComplianceChecker;
  
  /**
   * Get the compliance assessor
   */
  getAssessor(): ComplianceAssessor;
  
  /**
   * Get the data standard manager
   */
  getDataStandardManager(): DataStandardManager;
  
  /**
   * Get the terminology manager
   */
  getTerminologyManager(): TerminologyManager;
  
  /**
   * Initialize standard compliance profile
   * @param standardIds Standard IDs to include
   * @param name Profile name
   * @param description Profile description
   */
  initializeStandardProfile(
    standardIds: string[],
    name: string,
    description: string
  ): Promise<ComplianceProfile>;
  
  /**
   * Check entity compliance
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param profileId Profile ID
   */
  checkEntityCompliance(
    entityType: string,
    entityId: string,
    profileId: string
  ): Promise<ComplianceCheckResult[]>;
}