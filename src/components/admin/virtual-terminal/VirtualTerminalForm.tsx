'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, CheckCircle, DollarSign, Banknote, ArrowLeft } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface Registration {
  type: 'group' | 'individual'
  id: string
  accessCode?: string
  confirmationCode?: string
  groupName?: string
  parishName?: string
  leaderName?: string
  leaderEmail?: string
  leaderPhone?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  event: {
    id: string
    name: string
    startDate: string
  }
  totalAmount: number
  amountPaid: number
  balance: number
  participantCount?: number
  depositAmount?: number
  roomType?: string
  housingType?: string
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    stripePaymentMethodId?: string
    cardBrand?: string
    cardLast4?: string
    createdAt: string
  }>
}

interface PaymentSuccessData {
  id: string
  amount: number
  paymentMethod: string
  cardLast4?: string
  recipientEmail: string
  recipientName: string
  eventName: string
  newBalance: number
}

interface VirtualTerminalFormProps {
  registration: Registration
  onSuccess: (payment: PaymentSuccessData) => void
  onCancel: () => void
}

export function VirtualTerminalForm({ registration, onSuccess, onCancel }: VirtualTerminalFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <VirtualTerminalFormInner
        registration={registration}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}

function VirtualTerminalFormInner({ registration, onSuccess, onCancel }: VirtualTerminalFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [paymentMethod, setPaymentMethod] = useState<'new_card' | 'saved_card' | 'check' | 'cash'>('new_card')
  const [amountType, setAmountType] = useState<'full' | 'deposit' | 'custom'>('full')
  const [customAmount, setCustomAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasCardOnFile = registration.payments?.some((p) => p.stripePaymentMethodId)
  const lastCardPayment = registration.payments?.find((p) => p.stripePaymentMethodId)
  const lastCardBrand = lastCardPayment?.cardBrand
  const lastCardLast4 = lastCardPayment?.cardLast4

  function getAmount(): number {
    if (amountType === 'full') {
      return registration.balance
    } else if (amountType === 'deposit' && registration.type === 'group') {
      return Math.min(registration.depositAmount || 0, registration.balance)
    } else if (amountType === 'custom') {
      return parseFloat(customAmount) || 0
    }
    return 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = getAmount()

      if (amount <= 0) {
        throw new Error('Please enter a valid payment amount')
      }

      if (amount > registration.balance) {
        throw new Error(`Amount cannot exceed balance of $${registration.balance.toFixed(2)}`)
      }

      const paymentData: {
        registrationType: string
        registrationId: string
        amount: number
        notes: string
        paymentMethod: string
        stripePaymentMethodId?: string
      } = {
        registrationType: registration.type,
        registrationId: registration.id,
        amount,
        notes,
        paymentMethod
      }

      if (paymentMethod === 'new_card') {
        if (!stripe || !elements) {
          throw new Error('Stripe not loaded')
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card element not found')
        }

        // Create payment method
        const { error: pmError, paymentMethod: pm } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement
        })

        if (pmError) {
          throw new Error(pmError.message)
        }

        paymentData.stripePaymentMethodId = pm.id

      } else if (paymentMethod === 'saved_card') {
        if (!lastCardPayment?.stripePaymentMethodId) {
          throw new Error('No saved card found')
        }
        paymentData.stripePaymentMethodId = lastCardPayment.stripePaymentMethodId
      }

      // Process payment
      const response = await fetch('/api/admin/virtual-terminal/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      onSuccess(result.payment)

    } catch (err: unknown) {
      console.error('Payment error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const amount = getAmount()

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1E3A5F]">Process Payment</CardTitle>
            <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-500">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Registration Info */}
          <div className="bg-[#F5F1E8] rounded-lg p-4">
            <h3 className="font-semibold text-[#1E3A5F] mb-3">Registration Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">
                  {registration.type === 'group' ? 'Group' : 'Name'}
                </p>
                <p className="font-medium text-[#1E3A5F]">
                  {registration.type === 'group'
                    ? registration.groupName
                    : `${registration.firstName} ${registration.lastName}`
                  }
                </p>
              </div>
              {registration.type === 'group' && (
                <div>
                  <p className="text-gray-600">Leader</p>
                  <p className="font-medium">{registration.leaderName}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Event</p>
                <p className="font-medium">{registration.event.name}</p>
              </div>
              {registration.type === 'group' && registration.participantCount && (
                <div>
                  <p className="text-gray-600">Participants</p>
                  <p className="font-medium">{registration.participantCount}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Total</p>
                <p className="font-medium text-lg">${registration.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Paid</p>
                <p className="font-medium text-green-600">${registration.amountPaid.toFixed(2)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-600">Balance Due</p>
                <p className="font-bold text-2xl text-[#1E3A5F]">${registration.balance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Amount Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block text-[#1E3A5F]">Payment Amount</Label>
            <RadioGroup value={amountType} onValueChange={(v) => setAmountType(v as 'full' | 'deposit' | 'custom')}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="flex-1 cursor-pointer">
                    Pay Full Balance
                    <span className="ml-2 font-semibold text-[#1E3A5F]">
                      ${registration.balance.toFixed(2)}
                    </span>
                  </Label>
                </div>

                {registration.type === 'group' && registration.depositAmount && registration.depositAmount > 0 && (
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                      Pay Deposit Only
                      <span className="ml-2 font-semibold text-[#1E3A5F]">
                        ${Math.min(registration.depositAmount, registration.balance).toFixed(2)}
                      </span>
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1 cursor-pointer">
                    Custom Amount
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {amountType === 'custom' && (
              <div className="mt-3">
                <Label htmlFor="customAmount">Enter Amount</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={registration.balance}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: ${registration.balance.toFixed(2)}
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-900">
                Amount to charge: <span className="text-xl ml-2">${amount.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-base font-semibold mb-3 block text-[#1E3A5F]">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'new_card' | 'saved_card' | 'check' | 'cash')}>
              <div className="space-y-2">
                {hasCardOnFile && lastCardLast4 && (
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="saved_card" id="saved_card" />
                    <Label htmlFor="saved_card" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Charge card on file</span>
                        <span className="text-gray-600">
                          ({lastCardBrand} ****{lastCardLast4})
                        </span>
                      </div>
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="new_card" id="new_card" />
                  <Label htmlFor="new_card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Enter new card</span>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="check" id="check" />
                  <Label htmlFor="check" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Record check payment</span>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      <span>Record cash payment</span>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {paymentMethod === 'new_card' && (
              <div className="mt-4 p-4 border rounded-lg">
                <Label className="mb-2 block">Card Information</Label>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#1E3A5F',
                        '::placeholder': {
                          color: '#9CA3AF'
                        }
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Card information is securely processed by Stripe
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Phone payment - caller requested to pay $500 toward balance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Add any relevant notes about this payment
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Payment Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || amount <= 0}
              className="flex-1 bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Process Payment ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
