'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CreditCard,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Validate Stripe key exists
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripeKey) {
  console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

type PaymentStatus = 'paid_full' | 'paid_partial' | 'deposit_paid' | 'pending' | 'pending_check_payment'
type PaymentType = 'deposit' | 'balance' | 'late_fee' | 'refund'
type PaymentMethod = 'card' | 'check' | 'cash'

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  lateFeesApplied: number
  lastPaymentDate: string | null
  paymentStatus: PaymentStatus
}

interface PaymentTransaction {
  id: string
  amount: number
  paymentType: PaymentType
  paymentMethod: PaymentMethod
  paymentStatus: string
  receiptUrl: string | null
  checkNumber: string | null
  checkReceivedDate: string | null
  notes: string | null
  processedAt: string | null
  createdAt: string
}

function CheckoutForm({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Add useEffect to check Stripe loading status
  useEffect(() => {
    if (!stripe) {
      console.log('Stripe.js has not yet loaded.')
    } else {
      console.log('Stripe.js loaded successfully')
    }
  }, [stripe])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setErrorMessage('Payment system not ready. Please wait a moment and try again.')
      return
    }

    setProcessing(true)
    setErrorMessage(null)

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/group-leader/payments?payment=success`,
        },
      })

      if (error) {
        setErrorMessage(error.message || 'An error occurred')
        setProcessing(false)
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
        <p className="text-sm text-[#6B7280]">Payment Amount</p>
        <p className="text-2xl font-bold text-[#1E3A5F]">
          ${amount.toFixed(2)}
        </p>
      </div>

      {!stripe && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-sm text-blue-800">Loading payment system...</p>
        </div>
      )}

      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#9C8466] hover:bg-[#8B7355] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title={!stripe ? 'Waiting for payment system to load...' : ''}
        >
          {processing ? 'Processing...' : !stripe ? 'Loading...' : `Pay $${amount.toFixed(2)}`}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-[#1E3A5F] text-[#1E3A5F]"
          disabled={processing}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function PaymentsPage() {
  const [balance, setBalance] = useState<PaymentBalance | null>(null)
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [creatingPayment, setCreatingPayment] = useState(false)

  const fetchPaymentData = async () => {
    try {
      const response = await fetch('/api/group-leader/payments')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.balance)
        setPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentData()

    // Check if returning from successful payment
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('payment') === 'success') {
        // Refresh payment data after successful payment
        setTimeout(() => {
          fetchPaymentData()
        }, 2000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreatePaymentIntent = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    if (balance && amount > balance.amountRemaining) {
      alert('Payment amount cannot exceed balance remaining')
      return
    }

    setCreatingPayment(true)
    try {
      const response = await fetch('/api/group-leader/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes: paymentNotes }),
      })

      if (response.ok) {
        const data = await response.json()
        setClientSecret(data.clientSecret)
        setShowPaymentForm(true)
      } else {
        alert('Failed to create payment')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('An error occurred')
    } finally {
      setCreatingPayment(false)
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    setClientSecret('')
    setPaymentAmount('')
    setPaymentNotes('')
    fetchPaymentData()
  }

  const handleCancelPayment = () => {
    setShowPaymentForm(false)
    setClientSecret('')
    setPaymentNotes('')
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const badges = {
      paid_full: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid in Full
        </span>
      ),
      paid_partial: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" />
          Partially Paid
        </span>
      ),
      deposit_paid: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Deposit Paid
        </span>
      ),
      pending: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      ),
      pending_check_payment: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending Check
        </span>
      ),
    }
    return badges[status] || badges.pending
  }

  const getPaymentTypeLabel = (type: PaymentType): string => {
    const labels: Record<PaymentType, string> = {
      deposit: 'Deposit',
      balance: 'Balance Payment',
      late_fee: 'Late Fee',
      refund: 'Refund',
    }
    return labels[type] || type
  }

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const labels: Record<PaymentMethod, string> = {
      card: 'Credit/Debit Card',
      check: 'Check',
      cash: 'Cash',
    }
    return labels[method] || method
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading payment data...</div>
      </div>
    )
  }

  const paymentProgress = balance
    ? (balance.amountPaid / balance.totalAmountDue) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Payments</h1>
        <p className="text-[#6B7280]">
          Manage your group&apos;s payments and view transaction history
        </p>
      </div>

      {/* Payment Balance Summary */}
      {balance && (
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1E3A5F]">
                Payment Balance
              </h2>
              {getPaymentStatusBadge(balance.paymentStatus)}
            </div>
            <DollarSign className="h-8 w-8 text-[#9C8466]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Total Amount Due</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                ${balance.totalAmountDue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">
                ${balance.amountPaid.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280] mb-1">Balance Remaining</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                ${balance.amountRemaining.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-[#6B7280] mb-2">
              <span>Payment Progress</span>
              <span>{paymentProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[#E5E7EB] rounded-full h-3">
              <div
                className="bg-[#9C8466] h-3 rounded-full transition-all"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </div>

          {/* Download Invoice Button */}
          <div className="mb-6">
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="w-full border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Payment Invoice
            </Button>
          </div>

          {balance.lateFeesApplied > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Late Fee Applied
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    ${balance.lateFeesApplied.toFixed(2)} in late fees have been
                    added to your balance
                  </p>
                </div>
              </div>
            </div>
          )}

          {balance.lastPaymentDate && (
            <p className="text-sm text-[#6B7280]">
              Last payment:{' '}
              {new Date(balance.lastPaymentDate).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      {/* Make Payment */}
      {balance && balance.amountRemaining > 0 && !showPaymentForm && (
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="text-lg font-semibold text-[#1E3A5F] mb-4">
            Make a Payment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentAmount" className="text-[#1E3A5F]">
                  Payment Amount
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                    $
                  </span>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={balance.amountRemaining}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Maximum: ${balance.amountRemaining.toFixed(2)}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() =>
                    setPaymentAmount(balance.amountRemaining.toFixed(2))
                  }
                  variant="outline"
                  size="sm"
                  className="border-[#1E3A5F] text-[#1E3A5F]"
                >
                  Pay Full Balance
                </Button>
                <Button
                  onClick={() =>
                    setPaymentAmount((balance.amountRemaining / 2).toFixed(2))
                  }
                  variant="outline"
                  size="sm"
                  className="border-[#1E3A5F] text-[#1E3A5F]"
                >
                  Pay Half
                </Button>
              </div>

              <div>
                <Label htmlFor="paymentNotes" className="text-[#1E3A5F]">
                  Notes (Optional)
                </Label>
                <textarea
                  id="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add a note about this payment (e.g., 'Deposit for 5 participants')"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C8466] focus:border-transparent"
                  rows={2}
                />
                <p className="text-xs text-[#6B7280] mt-1">
                  Add any notes or details about this payment for your records
                </p>
              </div>

              <Button
                onClick={handleCreatePaymentIntent}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || creatingPayment}
                className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {creatingPayment ? 'Processing...' : 'Continue to Payment'}
              </Button>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
              <h4 className="font-medium text-[#1E3A5F] mb-3">
                Payment Information
              </h4>
              <ul className="space-y-2 text-sm text-[#6B7280]">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Secure payment processing via Stripe</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Instant confirmation and receipt via email</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Credit card, debit card, and ACH supported</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Payment history available for download</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Form */}
      {showPaymentForm && clientSecret && (
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <h3 className="text-lg font-semibold text-[#1E3A5F] mb-6">
            Complete Payment
          </h3>
          {!stripePromise ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-800 font-medium">
                Payment system configuration error
              </p>
              <p className="text-xs text-red-700 mt-1">
                Stripe is not properly configured. Please contact support.
              </p>
              <Button
                onClick={handleCancelPayment}
                variant="outline"
                className="mt-3 border-red-500 text-red-700"
              >
                Go Back
              </Button>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#9C8466',
                  },
                },
              }}
            >
              <CheckoutForm
                clientSecret={clientSecret}
                amount={parseFloat(paymentAmount)}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancelPayment}
              />
            </Elements>
          )}
        </Card>
      )}

      {/* Payment History */}
      <Card className="p-6 bg-white border-[#D1D5DB]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#1E3A5F]">
            Payment History
          </h3>
          <Button
            onClick={fetchPaymentData}
            variant="outline"
            size="sm"
            className="border-[#1E3A5F] text-[#1E3A5F]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
            <p className="text-[#6B7280]">No payment transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-[#E5E7EB] rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-[#1E3A5F]">
                        {getPaymentTypeLabel(payment.paymentType)}
                      </h4>
                      <span className="text-sm text-[#6B7280]">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#6B7280]">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {payment.processedAt && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            Processed:{' '}
                            {new Date(payment.processedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {payment.checkNumber && (
                        <div>Check #{payment.checkNumber}</div>
                      )}
                    </div>

                    {payment.notes && (
                      <p className="text-sm text-[#6B7280] mt-2">
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-[#1E3A5F] mb-2">
                      ${payment.amount.toFixed(2)}
                    </p>
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-[#9C8466] hover:text-[#8B7355]"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
