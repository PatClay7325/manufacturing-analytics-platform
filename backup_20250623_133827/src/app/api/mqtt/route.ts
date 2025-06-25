import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'mqtt-api-ready',
    message: 'MQTT API is available' 
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({ 
      success: true,
      message: 'MQTT message processed',
      data: body
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process MQTT request' 
    }, { status: 500 })
  }
}