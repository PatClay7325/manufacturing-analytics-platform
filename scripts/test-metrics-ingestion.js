#!/usr/bin/env node

// Test script for metrics ingestion endpoint
async function testMetricsIngestion() {
  const url = 'http://localhost:3000/api/metrics/ingest'
  
  // Test data
  const testData = {
    equipmentId: 'test-equipment-001',
    metrics: [
      {
        name: 'temperature',
        value: 72.5,
        unit: '°C',
        tags: {
          location: 'motor',
          sensor: 'temp-001'
        }
      },
      {
        name: 'vibration',
        value: 0.05,
        unit: 'mm/s',
        tags: {
          axis: 'x',
          sensor: 'vib-001'
        }
      },
      {
        name: 'pressure',
        value: 4.2,
        unit: 'bar',
        tags: {
          line: 'hydraulic-main'
        }
      }
    ]
  }
  
  console.log('Testing metrics ingestion endpoint...')
  console.log('URL:', url)
  console.log('Data:', JSON.stringify(testData, null, 2))
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('\n✅ Success!')
      console.log('Response:', JSON.stringify(result, null, 2))
    } else {
      console.error('\n❌ Error!')
      console.error('Status:', response.status)
      console.error('Response:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('\n❌ Request failed!')
    console.error('Error:', error.message)
  }
}

// Run test
testMetricsIngestion()