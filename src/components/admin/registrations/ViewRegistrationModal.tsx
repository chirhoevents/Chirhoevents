'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  X,
  Copy,
  Download,
  Mail,
  RefreshCw,
  User,
  Users,
  DollarSign,
  FileText,
  History,
  CheckCircle,
  Clock,
  XCircle,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'

interface ViewRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registrationId: string
  registrationType: 'group' | 'individual'
  onOpenEmail?: () => void
}

interface Participant {
  id: string
  firstName: string
  lastName: string
  preferredName?: string | null
  age: number
  gender: string
  participantType: string
  tShirtSize?: string | null
  liabilityFormCompleted: boolean
  liabilityFormUrl?: string | null
  email?: string | null
}

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: string
  paymentStatus: string
  checkNumber?: string | null
  cardLast4?: string | null
  cardBrand?: string | null
  receiptUrl?: string | null
  notes?: string | null
  processedAt?: string | null
  createdAt: string
  processedBy?: {
    firstName: string
    lastName: string
  } | null
}

interface Refund {
  id: string
  refundAmount: number
  refundMethod: string
  refundReason: string
  notes?: string | null
  status: string
  processedAt: string
  processedBy?: {
    firstName: string
    lastName: string
  } | null
}

interface EmailLog {
  id: string
  subject: string
  recipientEmail: string
  emailType: string
  sentStatus: string
  sentAt: string
  sentVia: string
}

interface RegistrationEdit {
  id: string
  editType: string
  changesMade: Record<string, any> | null
  oldTotal: number | null
  newTotal: number | null
  difference: number | null
  adminNotes: string | null
  editedAt: string
  editedBy: {
    firstName: string
    lastName: string
    email: string
  }
}

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  lateFeesApplied: number
  paymentStatus: string
}

interface GroupRegistrationData {
  id: string
  groupName: string
  parishName?: string | null
  dioceseName?: string | null
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  groupLeaderStreet?: string | null
  groupLeaderCity?: string | null
  groupLeaderState?: string | null
  groupLeaderZip?: string | null
  alternativeContact1Name?: string | null
  alternativeContact1Email?: string | null
  alternativeContact1Phone?: string | null
  alternativeContact2Name?: string | null
  alternativeContact2Email?: string | null
  alternativeContact2Phone?: string | null
  accessCode: string
  youthCount: number
  chaperoneCount: number
  priestCount: number
  totalParticipants: number
  housingType: string
  specialRequests?: string | null
  dietaryRestrictionsSummary?: string | null
  adaAccommodationsSummary?: string | null
  registrationStatus: string
  registeredAt: string
  participants: Participant[]
  paymentBalance: PaymentBalance | null
  payments: Payment[]
  refunds: Refund[]
  emailLogs: EmailLog[]
  registrationEdits: RegistrationEdit[]
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  liabilityFormsCompleted: number
  liabilityFormsTotal: number
  liabilityFormsPercentage: number
}

interface IndividualRegistrationData {
  id: string
  firstName: string
  lastName: string
  preferredName?: string | null
  email: string
  phone: string
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  age?: number | null
  gender?: string | null
  housingType?: string | null
  roomType?: string | null
  preferredRoommate?: string | null
  tShirtSize?: string | null
  dietaryRestrictions?: string | null
  adaAccommodations?: string | null
  emergencyContact1Name: string
  emergencyContact1Phone: string
  emergencyContact1Relation?: string | null
  emergencyContact2Name?: string | null
  emergencyContact2Phone?: string | null
  emergencyContact2Relation?: string | null
  registrationStatus: string
  confirmationCode?: string | null
  registeredAt: string
  paymentBalance: PaymentBalance | null
  payments: Payment[]
  refunds: Refund[]
  emailLogs: EmailLog[]
  registrationEdits: RegistrationEdit[]
  liabilityForms: Array<{
    id: string
    completed: boolean
    completedAt?: string | null
  }>
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
}

type RegistrationData = GroupRegistrationData | IndividualRegistrationData

function isGroupRegistration(data: RegistrationData): data is GroupRegistrationData {
  return 'groupName' in data
}

export default function ViewRegistrationModal({
  isOpen,
  onClose,
  registrationId,
  registrationType,
  onOpenEmail,
}: ViewRegistrationModalProps) {
  const [data, setData] = useState<RegistrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (isOpen && registrationId) {
      fetchRegistrationDetails()
    }
  }, [isOpen, registrationId, registrationType])

  async function fetchRegistrationDetails() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/registrations/${registrationId}/view?type=${registrationType}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch registration')
      }
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch registration:', error)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function getParticipantTypeLabel(type: string) {
    switch (type) {
      case 'youth_u18':
        return 'Youth Under 18'
      case 'youth_o18':
        return 'Youth Over 18'
      case 'chaperone':
        return 'Chaperone'
      case 'priest':
        return 'Priest/Clergy'
      default:
        return type
    }
  }

  function getPaymentStatusBadge(status: string) {
    switch (status) {
      case 'paid_full':
        return <Badge className="bg-green-500 text-white">Paid in Full</Badge>
      case 'partial':
        return <Badge className="bg-orange-500 text-white">Partial Payment</Badge>
      case 'unpaid':
        return <Badge className="bg-red-500 text-white">Unpaid</Badge>
      case 'overpaid':
        return <Badge className="bg-blue-500 text-white">Overpaid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  function getEmailStatusIcon(status: string) {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-[#1E3A5F]">
                {loading
                  ? 'Loading...'
                  : data
                  ? isGroupRegistration(data)
                    ? data.groupName
                    : `${data.firstName} ${data.lastName}`
                  : 'Registration Details'}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {registrationType === 'group' ? 'Group Registration' : 'Individual Registration'}
                {data && ` • ${data.event.name}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-[#9C8466] animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Failed to load registration details</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="details" className="text-xs sm:text-sm">
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger value="liability" className="text-xs sm:text-sm">
                  <Users className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Forms</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-xs sm:text-sm">
                  <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Payments</span>
                </TabsTrigger>
                <TabsTrigger value="emails" className="text-xs sm:text-sm">
                  <Mail className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Emails</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  <History className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2">
                {/* Tab 1: Registration Details */}
                <TabsContent value="details" className="space-y-4 mt-0">
                  {isGroupRegistration(data) ? (
                    <>
                      {/* Group Information */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Group Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Group Name:</span>
                            <p className="font-medium">{data.groupName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Parish:</span>
                            <p className="font-medium">{data.parishName || 'N/A'}</p>
                          </div>
                          {data.dioceseName && (
                            <div>
                              <span className="text-gray-600">Diocese:</span>
                              <p className="font-medium">{data.dioceseName}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Registration Date:</span>
                            <p className="font-medium">
                              {format(new Date(data.registeredAt), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Access Code:</span>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold text-[#1E3A5F]">
                                {data.accessCode}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(data.accessCode)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium capitalize">
                              {data.registrationStatus.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Group Leader */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Group Leader</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <p className="font-medium">{data.groupLeaderName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <p className="font-medium">{data.groupLeaderEmail}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <p className="font-medium">{data.groupLeaderPhone}</p>
                          </div>
                          {data.groupLeaderStreet && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Address:</span>
                              <p className="font-medium">
                                {data.groupLeaderStreet}
                                {data.groupLeaderCity && `, ${data.groupLeaderCity}`}
                                {data.groupLeaderState && `, ${data.groupLeaderState}`}
                                {data.groupLeaderZip && ` ${data.groupLeaderZip}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Alternative Contacts */}
                      {(data.alternativeContact1Name || data.alternativeContact2Name) && (
                        <Card className="p-4">
                          <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Alternative Contacts</h3>
                          <div className="space-y-4">
                            {data.alternativeContact1Name && (
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Name:</span>
                                  <p className="font-medium">{data.alternativeContact1Name}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Email:</span>
                                  <p className="font-medium">{data.alternativeContact1Email || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Phone:</span>
                                  <p className="font-medium">{data.alternativeContact1Phone || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                            {data.alternativeContact2Name && (
                              <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
                                <div>
                                  <span className="text-gray-600">Name:</span>
                                  <p className="font-medium">{data.alternativeContact2Name}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Email:</span>
                                  <p className="font-medium">{data.alternativeContact2Email || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Phone:</span>
                                  <p className="font-medium">{data.alternativeContact2Phone || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* Participant Counts */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Participants</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Youth Count:</span>
                            <span className="font-medium">{data.youthCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chaperone Count:</span>
                            <span className="font-medium">{data.chaperoneCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Priest Count:</span>
                            <span className="font-medium">{data.priestCount}</span>
                          </div>
                          <div className="col-span-2 pt-3 border-t flex justify-between">
                            <span className="text-gray-900 font-semibold">TOTAL:</span>
                            <span className="text-[#1E3A5F] font-bold">{data.totalParticipants}</span>
                          </div>
                        </div>
                      </Card>

                      {/* Housing & Logistics */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Housing & Logistics</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Housing Type:</span>
                            <p className="font-medium capitalize">
                              {data.housingType?.replace(/_/g, ' ') || 'N/A'}
                            </p>
                          </div>
                          {data.specialRequests && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Special Requests:</span>
                              <p className="font-medium">{data.specialRequests}</p>
                            </div>
                          )}
                          {data.dietaryRestrictionsSummary && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Dietary Restrictions:</span>
                              <p className="font-medium">{data.dietaryRestrictionsSummary}</p>
                            </div>
                          )}
                          {data.adaAccommodationsSummary && (
                            <div className="col-span-2">
                              <span className="text-gray-600">ADA Accommodations:</span>
                              <p className="font-medium">{data.adaAccommodationsSummary}</p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Pricing Summary */}
                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Pricing Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-semibold">
                              ${data.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="font-semibold text-green-600">
                              ${data.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-blue-300">
                            <span className="font-semibold">Balance Due:</span>
                            <span className="font-bold text-[#1E3A5F]">
                              ${data.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Individual Personal Information */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Full Name:</span>
                            <p className="font-medium">
                              {data.firstName} {data.lastName}
                              {data.preferredName && ` (${data.preferredName})`}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <p className="font-medium">{data.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <p className="font-medium">{data.phone}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Age:</span>
                            <p className="font-medium">{data.age || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Gender:</span>
                            <p className="font-medium capitalize">{data.gender || 'N/A'}</p>
                          </div>
                          {data.confirmationCode && (
                            <div>
                              <span className="text-gray-600">Confirmation Code:</span>
                              <div className="flex items-center gap-2">
                                <p className="font-mono font-semibold text-[#1E3A5F]">
                                  {data.confirmationCode}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(data.confirmationCode!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Registration Date:</span>
                            <p className="font-medium">
                              {format(new Date(data.registeredAt), 'MMMM d, yyyy')}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium capitalize">
                              {data.registrationStatus.replace(/_/g, ' ')}
                            </p>
                          </div>
                          {data.street && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Address:</span>
                              <p className="font-medium">
                                {data.street}
                                {data.city && `, ${data.city}`}
                                {data.state && `, ${data.state}`}
                                {data.zip && ` ${data.zip}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Emergency Contacts */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Emergency Contacts</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Contact 1 Name:</span>
                              <p className="font-medium">{data.emergencyContact1Name}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Phone:</span>
                              <p className="font-medium">{data.emergencyContact1Phone}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Relationship:</span>
                              <p className="font-medium">{data.emergencyContact1Relation || 'N/A'}</p>
                            </div>
                          </div>
                          {data.emergencyContact2Name && (
                            <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t">
                              <div>
                                <span className="text-gray-600">Contact 2 Name:</span>
                                <p className="font-medium">{data.emergencyContact2Name}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Phone:</span>
                                <p className="font-medium">{data.emergencyContact2Phone || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Relationship:</span>
                                <p className="font-medium">{data.emergencyContact2Relation || 'N/A'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Housing Preferences */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Housing Preferences</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Housing Type:</span>
                            <p className="font-medium capitalize">
                              {data.housingType?.replace(/_/g, ' ') || 'N/A'}
                            </p>
                          </div>
                          {data.roomType && (
                            <div>
                              <span className="text-gray-600">Room Type:</span>
                              <p className="font-medium capitalize">{data.roomType}</p>
                            </div>
                          )}
                          {data.preferredRoommate && (
                            <div>
                              <span className="text-gray-600">Preferred Roommate:</span>
                              <p className="font-medium">{data.preferredRoommate}</p>
                            </div>
                          )}
                          {data.tShirtSize && (
                            <div>
                              <span className="text-gray-600">T-Shirt Size:</span>
                              <p className="font-medium">{data.tShirtSize}</p>
                            </div>
                          )}
                          {data.dietaryRestrictions && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Dietary Restrictions:</span>
                              <p className="font-medium">{data.dietaryRestrictions}</p>
                            </div>
                          )}
                          {data.adaAccommodations && (
                            <div className="col-span-2">
                              <span className="text-gray-600">ADA Accommodations:</span>
                              <p className="font-medium">{data.adaAccommodations}</p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Pricing Summary */}
                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Pricing Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount:</span>
                            <span className="font-semibold">
                              ${data.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="font-semibold text-green-600">
                              ${data.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-blue-300">
                            <span className="font-semibold">Balance Due:</span>
                            <span className="font-bold text-[#1E3A5F]">
                              ${data.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* Tab 2: Liability Forms */}
                <TabsContent value="liability" className="space-y-4 mt-0">
                  {isGroupRegistration(data) ? (
                    <>
                      {/* Progress Summary */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">
                          Liability Forms Status
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Forms Submitted:</span>
                            <span className="font-semibold">
                              {data.liabilityFormsCompleted} / {data.liabilityFormsTotal} (
                              {data.liabilityFormsPercentage}%)
                            </span>
                          </div>
                          <Progress value={data.liabilityFormsPercentage} className="h-3" />
                        </div>
                      </Card>

                      {/* Participants List with Form Status */}
                      <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">
                          Participant Forms
                        </h3>
                        {data.participants.length > 0 ? (
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {data.participants.map((participant) => (
                              <div
                                key={participant.id}
                                className={`p-3 rounded-lg border ${
                                  participant.liabilityFormCompleted
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-orange-50 border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {participant.firstName} {participant.lastName}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {participant.age} years old •{' '}
                                      {getParticipantTypeLabel(participant.participantType)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {participant.liabilityFormCompleted ? (
                                      <Badge className="bg-green-500 text-white">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Submitted
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-orange-500 text-white">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">
                            No participants registered yet
                          </p>
                        )}
                      </Card>
                    </>
                  ) : (
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">
                        Liability Form Status
                      </h3>
                      {data.liabilityForms && data.liabilityForms.length > 0 ? (
                        <div className="space-y-3">
                          {data.liabilityForms.map((form) => (
                            <div
                              key={form.id}
                              className={`p-4 rounded-lg border ${
                                form.completed
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-orange-50 border-orange-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">Liability Form</p>
                                  {form.completedAt && (
                                    <p className="text-sm text-gray-600">
                                      Submitted: {format(new Date(form.completedAt), 'MMMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                                {form.completed ? (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Submitted
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-500 text-white">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          No liability forms found for this registration
                        </p>
                      )}
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 3: Payment History */}
                <TabsContent value="payments" className="space-y-4 mt-0">
                  {/* Balance Summary */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Balance Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                        <div className="text-2xl font-bold text-[#1E3A5F]">
                          ${data.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Amount Paid</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${data.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Balance Due</div>
                        <div className="text-2xl font-bold text-orange-600">
                          ${data.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Status</div>
                        <div className="mt-1">
                          {getPaymentStatusBadge(data.paymentBalance?.paymentStatus || 'unpaid')}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Payment History */}
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Payment History</h3>
                    {data.payments && data.payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-semibold">Date</th>
                              <th className="text-left p-3 font-semibold">Amount</th>
                              <th className="text-left p-3 font-semibold">Method</th>
                              <th className="text-left p-3 font-semibold">Status</th>
                              <th className="text-left p-3 font-semibold">Processed By</th>
                              <th className="text-left p-3 font-semibold">Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.payments.map((payment) => (
                              <tr key={payment.id} className="border-t">
                                <td className="p-3">
                                  {format(
                                    new Date(payment.processedAt || payment.createdAt),
                                    'MMM d, yyyy'
                                  )}
                                </td>
                                <td className="p-3 font-medium">${payment.amount.toFixed(2)}</td>
                                <td className="p-3">
                                  {payment.paymentMethod === 'card' && payment.cardLast4
                                    ? `Card ****${payment.cardLast4}`
                                    : payment.paymentMethod === 'check' && payment.checkNumber
                                    ? `Check #${payment.checkNumber}`
                                    : payment.paymentMethod.replace(/_/g, ' ')}
                                </td>
                                <td className="p-3">
                                  <Badge
                                    variant={
                                      payment.paymentStatus === 'succeeded'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {payment.paymentStatus}
                                  </Badge>
                                </td>
                                <td className="p-3 text-gray-600">
                                  {payment.processedBy
                                    ? `${payment.processedBy.firstName} ${payment.processedBy.lastName}`
                                    : 'System'}
                                </td>
                                <td className="p-3">
                                  {payment.receiptUrl && (
                                    <a
                                      href={payment.receiptUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      <Download className="h-3 w-3" />
                                      View
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                    )}
                  </Card>

                  {/* Refund History */}
                  {data.refunds && data.refunds.length > 0 && (
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">Refund History</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-semibold">Date</th>
                              <th className="text-left p-3 font-semibold">Amount</th>
                              <th className="text-left p-3 font-semibold">Reason</th>
                              <th className="text-left p-3 font-semibold">Method</th>
                              <th className="text-left p-3 font-semibold">Processed By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.refunds.map((refund) => (
                              <tr key={refund.id} className="border-t">
                                <td className="p-3">
                                  {format(new Date(refund.processedAt), 'MMM d, yyyy')}
                                </td>
                                <td className="p-3 font-medium text-red-600">
                                  -${refund.refundAmount.toFixed(2)}
                                </td>
                                <td className="p-3 capitalize">
                                  {refund.refundReason.replace(/_/g, ' ')}
                                </td>
                                <td className="p-3 capitalize">{refund.refundMethod}</td>
                                <td className="p-3 text-gray-600">
                                  {refund.processedBy
                                    ? `${refund.processedBy.firstName} ${refund.processedBy.lastName}`
                                    : 'System'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 4: Email History */}
                <TabsContent value="emails" className="space-y-4 mt-0">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#1E3A5F]">Email History</h3>
                      {onOpenEmail && (
                        <Button size="sm" onClick={onOpenEmail}>
                          <Send className="h-4 w-4 mr-2" />
                          Send New Email
                        </Button>
                      )}
                    </div>
                    {data.emailLogs && data.emailLogs.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-semibold">Date Sent</th>
                              <th className="text-left p-3 font-semibold">Subject</th>
                              <th className="text-left p-3 font-semibold">Recipient</th>
                              <th className="text-left p-3 font-semibold">Type</th>
                              <th className="text-left p-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.emailLogs.map((email) => (
                              <tr key={email.id} className="border-t">
                                <td className="p-3">
                                  {format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')}
                                </td>
                                <td className="p-3 max-w-xs truncate">{email.subject}</td>
                                <td className="p-3">{email.recipientEmail}</td>
                                <td className="p-3 capitalize">
                                  {email.emailType.replace(/_/g, ' ')}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {getEmailStatusIcon(email.sentStatus)}
                                    <span className="capitalize">{email.sentStatus}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No emails sent yet</p>
                    )}
                  </Card>
                </TabsContent>

                {/* Tab 5: Edit History */}
                <TabsContent value="history" className="space-y-4 mt-0">
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-[#1E3A5F]">
                      Edit History / Audit Log
                    </h3>
                    {data.registrationEdits && data.registrationEdits.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {data.registrationEdits.map((edit) => (
                          <div key={edit.id} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <Badge variant="outline" className="mb-2">
                                  {edit.editType.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                                <div className="text-sm text-gray-600">
                                  {format(new Date(edit.editedAt), 'MMM d, yyyy h:mm a')}
                                </div>
                                <div className="text-xs text-gray-500">
                                  By {edit.editedBy.firstName} {edit.editedBy.lastName} (
                                  {edit.editedBy.email})
                                </div>
                              </div>
                              {edit.difference !== null &&
                                edit.difference !== undefined &&
                                edit.difference !== 0 && (
                                  <div
                                    className={`font-bold text-lg ${
                                      edit.difference > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}
                                  >
                                    {edit.difference > 0 ? '+' : ''}${edit.difference.toFixed(2)}
                                  </div>
                                )}
                            </div>

                            {/* Changes Made */}
                            {edit.changesMade && Object.keys(edit.changesMade).length > 0 && (
                              <div className="mt-3 p-3 bg-white rounded text-sm">
                                <div className="font-medium mb-2">Changes:</div>
                                <div className="space-y-1">
                                  {Object.entries(edit.changesMade).map(([field, change]) => {
                                    const isOldNewFormat =
                                      change &&
                                      typeof change === 'object' &&
                                      'old' in change &&
                                      'new' in change

                                    if (isOldNewFormat) {
                                      const changeObj = change as { old: unknown; new: unknown }
                                      return (
                                        <div key={field} className="text-xs">
                                          <span className="font-medium">
                                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                                          </span>{' '}
                                          <span className="text-gray-600">
                                            {String(changeObj.old || 'N/A')}
                                          </span>
                                          {' → '}
                                          <span className="text-gray-900">
                                            {String(changeObj.new)}
                                          </span>
                                        </div>
                                      )
                                    } else {
                                      return (
                                        <div key={field} className="text-xs">
                                          <span className="font-medium">
                                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                                          </span>{' '}
                                          <span className="text-gray-900">{String(change)}</span>
                                        </div>
                                      )
                                    }
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Price Change */}
                            {edit.oldTotal !== null &&
                              edit.newTotal !== null &&
                              edit.oldTotal !== undefined &&
                              edit.newTotal !== undefined && (
                                <div className="mt-2 text-sm text-gray-600">
                                  Price: ${edit.oldTotal.toFixed(2)} → ${edit.newTotal.toFixed(2)}
                                </div>
                              )}

                            {/* Admin Notes */}
                            {edit.adminNotes && (
                              <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                                <div className="font-medium text-blue-900 mb-1">Admin Notes:</div>
                                <div className="text-blue-800">{edit.adminNotes}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No edit history found</p>
                    )}
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
