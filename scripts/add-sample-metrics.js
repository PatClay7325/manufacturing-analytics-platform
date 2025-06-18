#!/usr/bin/env node

// Script to add sample metrics for testing
async function addSampleMetrics() {
  const url = 'http://localhost:3000/api/metrics/ingest'
  
  // Generate metrics for the last hour
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  // Generate data points every 5 minutes
  const dataPoints = []
  for (let time = oneHourAgo.getTime(); time <= now.getTime(); time += 5 * 60 * 1000) {
    const timestamp = new Date(time).toISOString()
    
    // Temperature varies between 70-75°C
    dataPoints.push({
      name: 'temperature',
      value: 72.5 + (Math.random() * 5 - 2.5),
      unit: '°C',
      tags: { location: 'motor', sensor: 'temp-001' },
      timestamp
    })
    
    // Pressure varies between 3.8-4.5 bar
    dataPoints.push({
      name: 'pressure',
      value: 4.2 + (Math.random() * 0.7 - 0.35),
      unit: 'bar',
      tags: { line: 'hydraulic-main', sensor: 'pres-001' },
      timestamp
    })
    
    // Vibration varies between 0.02-0.08 mm/s
    dataPoints.push({
      name: 'vibration',
      value: 0.05 + (Math.random() * 0.06 - 0.03),
      unit: 'mm/s',
      tags: { axis: 'x', sensor: 'vib-001' },
      timestamp
    })
    
    // Production count increases over time
    const baseCount = Math.floor((time - oneHourAgo.getTime()) / (5 * 60 * 1000)) * 10
    dataPoints.push({
      name: 'production_count',
      value: baseCount + Math.floor(Math.random() * 5),
      unit: 'units',
      tags: { line: 'A1', product: 'widget-001' },
      timestamp
    })
  }
  
  console.log(`📊 Adding ${dataPoints.length} sample metrics...`)
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        equipmentId: 'test-equipment-001',
        metrics: dataPoints
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Success!')
      console.log(`Added ${result.count} metrics`)
    } else {
      console.error('❌ Error!')
      console.error('Response:', result)
    }
  } catch (error) {
    console.error('❌ Request failed!')
    console.error('Error:', error.message)
  }
}

// Run the script
addSampleMetrics()