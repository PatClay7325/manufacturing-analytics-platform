import { NextRequest, NextResponse } from 'next/server'
import { getSystemStatus } from '@/app/monitoring/actions'

export async function GET(req: NextRequest) {
  try {
    const status = await getSystemStatus()
    
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error fetching system status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}