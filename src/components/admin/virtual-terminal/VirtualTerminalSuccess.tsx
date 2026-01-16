'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, CreditCard, Banknote, Receipt } from 'lucide-react'
import { useState } from 'react'

interface PaymentData {
  amount: number
  paymentMethod: string
  cardLast4?: string
  recipientEmail: string
  recipientName: string
  eventName: string
  newBalance: number
}

interface VirtualTerminalSuccessProps {
  payment: PaymentData
  onProcessAnother: () => void
}

export function VirtualTerminalSuccess({ payment, onProcessAnother }: VirtualTerminalSuccessProps) {
  const [newAccessCode, setNewAccessCode] = useState('')

  const getPaymentMethodDisplay = () => {
    if (payment.paymentMethod === 'card' && payment.cardLast4) {
      return `Card ending in ${payment.cardLast4}`
    }
    switch (payment.paymentMethod) {
      case 'check':
        return 'Check'
      case 'cash':
        return 'Cash'
      case 'card':
        return 'Credit Card'
      default:
        return payment.paymentMethod
    }
  }

  const getPaymentIcon = () => {
    switch (payment.paymentMethod) {
      case 'check':
        return <Receipt className="w-5 h-5" />
      case 'cash':
        return <Banknote className="w-5 h-5" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-green-900 mb-2">
            Payment Processed Successfully!
          </h2>

          <p className="text-green-700 mb-6">
            Receipt has been sent to {payment.recipientEmail}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto text-left">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">Amount Charged</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                ${payment.amount.toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">New Balance</p>
              <p className={`text-2xl font-bold ${payment.newBalance <= 0 ? 'text-green-600' : 'text-[#1E3A5F]'}`}>
                ${payment.newBalance.toFixed(2)}
              </p>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">Payment Method</p>
              <div className="flex items-center gap-2 mt-1">
                {getPaymentIcon()}
                <p className="font-medium text-[#1E3A5F]">
                  {getPaymentMethodDisplay()}
                </p>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium text-[#1E3A5F]">{payment.recipientName}</p>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">Event</p>
              <p className="font-medium text-[#1E3A5F]">{payment.eventName}</p>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-600">
                  Receipt sent to {payment.recipientEmail}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Another Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Process Another Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nextCode">Enter Next Access Code</Label>
            <Input
              id="nextCode"
              placeholder="e.g., MTN-2000-ABC123 or IND-XYZ789"
              value={newAccessCode}
              onChange={(e) => setNewAccessCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newAccessCode.trim()) {
                  window.location.href = `/dashboard/admin/virtual-terminal?code=${encodeURIComponent(newAccessCode)}`
                }
              }}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onProcessAnother}
              variant="outline"
              className="flex-1"
            >
              Clear Form
            </Button>
            <Button
              onClick={() => {
                if (newAccessCode.trim()) {
                  window.location.href = `/dashboard/admin/virtual-terminal?code=${encodeURIComponent(newAccessCode)}`
                }
              }}
              disabled={!newAccessCode.trim()}
              className="flex-1 bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
            >
              Look Up & Process
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
