/**
 * Compliance Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the manufacturing standards
 * compliance framework.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export compliance registry
export * from './ComplianceRegistry';

// Export compliance checker
export * from './ComplianceChecker';

// Export compliance assessor
export * from './ComplianceAssessor';

// Export data standard manager
export * from './DataStandardManager';

// Export terminology manager
export * from './TerminologyManager';

// Export compliance service
export * from './ComplianceService';

// Export a function to initialize the compliance system
import { ComplianceServiceImpl } from './ComplianceService';

/**
 * Initialize the compliance system
 * @param config Optional configuration
 * @returns Compliance service instance
 */
export async function initializeComplianceSystem(
  config?: Record<string, unknown>
): Promise<ComplianceServiceImpl> {
  // Create compliance service
  const complianceService = new ComplianceServiceImpl();
  
  try {
    // Initialize compliance service
    await complianceService.initialize({
      environment: 'development',
      debug: true,
      logLevel: 'info',
      tracing: false,
      ...config,
    });
    
    // Start compliance service
    await complianceService.start();
    
    console.log('Compliance system initialized');
    
    return complianceService;
  } catch (error) {
    console.error('Error initializing compliance system:', error);
    throw error;
  }
}