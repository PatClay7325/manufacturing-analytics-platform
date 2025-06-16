/**
 * AI Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the AI integration.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export Ollama provider
export * from './OllamaProvider';

// Export AI service implementation
export * from './AIServiceImpl';

// Export manufacturing assistant
export * from './ManufacturingAssistantImpl';

// Export a function to initialize the AI system
import { AIServiceImpl } from './AIServiceImpl';
import { ManufacturingAssistantImpl } from './ManufacturingAssistantImpl';

/**
 * Initialize the AI system
 * @param config Optional AI service configuration
 * @returns AI service instance
 */
export async function initializeAISystem(
  config?: Record<string, unknown>
): Promise<AIServiceImpl> {
  // Create AI service
  const aiService = new AIServiceImpl();
  
  try {
    // Initialize AI service
    await aiService.initialize({
      environment: 'development',
      debug: true,
      logLevel: 'info',
      tracing: false,
      ...config,
    });
    
    // Start AI service
    await aiService.start();
    
    // Initialize manufacturing assistant
    const manufacturingAssistant = new ManufacturingAssistantImpl();
    await manufacturingAssistant.initialize(aiService);
    
    console.log('AI system initialized');
    
    return aiService;
  } catch (error) {
    console.error('Error initializing AI system:', error);
    throw error;
  }
}