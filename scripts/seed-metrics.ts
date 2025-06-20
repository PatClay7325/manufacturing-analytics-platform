import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedMetrics() {
  console.log('Seeding metrics data...')
  
  // Get all work units
  const workUnits = await prisma.workUnit.findMany()
  
  if (workUnits.length === 0) {
    console.log('No work units found. Please run the main seed first.')
    return
  }
  
  // Generate metrics for the last 24 hours
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const metrics = []
  const metricTypes = [
    { name: 'temperature', unit: '°C', baseValue: 65, variance: 5 },
    { name: 'pressure', unit: 'bar', baseValue: 4.5, variance: 0.5 },
    { name: 'vibration', unit: 'mm/s', baseValue: 0.5, variance: 0.3 },
    { name: 'production_count', unit: 'units', baseValue: 50, variance: 10 }
  ]
  
  // Generate metrics for each work unit
  for (const workUnit of workUnits) {
    for (const metricType of metricTypes) {
      // Generate data points every 5 minutes
      for (let time = yesterday.getTime(); time <= now.getTime(); time += 5 * 60 * 1000) {
        const timestamp = new Date(time)
        const hour = timestamp.getHours()
        
        // Simulate different patterns based on time of day
        let multiplier = 1
        if (hour >= 6 && hour <= 9) multiplier = 1.2 // Morning ramp-up
        else if (hour >= 12 && hour <= 13) multiplier = 0.8 // Lunch break
        else if (hour >= 22 || hour <= 5) multiplier = 0.5 // Night shift
        
        // Add some randomness and patterns
        const randomFactor = 1 + (Math.random() - 0.5) * 0.2
        const sineFactor = Math.sin(time / (1000 * 60 * 60)) * 0.1
        
        let value = metricType.baseValue * multiplier * randomFactor + metricType.variance * sineFactor
        
        // Special handling for production count (should be integer)
        if (metricType.name === 'production_count') {
          value = Math.floor(value)
        }
        
        metrics.push({
          workUnitId: workUnit.id,
          name: metricType.name,
          value: value,
          unit: metricType.unit,
          timestamp: timestamp,
          source: 'sensor',
          quality: 0.95 + Math.random() * 0.05,
          tags: {
            shift: hour >= 6 && hour < 14 ? 'morning' : hour >= 14 && hour < 22 ? 'afternoon' : 'night',
            equipmentType: workUnit.equipmentType,
            location: workUnit.location || 'main-floor'
          }
        })
      }
    }
  }
  
  console.log(`Creating ${metrics.length} metric records...`)
  
  // Insert in batches to avoid overwhelming the database
  const batchSize = 1000
  for (let i = 0; i < metrics.length; i += batchSize) {
    const batch = metrics.slice(i, i + batchSize)
    await prisma.metric.createMany({
      data: batch,
      skipDuplicates: true
    })
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(metrics.length / batchSize)}`)
  }
  
  console.log('Metrics seeding completed!')
}

seedMetrics()
  .catch((e) => {
    console.error('Error seeding metrics:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })