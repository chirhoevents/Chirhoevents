import { NextRequest, NextResponse } from 'next/server'
import { clearFamilyCookie, endFamilySession } from '@/lib/lux/family-session'

/** POST /api/lux/public/family/logout: sign this browser out of the family page */
export async function POST(request: NextRequest) {
  await endFamilySession(request)
  const response = NextResponse.json({ success: true })
  clearFamilyCookie(response)
  return response
}
