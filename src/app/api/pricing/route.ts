import { NextResponse } from 'next/server'
import { getPlatformPricing } from '@/lib/pricing-config'

// Public endpoint - no authentication required
// This fetches pricing configuration for the homepage
export async function GET() {
  try {
    const pricing = await getPlatformPricing()

    // Cache for 5 minutes
    return NextResponse.json(
      { pricing },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    )
  }
}
