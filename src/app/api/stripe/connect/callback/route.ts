import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const success = searchParams.get('success')

  // Redirect to settings page with appropriate message
  if (success === 'true') {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/settings?tab=integrations&stripe_connected=true`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/settings?tab=integrations&stripe_error=true`
  )
}
