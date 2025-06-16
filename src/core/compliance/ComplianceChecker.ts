/**
 * Compliance Checker Implementation
 * 
 * This class implements the ComplianceChecker interface and provides
 * functionality for verifying compliance with requirements.
 */

import { AbstractBaseService } from '../architecture/BaseService';
import { ComplianceChecker } from './interfaces';
import { ComplianceRegistry } from './interfaces';
import {
  ComplianceCheckResult,
  ComplianceCheckStatus,
  ComplianceVerificationMethod,
} from './types';

/**
 * Compliance check function type
 */
type ComplianceCheckFunction = (
  context: Record<string, unknown>
) => Promise<ComplianceCheckResult>;

/**
 * Compliance check registration
 */
interface ComplianceCheckRegistration {
  requirementId: string;
  method: ComplianceVerificationMethod;
  checker: ComplianceCheckFunction;
}

/**
 * Compliance checker implementation
 */
export class ComplianceCheckerImpl extends AbstractBaseService implements ComplianceChecker {
  /**
   * Map of compliance check functions by requirement ID
   */
  private checks: Map<string, ComplianceCheckRegistration> = new Map();
  
  /**
   * Compliance registry instance
   */
  private registry: ComplianceRegistry;
  
  /**
   * Create a new compliance checker
   * @param registry Compliance registry
   */
  constructor(registry: ComplianceRegistry) {
    super('ComplianceChecker', '1.0.0');
    this.registry = registry;
  }
  
  /**
   * Initialize the checker
   */
  protected async doInitialize(): Promise<void> {
    // Clear checks
    this.checks.clear();
    
    console.log('Compliance checker initialized');
  }
  
  /**
   * Start the checker
   */
  protected async doStart(): Promise<void> {
    console.log('Compliance checker started');
  }
  
  /**
   * Stop the checker
   */
  protected async doStop(): Promise<void> {
    console.log('Compliance checker stopped');
  }
  
  /**
   * Register a compliance check implementation
   * @param requirementId Requirement ID
   * @param method Verification method
   * @param checker Function to perform the check
   */
  public registerComplianceCheck(
    requirementId: string,
    method: ComplianceVerificationMethod,
    checker: ComplianceCheckFunction
  ): void {
    this.checks.set(requirementId, {
      requirementId,
      method,
      checker,
    });
    
    console.log(`Compliance check registered for requirement ${requirementId} using ${method} method`);
  }
  
  /**
   * Check compliance with a requirement
   * @param requirementId Requirement ID
   * @param context Context data for the check
   */
  public async checkCompliance(
    requirementId: string,
    context: Record<string, unknown>
  ): Promise<ComplianceCheckResult> {
    // Get requirement
    const requirement = await this.registry.getRequirement(requirementId);
    
    if (!requirement) {
      return {
        requirementId,
        status: ComplianceCheckStatus.NOT_CHECKED,
        timestamp: new Date(),
        details: `Requirement ${requirementId} not found`,
      };
    }
    
    // Get check function
    const check = this.checks.get(requirementId);
    
    if (!check) {
      return {
        requirementId,
        status: ComplianceCheckStatus.NOT_CHECKED,
        timestamp: new Date(),
        details: `No compliance check registered for requirement ${requirementId}`,
      };
    }
    
    try {
      // Execute check
      const result = await check.checker(context);
      
      // Ensure result has requirementId and timestamp
      result.requirementId = requirementId;
      result.timestamp = result.timestamp || new Date();
      
      return result;
    } catch (error) {
      // Handle check error
      return {
        requirementId,
        status: ComplianceCheckStatus.FAILED,
        timestamp: new Date(),
        details: `Error checking compliance: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Check compliance with multiple requirements
   * @param requirementIds Requirement IDs
   * @param context Context data for the check
   */
  public async checkMultipleCompliance(
    requirementIds: string[],
    context: Record<string, unknown>
  ): Promise<ComplianceCheckResult[]> {
    // Execute checks in parallel
    const results = await Promise.all(
      requirementIds.map(requirementId => this.checkCompliance(requirementId, context))
    );
    
    return results;
  }
  
  /**
   * Get default check result for a requirement
   * @param requirementId Requirement ID
   * @param status Check status
   * @param details Optional details
   */
  public getDefaultCheckResult(
    requirementId: string,
    status: ComplianceCheckStatus,
    details?: string
  ): ComplianceCheckResult {
    return {
      requirementId,
      status,
      timestamp: new Date(),
      details,
    };
  }
}