#!/usr/bin/env node

/**
 * Test script to verify dashboard APIs are working correctly
 */

const BASE_URL = 'http://localhost:3001';

async function testAPI(endpoint, description) {
  try {
    console.log(`🔍 Testing ${description}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      console.log(`❌ ${description} - Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ ${description} - Status: ${response.status}`);
    console.log(`   Sample data keys: ${Object.keys(data).join(', ')}`);
    
    // Check for duplicate key issues
    if (data.byShift && Array.isArray(data.byShift)) {
      const shifts = data.byShift.map(s => s.shift);
      const duplicateShifts = shifts.filter((item, index) => shifts.indexOf(item) !== index);
      if (duplicateShifts.length > 0) {
        console.log(`⚠️  Found duplicate shifts: ${duplicateShifts.join(', ')}`);
      }
    }
    
    if (data.byProduct && Array.isArray(data.byProduct)) {
      const products = data.byProduct.map(p => p.productType);
      const duplicateProducts = products.filter((item, index) => products.indexOf(item) !== index);
      if (duplicateProducts.length > 0) {
        console.log(`⚠️  Found duplicate products: ${duplicateProducts.join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Dashboard APIs...\n');
  
  const tests = [
    ['/api/manufacturing-metrics/oee?timeRange=24h', 'OEE Metrics API'],
    ['/api/manufacturing-metrics/production?timeRange=24h', 'Production Metrics API'],
    ['/api/manufacturing-metrics/equipment-health', 'Equipment Health API'],
    ['/api/quality-metrics?timeRange=24h', 'Quality Metrics API']
  ];
  
  let passed = 0;
  
  for (const [endpoint, description] of tests) {
    const success = await testAPI(endpoint, description);
    if (success) passed++;
    console.log('');
  }
  
  console.log(`📊 Test Results: ${passed}/${tests.length} APIs working correctly`);
  
  if (passed === tests.length) {
    console.log('✅ All APIs are working! Dashboard should display data correctly.');
  } else {
    console.log('❌ Some APIs have issues. Check the logs above.');
  }
}

runTests().catch(console.error);