'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CreditCard, CheckCircle, DollarSign, FileText, Download } from 'lucide-react'

const INITIAL_TOTAL = 2850
const INITIAL_PAID = 855

interface Payment {
  id: string
  date: string
  amount: number
  method: string
  cardLast4?: string
  status: 'completed' | 'pending'
}

const INITIAL_HISTORY: Payment[] = [
  { id: 'pay1', date: '2026-05-12', amount: 285, method: 'Deposit (1 seat)', cardLast4: '4242', status: 'completed' },
  { id: 'pay2', date: '2026-05-28', amount: 570, method: 'Card', cardLast4: '4242', status: 'completed' },
]

export default function PaymentsPage() {
  const [amountPaid, setAmountPaid] = useState(INITIAL_PAID)
  const [history, setHistory] = useState<Payment[]>(INITIAL_HISTORY)
  const [payAmount, setPayAmount] = useState<number>(INITIAL_TOTAL - INITIAL_PAID)
  const [cardNumber, setCardNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const balance = INITIAL_TOTAL - amountPaid
  const progress = (amountPaid / INITIAL_TOTAL) * 100

  const handlePay = () => {
    setProcessing(true)
    setTimeout(() => {
      const last4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242'
      const newPayment: Payment = {
        id: `pay-${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toISOString().slice(0, 10),
        amount: payAmount,
        method: 'Card',
        cardLast4: last4,
        status: 'completed',
      }
      setHistory((prev) => [newPayment, ...prev])
      setAmountPaid((prev) => prev + payAmount)
      setPayAmount(0)
      setCardNumber('')
      setProcessing(false)
      setSuccess(`Paid $${payAmount} · Fake receipt logged.`)
      setTimeout(() => setSuccess(null), 4000)
    }, 700)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Payments</h1>
        <p className="text-[#6B7280]">Track and make payments for your group</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total registration" value={`$${INITIAL_TOTAL}`} />
        <StatCard label="Amount paid" value={`$${amountPaid}`} accent="text-emerald-700" />
        <StatCard
          label="Balance due"
          value={`$${balance}`}
          accent={balance > 0 ? 'text-amber-700' : 'text-emerald-700'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Payment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-[#1E3A5F] to-[#9C8466] h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>${amountPaid} paid</span>
            <span>{Math.round(progress)}%</span>
            <span>${INITIAL_TOTAL} total</span>
          </div>
        </CardContent>
      </Card>

      {balance > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E3A5F]">Make a Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
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
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Demo mode — no real card is validated or charged.
              </p>
            </div>
            <Button
              onClick={handlePay}
              disabled={processing || payAmount < 1 || payAmount > balance}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {processing ? 'Processing…' : `Pay $${payAmount}`}
            </Button>
            {success && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm mt-2">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Paid in Full</p>
              <p className="text-sm text-emerald-800">No balance remaining.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {history.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1E3A5F]">${p.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.date} · {p.method}
                      {p.cardLast4 && ` · ending ${p.cardLast4}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800">{p.status}</Badge>
                  <Button
                    onClick={() => alert(`Demo: Would download receipt for payment ${p.id}.`)}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${accent || 'text-[#1E3A5F]'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
