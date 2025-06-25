#!/usr/bin/env tsx

/**
 * Simple test to verify streaming service connection without database dependency
 */

import { getManufacturingDataStream } from '../src/lib/streaming/ManufacturingDataStream';
import { logger } from '../src/lib/logger';

async function testStreamingConnection() {
  logger.info('Testing manufacturing data stream connection...');
  
  try {
    // Test 1: Get the service instance (should not fail)
    logger.info('Test 1: Getting service instance...');
    const streamService = getManufacturingDataStream();
    logger.info('✅ Service instance created successfully');
    
    // Test 2: Test subscription (should trigger lazy initialization)
    logger.info('Test 2: Creating subscription...');
    const subscriptionId = streamService.subscribe(
      { types: ['metric'] },
      (event) => {
        logger.info('📨 Received event:', {
          type: event.type,
          timestamp: event.timestamp,
          source: event.source
        });
      }
    );
    logger.info(`✅ Subscription created: ${subscriptionId}`);
    
    // Test 3: Get metrics
    logger.info('Test 3: Getting stream metrics...');
    const metrics = streamService.getMetrics();
    logger.info('✅ Metrics retrieved:', metrics);
    
    // Test 4: Wait for any events (5 seconds)
    logger.info('Test 4: Waiting 5 seconds for events...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 5: Cleanup
    logger.info('Test 5: Cleaning up subscription...');
    streamService.unsubscribe(subscriptionId);
    logger.info('✅ Subscription cleaned up');
    
    logger.info('🎉 All streaming tests passed!');
    
  } catch (error) {
    logger.error('❌ Streaming test failed:', error);
    throw error;
  }
}

// Run the test
testStreamingConnection()
  .then(() => {
    logger.info('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });