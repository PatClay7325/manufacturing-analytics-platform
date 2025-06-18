#!/usr/bin/env node

// Test script for metrics query endpoint
async function testMetricsQuery() {
  const url = 'http://localhost:3000/api/metrics/query'
  
  // Calculate time range (last 1 hour)
  const to = new Date()
  const from = new Date(to.getTime() - 60 * 60 * 1000) // 1 hour ago
  
  // Test queries
  const queries = [
    {
      name: 'Raw data query',
      data: {
        equipmentId: 'test-equipment-001',
        timeRange: {
          from: from.toISOString(),
          to: to.toISOString()
        },
        aggregation: 'none'
      }
    },
    {
      name: 'Aggregated query (5-minute average)',
      data: {
        equipmentId: 'test-equipment-001',
        metrics: ['temperature', 'pressure'],
        timeRange: {
          from: from.toISOString(),
          to: to.toISOString()
        },
        aggregation: 'avg',
        interval: '5m'
      }
    },
    {
      name: 'Filtered by tags',
      data: {
        equipmentId: 'test-equipment-001',
        metrics: ['temperature'],
        timeRange: {
          from: from.toISOString(),
          to: to.toISOString()
        },
        tags: {
          location: 'motor'
        }
      }
    }
  ]
  
  for (const query of queries) {
    console.log(`\n📊 Testing: ${query.name}`)
    console.log('Request:', JSON.stringify(query.data, null, 2))
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query.data)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ Success!')
        console.log(`Found ${result.data?.length || 0} metric series`)
        
        // Show sample data
        if (result.data && result.data.length > 0) {
          const series = result.data[0]
          console.log(`\nSample series: ${series.target}`)
          console.log(`Data points: ${series.datapoints.length}`)
          if (series.datapoints.length > 0) {
            console.log('First point:', series.datapoints[0])
            console.log('Last point:', series.datapoints[series.datapoints.length - 1])
          }
        }
      } else {
        console.error('❌ Error!')
        console.error('Status:', response.status)
        console.error('Response:', JSON.stringify(result, null, 2))
      }
    } catch (error) {
      console.error('❌ Request failed!')
      console.error('Error:', error.message)
    }
  }
  
  // Test GET endpoint
  console.log('\n📊 Testing GET endpoint')
  const getUrl = `http://localhost:3000/api/metrics/query?equipmentId=test-equipment-001&hours=1`
  
  try {
    const response = await fetch(getUrl)
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`Found ${result.count} metrics`)
    } else {
      console.error('❌ Error!', result)
    }
  } catch (error) {
    console.error('❌ Request failed!', error.message)
  }
}

// Run test
testMetricsQuery()