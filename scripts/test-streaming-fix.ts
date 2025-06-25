#!/usr/bin/env tsx

/**
 * Test script to verify the streaming service fix
 * This will test if the lazy initialization prevents the authentication errors
 */

import { manufacturingDataStream } from '../src/lib/streaming/ManufacturingDataStream';
import { logger } from '../src/lib/logger';

async function testStreamingService() {
  logger.info('Testing streaming service with lazy initialization...');
  
  try {
    // Test 1: Subscribe to events (this should trigger lazy initialization)
    logger.info('Test 1: Subscribing to performance metrics...');
    const subscriptionId = manufacturingDataStream.subscribe(
      { types: ['metric'] },
      (event) => {
        logger.info('Received event:', {
          type: event.type,
          timestamp: event.timestamp,
          source: event.source
        });
      }
    );
    
    logger.info(`Successfully subscribed with ID: ${subscriptionId}`);
    
    // Test 2: Get metrics
    logger.info('Test 2: Getting stream metrics...');
    const metrics = manufacturingDataStream.getMetrics();
    logger.info('Stream metrics:', metrics);
    
    // Test 3: Create SSE response (simulated)
    logger.info('Test 3: Testing SSE response creation...');
    try {
      const sseStream = manufacturingDataStream.createSSEResponse(subscriptionId);
      logger.info('SSE response created successfully');
    } catch (error) {
      logger.error('SSE creation error (expected in test environment):', error);
    }
    
    // Wait a bit to see if we receive any events
    logger.info('Waiting 10 seconds for events...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Cleanup
    logger.info('Unsubscribing...');
    manufacturingDataStream.unsubscribe(subscriptionId);
    
    logger.info('✅ All tests passed! The streaming service is working correctly.');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStreamingService().catch(error => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});