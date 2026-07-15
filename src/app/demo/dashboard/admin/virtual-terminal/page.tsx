'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreditCard, Search, Check, CheckCircle } from 'lucide-react'

interface DemoRegistration {
  accessCode: string
  type: 'group' | 'individual'
  groupName: string
  leaderName: string
  leaderEmail: string
  eventName: string
  totalAmount: number
  amountPaid: number
  balance: number
}

const DEMO_REGISTRATIONS: DemoRegistration[] = [
  {
    accessCode: 'MTN-2026-STMARY',
    type: 'group',
    groupName: "St. Mary's Youth Group",
    leaderName: 'Sample Leader',
    leaderEmail: 'leader@example.com',
    eventName: 'Summer Youth Retreat 2026',
    totalAmount: 2850,
    amountPaid: 855,
    balance: 1995,
  },
  {
    accessCode: 'IND-WRIGHT-01',
    type: 'individual',
    groupName: 'Thomas Wright',
    leaderName: 'Thomas Wright',
    leaderEmail: 'twright@example.com',
    eventName: "Men's Silent Retreat",
    totalAmount: 320,
    amountPaid: 320,
    balance: 0,
  },
]

export default function VirtualTerminalPage() {
  const [accessCode, setAccessCode] = useState('')
  const [registration, setRegistration] = useState<DemoRegistration | null>(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [cardNumber, setCardNumber] = useState('')
  const [processed, setProcessed] = useState<{ amount: number; last4: string } | null>(null)

  const handleLookup = () => {
    setError('')
    const found = DEMO_REGISTRATIONS.find((r) => r.accessCode.toLowerCase() === accessCode.trim().toLowerCase())
    if (!found) {
      setError('Registration not found. Try MTN-2026-STMARY or IND-WRIGHT-01.')
      return
    }
    setRegistration(found)
    setAmount(found.balance)
  }

  const handleCharge = () => {
    if (!registration) return
    setProcessed({ amount, last4: cardNumber.slice(-4) || '4242' })
  }

  const reset = () => {
    setAccessCode('')
    setRegistration(null)
    setError('')
    setProcessed(null)
    setAmount(0)
    setCardNumber('')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-8 h-8 text-[#1E3A5F]" />
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Virtual Terminal</h1>
        </div>
        <p className="text-gray-600">Process payments over the phone or in-person</p>
      </div>

      {processed ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <CardTitle className="text-emerald-900">Payment Processed (Demo)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-emerald-900">
              Charged <strong>${processed.amount}</strong> to card ending in{' '}
              <strong>{processed.last4}</strong>.
            </p>
            <p className="text-sm text-emerald-800">
              A fake receipt was recorded. No real Stripe charge was made.
            </p>
            <Button onClick={reset} className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
              Process Another
            </Button>
          </CardContent>
        </Card>
      ) : registration ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Registration Found</CardTitle>
            <CardDescription>
              {registration.groupName} — {registration.eventName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-[#F5F1E8] rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-[#1E3A5F]">${registration.totalAmount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-lg font-bold text-emerald-700">${registration.amountPaid}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-lg font-bold text-amber-700">${registration.balance}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Amount to charge</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="card">Card number (demo)</Label>
              <Input
                id="card"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="mt-2 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Demo mode — no real card is validated or charged.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCharge}
                disabled={amount < 1}
                className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Charge ${amount} (Demo)
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Look Up Registration</CardTitle>
            <CardDescription>
              Enter the group access code or individual confirmation code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Access Code or Confirmation Code</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="accessCode"
                  placeholder="e.g., MTN-2026-STMARY or IND-WRIGHT-01"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  className="flex-1"
                />
                <Button
                  onClick={handleLookup}
                  disabled={!accessCode.trim()}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
                >
                  <Search className="w-4 h-4" />
                  <span className="ml-2">Look Up</span>
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium text-[#1E3A5F] mb-2">Quick Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Group access codes typically start with event prefix (e.g., MTN-2026-STMARY)</li>
                <li>Individual confirmation codes typically start with IND-</li>
                <li>Ask the caller for their code or search by name in Registrations first</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
