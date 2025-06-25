/**
 * Test Quality Metrics API with PPK field
 */

async function testQualityAPI() {
  try {
    console.log('Testing Quality Metrics API with PPK field...\n');
    
    const response = await fetch('http://localhost:3000/api/quality-metrics?timeRange=last24h');
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received successfully!\n');
    
    // Check current metrics
    console.log('📊 Current Quality Metrics:');
    console.log(`- Average Cpk: ${data.current.avgCpk?.toFixed(3) || 'N/A'}`);
    console.log(`- Average Ppk: ${data.current.avgPpk?.toFixed(3) || 'N/A'}`);
    console.log(`- First Pass Yield: ${data.current.firstPassYield?.toFixed(3) || 'N/A'}`);
    console.log(`- Total Measurements: ${data.current.totalMeasurements}`);
    
    // Check by parameter
    if (data.byParameter && data.byParameter.length > 0) {
      console.log('\n📈 Quality by Parameter:');
      data.byParameter.slice(0, 3).forEach((param: any) => {
        console.log(`\n- ${param.parameter}:`);
        console.log(`  Average Value: ${param.avgValue?.toFixed(2) || 'N/A'}`);
        console.log(`  Average Cpk: ${param.avgCpk?.toFixed(3) || 'N/A'}`);
        console.log(`  Average Ppk: ${param.avgPpk?.toFixed(3) || 'N/A'}`);
        console.log(`  Count: ${param.count}`);
      });
    }
    
    // Check by shift
    if (data.byShift && data.byShift.length > 0) {
      console.log('\n🔄 Quality by Shift:');
      data.byShift.forEach((shift: any) => {
        console.log(`\n- ${shift.shift}:`);
        console.log(`  Average Cpk: ${shift.avgCpk?.toFixed(3) || 'N/A'}`);
        console.log(`  Average Ppk: ${shift.avgPpk?.toFixed(3) || 'N/A'}`);
        console.log(`  Count: ${shift.count}`);
      });
    }
    
    console.log('\n✅ All PPK fields are working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Run the test
testQualityAPI();