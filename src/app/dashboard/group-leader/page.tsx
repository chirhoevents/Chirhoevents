'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  AlertCircle,
  Users,
  CreditCard,
  FileText,
  Shield,
  Copy,
  Download,
  Share2,
  Mail
} from 'lucide-react'

interface DashboardData {
  groupName: string
  eventName: string
  eventDates: string
  accessCode: string
  totalParticipants: number
  payment: {
    totalAmount: number
    paidAmount: number
    balanceRemaining: number
    dueDate: string | null
    status: string
    isOverdue: boolean
    lateFeeApplied: number
  }
  forms: {
    totalRequired: number
    completed: number
    pending: number
  }
  certificates: {
    totalRequired: number
    uploaded: number
    verified: number
    pending: number
  }
}

export default function GroupLeaderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/group-leader/dashboard')
        if (response.ok) {
          const dashboardData = await response.json()
          setData(dashboardData)
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const copyAccessCode = () => {
    if (data) {
      navigator.clipboard.writeText(data.accessCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Failed to load dashboard data</div>
      </div>
    )
  }

  const paymentProgress = (data.payment.paidAmount / data.payment.totalAmount) * 100
  const formsProgress = (data.forms.completed / data.forms.totalRequired) * 100

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Dashboard
        </h1>
        <p className="text-[#6B7280]">
          Manage your group registration for {data.eventName}
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: Registration Overview */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Registration Overview
            </h3>
            <Users className="h-6 w-6 text-[#9C8466]" />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-[#6B7280]">Event</p>
              <p className="font-medium text-[#1F2937]">{data.eventName}</p>
            </div>

            <div>
              <p className="text-sm text-[#6B7280]">Event Dates</p>
              <p className="font-medium text-[#1F2937]">{data.eventDates}</p>
            </div>

            <div>
              <p className="text-sm text-[#6B7280]">Group Name</p>
              <p className="font-medium text-[#1F2937]">{data.groupName}</p>
            </div>

            <div>
              <p className="text-sm text-[#6B7280]">Access Code</p>
              <div className="flex items-center space-x-2">
                <code className="font-mono text-sm bg-[#F9FAFB] px-2 py-1 rounded border border-[#E5E7EB]">
                  {data.accessCode}
                </code>
                <button
                  onClick={copyAccessCode}
                  className="p-1 hover:bg-[#F5F1E8] rounded"
                  title="Copy access code"
                >
                  <Copy className="h-4 w-4 text-[#6B7280]" />
                </button>
              </div>
              {copySuccess && (
                <p className="text-xs text-green-600 mt-1">Copied!</p>
              )}
            </div>

            <div>
              <p className="text-sm text-[#6B7280]">Total Participants</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                {data.totalParticipants}
              </p>
            </div>
          </div>
        </Card>

        {/* CARD 2: Payment Status */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Payment Status
            </h3>
            <CreditCard className="h-6 w-6 text-[#9C8466]" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280]">Total Amount</p>
              <p className="text-xl font-bold text-[#1F2937]">
                ${data.payment.totalAmount.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-[#6B7280] mb-2">Progress</p>
              <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                <div
                  className="bg-[#9C8466] h-2 rounded-full transition-all"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#6B7280]">
                  ${data.payment.paidAmount.toFixed(2)} paid
                </span>
                <span className="text-xs text-[#6B7280]">
                  {paymentProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            {data.payment.status === 'paid_full' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Paid in Full</span>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-[#6B7280]">Balance Remaining</p>
                  <p className={`text-xl font-bold ${data.payment.isOverdue ? 'text-red-600' : 'text-[#1F2937]'}`}>
                    ${data.payment.balanceRemaining.toFixed(2)}
                  </p>
                </div>

                {data.payment.dueDate && (
                  <div>
                    <p className="text-sm text-[#6B7280]">Due Date</p>
                    <p className={data.payment.isOverdue ? 'text-red-600 font-medium' : 'text-[#1F2937]'}>
                      {new Date(data.payment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {data.payment.isOverdue && data.payment.lateFeeApplied > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <p className="text-sm text-red-800 font-medium">⚠️ Payment Overdue</p>
                    <p className="text-xs text-red-700 mt-1">
                      Late fee applied: ${data.payment.lateFeeApplied.toFixed(2)}
                    </p>
                  </div>
                )}

                <Link href="/dashboard/group-leader/payments">
                  <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                    Make Payment
                  </Button>
                </Link>
              </>
            )}

            <Link href="/dashboard/group-leader/payments" className="block">
              <Button variant="outline" className="w-full border-[#1E3A5F] text-[#1E3A5F]">
                View Payment History
              </Button>
            </Link>
          </div>
        </Card>

        {/* CARD 3: Liability Forms Status */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Liability Forms
            </h3>
            <FileText className="h-6 w-6 text-[#9C8466]" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280] mb-2">Progress</p>
              <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${formsProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-[#6B7280]">
                  {data.forms.completed}/{data.forms.totalRequired} completed
                </span>
                <span className="text-xs text-[#6B7280]">
                  {formsProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#6B7280]">Completed</p>
                <p className="text-2xl font-bold text-green-600 flex items-center">
                  {data.forms.completed}
                  <CheckCircle className="h-5 w-5 ml-2" />
                </p>
              </div>

              <div>
                <p className="text-sm text-[#6B7280]">Pending</p>
                <p className="text-2xl font-bold text-amber-600 flex items-center">
                  {data.forms.pending}
                  {data.forms.pending > 0 && <AlertCircle className="h-5 w-5 ml-2" />}
                </p>
              </div>
            </div>

            <Link href="/dashboard/group-leader/forms">
              <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                View All Forms
              </Button>
            </Link>

            {data.forms.completed === data.forms.totalRequired && (
              <Button variant="outline" className="w-full border-[#10B981] text-[#10B981]">
                <Download className="h-4 w-4 mr-2" />
                Download All PDFs
              </Button>
            )}
          </div>
        </Card>

        {/* CARD 4: Participants */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Participants
            </h3>
            <Users className="h-6 w-6 text-[#9C8466]" />
          </div>

          <div className="space-y-3">
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-[#1E3A5F]">
                {data.totalParticipants}
              </p>
              <p className="text-sm text-[#6B7280] mt-1">Total Participants</p>
            </div>

            <Link href="/dashboard/group-leader/participants">
              <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                View All Participants
              </Button>
            </Link>

            <p className="text-xs text-center text-[#6B7280] px-2">
              View detailed participant information, forms status, and manage your team
            </p>
          </div>
        </Card>

        {/* CARD 5: Safe Environment Certificates */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Certificates
            </h3>
            <Shield className="h-6 w-6 text-[#9C8466]" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7280]">Chaperones</p>
              <p className="text-xl font-bold text-[#1F2937]">
                {data.certificates.totalRequired}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-[#6B7280]">Uploaded</p>
                <p className="text-lg font-bold text-[#1F2937]">
                  {data.certificates.uploaded}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Verified</p>
                <p className="text-lg font-bold text-green-600">
                  {data.certificates.verified}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Pending</p>
                <p className="text-lg font-bold text-amber-600">
                  {data.certificates.pending}
                </p>
              </div>
            </div>

            <Link href="/dashboard/group-leader/certificates">
              <Button className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white">
                Manage Certificates
              </Button>
            </Link>
          </div>
        </Card>

        {/* CARD 6: Quick Actions */}
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1E3A5F]">
              Quick Actions
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <Button
                onClick={copyAccessCode}
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F]"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Access Code
                  </>
                )}
              </Button>
            </div>

            <Link href="/dashboard/group-leader/settings">
              <Button
                variant="outline"
                className="w-full border-[#1E3A5F] text-[#1E3A5F]"
              >
                Edit Registration Details
              </Button>
            </Link>

            <Button
              variant="outline"
              className="w-full border-[#1E3A5F] text-[#1E3A5F]"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Event Organizers
            </Button>

            <Button
              variant="outline"
              className="w-full border-[#1E3A5F] text-[#1E3A5F]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
