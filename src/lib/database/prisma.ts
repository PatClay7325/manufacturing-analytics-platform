/**
 * Consolidated Prisma Client
 * Single source of truth for database connections
 */

import { PrismaClient } from '../../../prisma/generated/client'

const prismaClientSingleton = () => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['error', 'warn'] 
        : ['error'],
      errorFormat: 'minimal',
    })
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error)
    // Fallback initialization
    return new PrismaClient()
  }
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})