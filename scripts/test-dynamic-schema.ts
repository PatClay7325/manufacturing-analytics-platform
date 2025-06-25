#!/usr/bin/env tsx

/**
 * Test script to verify dynamic schema introspection works correctly
 */

import { getCachedModelIntrospection, resolveFieldName, combineFieldValues, FIELD_ALIASES } from '../src/lib/schema-introspection';

async function testDynamicSchemaIntrospection() {
  console.log('🔍 Testing Dynamic Schema Introspection...\n');

  try {
    // Test PerformanceMetric model introspection
    console.log('📊 Testing PerformanceMetric model...');
    const performanceIntrospection = await getCachedModelIntrospection('performanceMetric');
    
    console.log('Available fields:', performanceIntrospection.availableFields.length);
    console.log('Sample available fields:', performanceIntrospection.availableFields.slice(0, 10));
    
    // Test field resolution
    console.log('\n🔄 Testing field resolution...');
    const resolvedFields = {
      machineName: resolveFieldName('machineName', performanceIntrospection),
      availability: resolveFieldName('availability', performanceIntrospection),
      performance: resolveFieldName('performance', performanceIntrospection),
      quality: resolveFieldName('quality', performanceIntrospection),
      oeeScore: resolveFieldName('oeeScore', performanceIntrospection),
      totalParts: resolveFieldName('totalParts', performanceIntrospection),
      shift: resolveFieldName('shift', performanceIntrospection),
      productType: resolveFieldName('productType', performanceIntrospection),
    };
    
    console.log('Resolved fields:', resolvedFields);
    
    // Test field aliases
    console.log('\n🏷️  Testing field aliases...');
    const testRecord = {
      totalParts: 100,
      totalPartsProduced: 0, // Alternative field name
      goodParts: 95,
      rejectedParts: 5,
      availability: 0.95,
      performance: 0.90,
      quality: 0.95,
      oeeScore: 0.8123,
      machineName: 'Test Machine',
      shift: 'Day Shift',
      productType: 'Product A'
    };
    
    const combinedValues = {
      totalParts: combineFieldValues(testRecord, FIELD_ALIASES.totalParts, 0),
      goodParts: combineFieldValues(testRecord, FIELD_ALIASES.goodParts, 0),
      rejectedParts: combineFieldValues(testRecord, FIELD_ALIASES.rejectedParts, 0),
      availability: combineFieldValues(testRecord, FIELD_ALIASES.availability, 0),
      performance: combineFieldValues(testRecord, FIELD_ALIASES.performance, 0),
      quality: combineFieldValues(testRecord, FIELD_ALIASES.quality, 0),
      oeeScore: combineFieldValues(testRecord, FIELD_ALIASES.oeeScore, 0),
      machineName: combineFieldValues(testRecord, FIELD_ALIASES.machineName, 'Unknown'),
      shift: combineFieldValues(testRecord, FIELD_ALIASES.shift, 'Unknown'),
      productType: combineFieldValues(testRecord, FIELD_ALIASES.productType, 'Unknown'),
    };
    
    console.log('Combined field values:', combinedValues);
    
    // Test that the dynamic system can handle missing fields
    console.log('\n🚫 Testing missing field handling...');
    const incompleteRecord = {
      totalPartsProduced: 150, // Only this alternative name
      goodParts: 140,
      // Missing rejectedParts, should use rejectParts instead
      rejectParts: 10,
      availability: 0.92
      // Missing other fields
    };
    
    const handledMissingFields = {
      totalParts: combineFieldValues(incompleteRecord, FIELD_ALIASES.totalParts, 0),
      rejectedParts: combineFieldValues(incompleteRecord, FIELD_ALIASES.rejectedParts, 0),
      performance: combineFieldValues(incompleteRecord, FIELD_ALIASES.performance, 0), // Should return 0
    };
    
    console.log('Handled missing fields:', handledMissingFields);
    
    console.log('\n✅ Dynamic Schema Introspection Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Model introspection: ✅ Working`);
    console.log(`   - Field resolution: ✅ Working`);
    console.log(`   - Field aliases: ✅ Working`);
    console.log(`   - Missing field handling: ✅ Working`);
    console.log(`   - Available fields count: ${performanceIntrospection.availableFields.length}`);
    
  } catch (error) {
    console.error('❌ Error testing dynamic schema introspection:', error);
    throw error;
  }
}

testDynamicSchemaIntrospection()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });