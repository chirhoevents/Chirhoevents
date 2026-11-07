'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function UnsubscribeButton({ token, businessName }: { token: string; businessName: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const unsubscribe = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/vendor/leads/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return <p className="text-green-700 font-medium">Done. You won&apos;t get any more emails from {businessName}.</p>
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={unsubscribe}
        disabled={state === 'loading'}
        className="w-full bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
      >
        {state === 'loading' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Unsubscribe
      </Button>
      {state === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
    </div>
  )
}
