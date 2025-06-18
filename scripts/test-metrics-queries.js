#!/usr/bin/env node

// Script to test various metrics query scenarios
async function testMetricsQueries() {
  const baseUrl = 'http://localhost:3000/api/metrics/query'
  
  console.log('🧪 Testing Metrics Query Endpoint\n')
  
  // Test 1: Raw data query (no aggregation)
  console.log('1️⃣ Testing raw data query...')
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentId: 'test-equipment-001',
        timeRange: {
          from: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          to: new Date().toISOString()
        }
      })
    })
    
    const result = await response.json()
    if (response.ok) {
      console.log('✅ Raw data query successful')
      console.log(`   Found ${result.data.length} metric series`)
    } else {
      console.log('❌ Raw data query failed:', result.error)
    }
  } catch (error) {
    console.log('❌ Raw data query error:', error.message)
  }
  
  // Test 2: Aggregated query with interval
  console.log('\n2️⃣ Testing aggregated query (5-minute average)...')
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentId: 'test-equipment-001',
        metrics: ['temperature', 'pressure'],
        timeRange: {
          from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        aggregation: 'avg',
        interval: '5m'
      })
    })
    
    const result = await response.json()
    if (response.ok) {
      console.log('✅ Aggregated query successful')
      result.data.forEach(series => {
        console.log(`   ${series.target}: ${series.datapoints.length} data points`)
      })
    } else {
      console.log('❌ Aggregated query failed:', result.error, result.message)
    }
  } catch (error) {
    console.log('❌ Aggregated query error:', error.message)
  }
  
  // Test 3: Query with tag filtering
  console.log('\n3️⃣ Testing query with tag filtering...')
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipmentId: 'test-equipment-001',
        metrics: ['temperature'],
        timeRange: {
          from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        tags: { location: 'motor' }
      })
    })
    
    const result = await response.json()
    if (response.ok) {
      console.log('✅ Tag filtered query successful')
      console.log(`   Found ${result.data.length} matching series`)
    } else {
      console.log('❌ Tag filtered query failed:', result.error, result.message)
    }
  } catch (error) {
    console.log('❌ Tag filtered query error:', error.message)
  }
  
  // Test 4: Simple GET query
  console.log('\n4️⃣ Testing simple GET query...')
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('equipmentId', 'test-equipment-001')
    url.searchParams.set('hours', '1')
    
    const response = await fetch(url.toString())
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ GET query successful')
      console.log(`   Found ${result.count} metrics`)
    } else {
      console.log('❌ GET query failed:', result.error)
    }
  } catch (error) {
    console.log('❌ GET query error:', error.message)
  }
  
  // Test 5: Different aggregation types
  console.log('\n5️⃣ Testing different aggregation types...')
  for (const aggregation of ['min', 'max', 'sum', 'count']) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: 'test-equipment-001',
          metrics: ['production_count'],
          timeRange: {
            from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString()
          },
          aggregation,
          interval: '10m'
        })
      })
      
      const result = await response.json()
      if (response.ok) {
        console.log(`   ✅ ${aggregation.toUpperCase()} aggregation successful`)
      } else {
        console.log(`   ❌ ${aggregation.toUpperCase()} aggregation failed:`, result.error)
      }
    } catch (error) {
      console.log(`   ❌ ${aggregation.toUpperCase()} aggregation error:`, error.message)
    }
  }
  
  console.log('\n✨ Test complete!')
}

// Run the tests
testMetricsQueries().catch(console.error)