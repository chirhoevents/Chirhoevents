'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Catch-all route to handle Clerk verification redirects
// Redirects back to the main invite page
export default function InviteCatchAll() {
  const params = useParams()
  const router = useRouter()
  const inviteId = params.inviteId as string

  useEffect(() => {
    // Redirect to the main invite page
    router.replace(`/invite/${inviteId}`)
  }, [inviteId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2A4A6F] to-[#1E3A5F]">
      <div className="text-white text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  )
}
