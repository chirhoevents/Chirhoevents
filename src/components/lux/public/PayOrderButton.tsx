'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

export default function PayOrderButton({ orderId, token, label }: { orderId: string; token: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/lux/public/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not start the payment.')
      window.location.href = data.checkoutUrl
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }
  return (
    <div>
      <button type="button" onClick={pay} disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-6 py-3 text-white font-medium disabled:bg-gray-300">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {label}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
