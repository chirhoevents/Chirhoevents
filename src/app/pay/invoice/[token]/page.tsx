'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface InvoiceData {
  id: string
  invoiceNumber: number
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  invoiceType: string
  description: string | null
  dueDate: string
  paidAt: string | null
  periodStart: string | null
  periodEnd: string | null
  lineItems: Array<{ description: string; amount: number }> | null
  organization: {
    name: string
    legalName: string
    contactEmail: string
  }
}

export default function InvoicePaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  const isSuccess = searchParams.get('success') === 'true'
  const paymentCancelled = searchParams.get('cancelled') === 'true'

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/invoices/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Invoice not found. Please check the link or contact support.')
          } else {
            throw new Error('Failed to load invoice')
          }
          return
        }
        const data = await response.json()
        setInvoice(data.invoice)
      } catch {
        setError('Failed to load invoice. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInvoice()
    }
  }, [token])

  const handlePayNow = async () => {
    if (!invoice) return

    setProcessingPayment(true)
    try {
      const response = await fetch(`/api/invoices/${token}/checkout`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Failed to start payment. Please try again.')
      setProcessingPayment(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return styles[status] || styles.pending
  }

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      setup_fee: 'Setup Fee',
      subscription: 'Subscription',
      reactivation_fee: 'Reactivation Fee',
      custom: 'Custom',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Invoice</h1>
          <p className="text-gray-600 mb-6">{error || 'Invoice not found'}</p>
          <a
            href="mailto:support@chirhoevents.com"
            className="inline-block bg-[#1E3A5F] text-white px-6 py-3 rounded-lg hover:bg-[#2d4a6f] transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    )
  }

  const isPaid = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const canPay = !isPaid && !isCancelled

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-[#1E3A5F] text-white rounded-t-xl p-6 text-center">
          <h1 className="text-2xl font-bold">ChirhoEvents</h1>
          <p className="text-[#9C8466] text-sm mt-1">Invoice Payment Portal</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
          {/* Status Banner */}
          {isSuccess && (
            <div className="bg-green-500 text-white py-4 px-6 text-center">
              <div className="font-semibold text-lg">Payment Successful!</div>
              <p className="text-sm opacity-90">Thank you for your payment. A confirmation email has been sent.</p>
            </div>
          )}
          {paymentCancelled && !isPaid && (
            <div className="bg-yellow-500 text-white py-3 px-6 text-center font-semibold">
              Payment was cancelled. You can try again below.
            </div>
          )}
          {isPaid && !isSuccess && (
            <div className="bg-green-500 text-white py-3 px-6 text-center font-semibold">
              This invoice has been paid. Thank you!
            </div>
          )}
          {invoice.status === 'cancelled' && (
            <div className="bg-gray-500 text-white py-3 px-6 text-center font-semibold">
              This invoice has been cancelled.
            </div>
          )}
          {invoice.status === 'overdue' && !isPaid && (
            <div className="bg-red-500 text-white py-3 px-6 text-center font-semibold">
              This invoice is overdue. Please pay as soon as possible.
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
              <div>
                <h2 className="text-sm text-gray-500 uppercase tracking-wide">Invoice</h2>
                <p className="text-3xl font-bold text-[#1E3A5F]">#{invoice.invoiceNumber}</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                    invoice.status
                  )}`}
                >
                  {invoice.status.toUpperCase()}
                </span>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500">Bill To:</p>
                <p className="font-semibold text-gray-900">{invoice.organization.name}</p>
              </div>
            </div>

            {/* Amount Due */}
            <div className="bg-[#F5F1E8] rounded-xl p-6 text-center mb-8">
              <p className="text-sm text-gray-600 mb-1">
                {isPaid ? 'Amount Paid' : 'Amount Due'}
              </p>
              <p className="text-4xl font-bold text-[#1E3A5F]">{formatCurrency(invoice.amount)}</p>
              {!isPaid && invoice.dueDate && (
                <p className="text-sm text-gray-600 mt-2">
                  Due by: <span className="font-semibold">{formatDate(invoice.dueDate)}</span>
                </p>
              )}
              {isPaid && invoice.paidAt && (
                <p className="text-sm text-green-600 mt-2">
                  Paid on: <span className="font-semibold">{formatDate(invoice.paidAt)}</span>
                </p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="space-y-4 mb-8">
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{getInvoiceTypeLabel(invoice.invoiceType)}</span>
                  </div>
                  {invoice.periodStart && invoice.periodEnd && (
                    <div>
                      <span className="text-gray-500">Service Period:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {invoice.description && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{invoice.description}</p>
                </div>
              )}

              {/* Line Items */}
              {invoice.lineItems && invoice.lineItems.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
                  <div className="space-y-2">
                    {invoice.lineItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.description}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
                      <span>Total</span>
                      <span>{formatCurrency(invoice.amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pay Button */}
            {canPay && (
              <div className="space-y-4">
                <button
                  onClick={handlePayNow}
                  disabled={processingPayment}
                  className="w-full bg-[#1E3A5F] text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      Pay Now with Card
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-gray-500">
                  <p>Secure payment powered by Stripe</p>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
              <p>Questions about this invoice?</p>
              <p>
                Contact us at{' '}
                <a
                  href="mailto:support@chirhoevents.com"
                  className="text-[#1E3A5F] hover:underline"
                >
                  support@chirhoevents.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} ChirhoEvents. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
