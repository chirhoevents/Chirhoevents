'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, User, DollarSign, FileText, AlertCircle } from 'lucide-react'
import {
  calculateRegistrationPrice,
  type EventPricing,
} from '@/lib/registration-price-calculator'
import RefundModal from './RefundModal'
import MarkCheckReceivedModal from './MarkCheckReceivedModal'
import RecordCheckPaymentModal from './RecordCheckPaymentModal'
import RecordAdditionalPaymentModal from './RecordAdditionalPaymentModal'
import EditParticipantModal from './EditParticipantModal'

interface Participant {
  id?: string
  firstName: string
  lastName: string
  preferredName?: string
  email?: string
  age: number
  gender: 'male' | 'female' | 'other'
  participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'
  tShirtSize?: string
  liabilityFormCompleted?: boolean
  liabilityForm?: {
    participantPhone?: string
    medicalConditions?: string
    medications?: string
    allergies?: string
    dietaryRestrictions?: string
    adaAccommodations?: string
    emergencyContact1Name?: string
    emergencyContact1Phone?: string
    emergencyContact1Relation?: string
    emergencyContact2Name?: string
    emergencyContact2Phone?: string
    emergencyContact2Relation?: string
    insuranceProvider?: string
    insurancePolicyNumber?: string
    insuranceGroupNumber?: string
    parentEmail?: string
  }
}

interface PaymentBalance {
  totalAmountDue: number
  amountPaid: number
  amountRemaining: number
  paymentStatus: string
}

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: 'card' | 'check' | 'cash' | 'bank_transfer'
  paymentStatus: string
  checkNumber?: string | null
  checkReceivedDate?: string | null
  notes?: string | null
  createdAt: string
  processedAt?: string | null
}

interface EventSettings {
  checkPaymentEnabled: boolean
  checkPaymentPayableTo: string | null
  checkPaymentAddress: string | null
}

interface GroupRegistration {
  id: string
  groupName: string
  parishName: string
  dioceseName?: string
  groupLeaderName: string
  groupLeaderEmail: string
  groupLeaderPhone: string
  groupLeaderStreet?: string
  groupLeaderCity?: string
  groupLeaderState?: string
  groupLeaderZip?: string
  totalParticipants: number
  youthCount?: number
  chaperoneCount?: number
  priestCount?: number
  housingType: 'on_campus' | 'off_campus' | 'day_pass'
  // Housing-specific participant counts (inventory style)
  onCampusYouth?: number
  onCampusChaperones?: number
  offCampusYouth?: number
  offCampusChaperones?: number
  dayPassYouth?: number
  dayPassChaperones?: number
  specialRequests?: string
  registeredAt: string
  participants: Participant[]
  paymentBalance?: PaymentBalance
  payments?: Payment[]
  event?: {
    id: string
    name: string
    settings?: EventSettings
  }
}

interface EditGroupRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  registration: GroupRegistration | null
  eventId: string
  eventPricing: EventPricing | null
  onUpdate?: () => void
}

export default function EditGroupRegistrationModal({
  isOpen,
  onClose,
  registration,
  eventId,
  eventPricing,
  onUpdate,
}: EditGroupRegistrationModalProps) {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isSaving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    groupName: '',
    parishName: '',
    dioceseName: '',
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    groupLeaderStreet: '',
    groupLeaderCity: '',
    groupLeaderState: '',
    groupLeaderZip: '',
    housingType: 'on_campus' as 'on_campus' | 'off_campus' | 'day_pass',
    specialRequests: '',
    adminNotes: '',
  })
  const [originalTotal, setOriginalTotal] = useState(0)
  const [newTotal, setNewTotal] = useState(0)
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{
    participantType: string
    count: number
    pricePerPerson: number
    subtotal: number
  }>>([])
  // Inventory-style housing counts
  const [inventoryCounts, setInventoryCounts] = useState({
    onCampusYouth: 0,
    onCampusChaperones: 0,
    offCampusYouth: 0,
    offCampusChaperones: 0,
    dayPassYouth: 0,
    dayPassChaperones: 0,
    priests: 0,
  })
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showCheckModal, setShowCheckModal] = useState(false)
  const [showRecordCheckModal, setShowRecordCheckModal] = useState(false)
  const [showRecordAdditionalPaymentModal, setShowRecordAdditionalPaymentModal] = useState(false)
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [auditTrail, setAuditTrail] = useState<Array<{
    id: string
    editedAt: string
    editType: string
    changesMade: Record<string, unknown> | null
    oldTotal: number | null
    newTotal: number | null
    difference: number | null
    adminNotes: string | null
    editedBy: {
      firstName: string
      lastName: string
      email: string
    }
  }>>([])
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false)

  // Fetch full registration data including participants
  const [fullRegistration, setFullRegistration] = useState<GroupRegistration | null>(null)
  const [loadingRegistration, setLoadingRegistration] = useState(false)

  // Fetched event pricing (used when eventPricing prop is null)
  const [fetchedEventPricing, setFetchedEventPricing] = useState<EventPricing | null>(null)

  useEffect(() => {
    if (registration && isOpen) {
      setLoadingRegistration(true)
      getToken().then(token => {
        fetch(`/api/admin/registrations/group/${registration.id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
          .then(res => res.json())
          .then(data => {
            setFullRegistration(data.registration)
            setLoadingRegistration(false)
          })
          .catch(err => {
            console.error('Error fetching registration:', err)
            setLoadingRegistration(false)
          })
      })
    }
  }, [registration, isOpen])

  // Fetch event pricing if not provided as prop
  useEffect(() => {
    if (isOpen && eventId && !eventPricing) {
      getToken().then(token => {
        fetch(`/api/admin/events/${eventId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })
          .then(res => res.json())
          .then(data => {
            if (data.event?.pricing) {
              // Parse date strings into Date objects (API returns strings, not Date objects)
              const pricing = data.event.pricing
              const parsedPricing: EventPricing = {
                ...pricing,
                earlyBirdDeadline: pricing.earlyBirdDeadline ? new Date(pricing.earlyBirdDeadline) : null,
                regularDeadline: pricing.regularDeadline ? new Date(pricing.regularDeadline) : null,
                fullPaymentDeadline: pricing.fullPaymentDeadline ? new Date(pricing.fullPaymentDeadline) : null,
              }
              setFetchedEventPricing(parsedPricing)
            }
          })
          .catch(err => {
            console.error('Error fetching event pricing:', err)
          })
      })
    } else if (eventPricing) {
      // If eventPricing prop is provided, use it
      setFetchedEventPricing(eventPricing)
    }
  }, [isOpen, eventId, eventPricing, getToken])

  // Initialize form data when registration changes
  useEffect(() => {
    const regData = fullRegistration || registration
    if (regData) {
      setFormData({
        groupName: regData.groupName,
        parishName: regData.parishName,
        dioceseName: regData.dioceseName || '',
        groupLeaderName: regData.groupLeaderName,
        groupLeaderEmail: regData.groupLeaderEmail,
        groupLeaderPhone: regData.groupLeaderPhone,
        groupLeaderStreet: regData.groupLeaderStreet || '',
        groupLeaderCity: regData.groupLeaderCity || '',
        groupLeaderState: regData.groupLeaderState || '',
        groupLeaderZip: regData.groupLeaderZip || '',
        housingType: regData.housingType,
        specialRequests: regData.specialRequests || '',
        adminNotes: '',
      })

      // Initialize inventory counts from registration data
      const priestCount = (regData as any).priestCount || 0
      const youthCount = (regData as any).youthCount || 0
      const chaperoneCount = (regData as any).chaperoneCount || 0

      // Check if we have new inventory-style data
      const hasInventoryData = (regData as any).onCampusYouth !== undefined ||
                               (regData as any).offCampusYouth !== undefined ||
                               (regData as any).dayPassYouth !== undefined

      if (hasInventoryData) {
        // Use new inventory-style fields
        setInventoryCounts({
          onCampusYouth: (regData as any).onCampusYouth || 0,
          onCampusChaperones: (regData as any).onCampusChaperones || 0,
          offCampusYouth: (regData as any).offCampusYouth || 0,
          offCampusChaperones: (regData as any).offCampusChaperones || 0,
          dayPassYouth: (regData as any).dayPassYouth || 0,
          dayPassChaperones: (regData as any).dayPassChaperones || 0,
          priests: priestCount,
        })
      } else {
        // Migrate from old format: put all youth/chaperones in their housing type
        const housingType = regData.housingType
        setInventoryCounts({
          onCampusYouth: housingType === 'on_campus' ? youthCount : 0,
          onCampusChaperones: housingType === 'on_campus' ? chaperoneCount : 0,
          offCampusYouth: housingType === 'off_campus' ? youthCount : 0,
          offCampusChaperones: housingType === 'off_campus' ? chaperoneCount : 0,
          dayPassYouth: housingType === 'day_pass' ? youthCount : 0,
          dayPassChaperones: housingType === 'day_pass' ? chaperoneCount : 0,
          priests: priestCount,
        })
      }

      const total = regData.paymentBalance?.totalAmountDue || 0
      setOriginalTotal(total)
      setNewTotal(total)
    }
  }, [fullRegistration, registration])

  // Calculate totals from inventory counts
  const totalYouth = inventoryCounts.onCampusYouth + inventoryCounts.offCampusYouth + inventoryCounts.dayPassYouth
  const totalChaperones = inventoryCounts.onCampusChaperones + inventoryCounts.offCampusChaperones + inventoryCounts.dayPassChaperones
  const totalParticipantsCalc = totalYouth + totalChaperones + inventoryCounts.priests

  // Recalculate price when inventory counts change
  useEffect(() => {
    if (eventPricing && totalParticipantsCalc > 0) {
  // Recalculate price when housing type or participant counts change
  // Use fetchedEventPricing which is either the prop or fetched from API
  useEffect(() => {
    const totalCount = participantCounts.youth_u18 + participantCounts.youth_o18 + participantCounts.chaperone + participantCounts.priest

    if (fetchedEventPricing && totalCount > 0) {
      // Create temporary participant objects for price calculation
      const tempParticipants: Participant[] = []

      // Add on-campus youth
      for (let i = 0; i < inventoryCounts.onCampusYouth; i++) {
        tempParticipants.push({
          firstName: 'Youth',
          lastName: `OnCampus-${i + 1}`,
          age: 17,
          gender: 'male',
          participantType: 'youth_u18',
        })
      }

      // Add on-campus chaperones
      for (let i = 0; i < inventoryCounts.onCampusChaperones; i++) {
        tempParticipants.push({
          firstName: 'Chaperone',
          lastName: `OnCampus-${i + 1}`,
          age: 30,
          gender: 'male',
          participantType: 'chaperone',
        })
      }

      // Add off-campus youth
      for (let i = 0; i < inventoryCounts.offCampusYouth; i++) {
        tempParticipants.push({
          firstName: 'Youth',
          lastName: `OffCampus-${i + 1}`,
          age: 17,
          gender: 'male',
          participantType: 'youth_u18',
        })
      }

      // Add off-campus chaperones
      for (let i = 0; i < inventoryCounts.offCampusChaperones; i++) {
        tempParticipants.push({
          firstName: 'Chaperone',
          lastName: `OffCampus-${i + 1}`,
          age: 30,
          gender: 'male',
          participantType: 'chaperone',
        })
      }

      // Add day pass youth
      for (let i = 0; i < inventoryCounts.dayPassYouth; i++) {
        tempParticipants.push({
          firstName: 'Youth',
          lastName: `DayPass-${i + 1}`,
          age: 17,
          gender: 'male',
          participantType: 'youth_u18',
        })
      }

      // Add day pass chaperones
      for (let i = 0; i < inventoryCounts.dayPassChaperones; i++) {
        tempParticipants.push({
          firstName: 'Chaperone',
          lastName: `DayPass-${i + 1}`,
          age: 30,
          gender: 'male',
          participantType: 'chaperone',
        })
      }

      // Add priests
      for (let i = 0; i < inventoryCounts.priests; i++) {
        tempParticipants.push({
          firstName: 'Priest',
          lastName: `${i + 1}`,
          age: 40,
          gender: 'male',
          participantType: 'priest',
        })
      }

      // For now, use on_campus as default for calculation (pricing should be same regardless)
      const calculation = calculateRegistrationPrice({
        participants: tempParticipants,
        housingType: 'on_campus',
        pricing: eventPricing,
        housingType: formData.housingType,
        pricing: fetchedEventPricing,
        registrationDate: registration ? new Date(registration.registeredAt) : new Date(),
      })
      setNewTotal(calculation.total)
      setPriceBreakdown(calculation.breakdown)
    } else if (totalParticipantsCalc === 0) {
      setNewTotal(0)
      setPriceBreakdown([])
    }
  }, [inventoryCounts, eventPricing, registration, totalParticipantsCalc])
  }, [formData.housingType, participantCounts, fetchedEventPricing, registration])

  const handleSave = async () => {
    if (!registration) return

    setSaving(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/registrations/group/${registration.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...formData,
            totalParticipants: totalParticipantsCalc,
            youthCount: totalYouth,
            chaperoneCount: totalChaperones,
            priestCount: inventoryCounts.priests,
            // Inventory-style housing counts
            onCampusYouth: inventoryCounts.onCampusYouth,
            onCampusChaperones: inventoryCounts.onCampusChaperones,
            offCampusYouth: inventoryCounts.offCampusYouth,
            offCampusChaperones: inventoryCounts.offCampusChaperones,
            dayPassYouth: inventoryCounts.dayPassYouth,
            dayPassChaperones: inventoryCounts.dayPassChaperones,
            eventId,
            oldTotal: originalTotal,
            newTotal,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update registration')
      }

      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Error updating registration:', error)
      alert('Failed to update registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fetchAuditTrail = async () => {
    if (!registration) return

    setLoadingAuditTrail(true)
    try {
      const token = await getToken()
      const response = await fetch(
        `/api/admin/registrations/${registration.id}/audit?type=group`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      )
      if (response.ok) {
        const data = await response.json()
        setAuditTrail(data.edits || [])
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
    } finally {
      setLoadingAuditTrail(false)
    }
  }

  // Fetch audit trail when Updates tab is activated
  useEffect(() => {
    if (activeTab === 'updates' && registration && auditTrail.length === 0) {
      fetchAuditTrail()
    }
  }, [activeTab, registration])

  const difference = newTotal - originalTotal

  if (!registration) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E3A5F]">
            Edit Group Registration
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Registration ID: {registration.id}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Full Details
            </TabsTrigger>
            <TabsTrigger value="participants">
              <User className="h-4 w-4 mr-2" />
              Participants ({totalParticipantsCalc})
            </TabsTrigger>
            <TabsTrigger value="payment">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="updates">
              <FileText className="h-4 w-4 mr-2" />
              Updates
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={formData.groupName}
                  onChange={(e) => handleInputChange('groupName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="parishName">Parish Name</Label>
                <Input
                  id="parishName"
                  value={formData.parishName}
                  onChange={(e) => handleInputChange('parishName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dioceseName">Diocese Name</Label>
                <Input
                  id="dioceseName"
                  value={formData.dioceseName}
                  onChange={(e) => handleInputChange('dioceseName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderName">Group Leader Name</Label>
                <Input
                  id="groupLeaderName"
                  value={formData.groupLeaderName}
                  onChange={(e) =>
                    handleInputChange('groupLeaderName', e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderEmail">Group Leader Email</Label>
                <Input
                  id="groupLeaderEmail"
                  type="email"
                  value={formData.groupLeaderEmail}
                  onChange={(e) =>
                    handleInputChange('groupLeaderEmail', e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderPhone">Group Leader Phone</Label>
                <Input
                  id="groupLeaderPhone"
                  value={formData.groupLeaderPhone}
                  onChange={(e) =>
                    handleInputChange('groupLeaderPhone', e.target.value)
                  }
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="groupLeaderStreet">Group Leader Street Address</Label>
                <Input
                  id="groupLeaderStreet"
                  value={formData.groupLeaderStreet}
                  onChange={(e) => handleInputChange('groupLeaderStreet', e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderCity">City</Label>
                <Input
                  id="groupLeaderCity"
                  value={formData.groupLeaderCity}
                  onChange={(e) => handleInputChange('groupLeaderCity', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderState">State</Label>
                <Input
                  id="groupLeaderState"
                  value={formData.groupLeaderState}
                  onChange={(e) => handleInputChange('groupLeaderState', e.target.value)}
                  placeholder="e.g., CA"
                />
              </div>

              <div>
                <Label htmlFor="groupLeaderZip">ZIP Code</Label>
                <Input
                  id="groupLeaderZip"
                  value={formData.groupLeaderZip}
                  onChange={(e) => handleInputChange('groupLeaderZip', e.target.value)}
                />
              </div>

            </div>

            {/* Participant Inventory by Housing Type */}
            <Card className="p-4 border-[#1E3A5F]/20">
              <h4 className="font-semibold text-[#1E3A5F] mb-4">
                Participant Inventory
              </h4>

              {/* On-Campus Housing */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-[#1E3A5F] mb-3">On-Campus Housing</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Youth</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, onCampusYouth: Math.max(0, prev.onCampusYouth - 1)}))}
                        disabled={inventoryCounts.onCampusYouth === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.onCampusYouth}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, onCampusYouth: prev.onCampusYouth + 1}))}
                      >+</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Chaperones</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, onCampusChaperones: Math.max(0, prev.onCampusChaperones - 1)}))}
                        disabled={inventoryCounts.onCampusChaperones === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.onCampusChaperones}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, onCampusChaperones: prev.onCampusChaperones + 1}))}
                      >+</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-right">
                  Subtotal: {inventoryCounts.onCampusYouth + inventoryCounts.onCampusChaperones}
                </div>
              </div>

              {/* Off-Campus Housing */}
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <h5 className="font-medium text-green-800 mb-3">Off-Campus Housing</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Youth</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, offCampusYouth: Math.max(0, prev.offCampusYouth - 1)}))}
                        disabled={inventoryCounts.offCampusYouth === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.offCampusYouth}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, offCampusYouth: prev.offCampusYouth + 1}))}
                      >+</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Chaperones</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, offCampusChaperones: Math.max(0, prev.offCampusChaperones - 1)}))}
                        disabled={inventoryCounts.offCampusChaperones === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.offCampusChaperones}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, offCampusChaperones: prev.offCampusChaperones + 1}))}
                      >+</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-right">
                  Subtotal: {inventoryCounts.offCampusYouth + inventoryCounts.offCampusChaperones}
                </div>
              </div>

              {/* Day Pass / General Admission */}
              <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                <h5 className="font-medium text-amber-800 mb-3">Day Pass / General Admission</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Youth</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, dayPassYouth: Math.max(0, prev.dayPassYouth - 1)}))}
                        disabled={inventoryCounts.dayPassYouth === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.dayPassYouth}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, dayPassYouth: prev.dayPassYouth + 1}))}
                      >+</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Chaperones</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, dayPassChaperones: Math.max(0, prev.dayPassChaperones - 1)}))}
                        disabled={inventoryCounts.dayPassChaperones === 0}
                      >-</Button>
                      <span className="w-10 text-center font-semibold">{inventoryCounts.dayPassChaperones}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInventoryCounts(prev => ({...prev, dayPassChaperones: prev.dayPassChaperones + 1}))}
                      >+</Button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-right">
                  Subtotal: {inventoryCounts.dayPassYouth + inventoryCounts.dayPassChaperones}
                </div>
              </div>

              {/* Priests (always separate) */}
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-purple-800">Priests</h5>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setInventoryCounts(prev => ({...prev, priests: Math.max(0, prev.priests - 1)}))}
                      disabled={inventoryCounts.priests === 0}
                    >-</Button>
                    <span className="w-10 text-center font-semibold">{inventoryCounts.priests}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setInventoryCounts(prev => ({...prev, priests: prev.priests + 1}))}
                    >+</Button>
                  </div>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-[#1E3A5F]">{totalYouth}</div>
                    <div className="text-xs text-gray-500">Youth</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[#1E3A5F]">{totalChaperones}</div>
                    <div className="text-xs text-gray-500">Chaperones</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[#1E3A5F]">{inventoryCounts.priests}</div>
                    <div className="text-xs text-gray-500">Priests</div>
                  </div>
                  <div className="text-center bg-[#1E3A5F] text-white rounded p-1">
                    <div className="font-bold">{totalParticipantsCalc}</div>
                    <div className="text-xs">Total</div>
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                placeholder="Any special requests or notes from the group..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes}
                onChange={(e) => handleInputChange('adminNotes', e.target.value)}
                placeholder="Add notes about this edit..."
                rows={3}
              />
            </div>

            {/* Live Price Breakdown */}
            {priceBreakdown.length > 0 && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-sm text-[#1E3A5F] mb-3">
                  Live Price Calculation
                </h4>
                <div className="space-y-2">
                  {priceBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.count}x {item.participantType.replace('_', ' ')} @ $
                        {item.pricePerPerson.toFixed(2)}
                      </span>
                      <span className="font-medium">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>New Total:</span>
                    <span className="text-[#1E3A5F]">${newTotal.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Price Change Summary */}
            {difference !== 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Price Change Detected
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Original: ${originalTotal.toFixed(2)} → New: $
                      {newTotal.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`font-bold text-lg ${
                      difference > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {difference > 0 ? '+' : ''}${difference.toFixed(2)}
                  </div>
                </div>
                {difference > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Group will be notified of additional charges
                  </div>
                )}
                {difference < 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Credit will be applied to balance or refunded if requested
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Full Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {loadingRegistration ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
                <span className="ml-2 text-gray-600">Loading details...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const regData = fullRegistration || registration
                  return (
                    <>
                      {/* Group Information */}
                      <Card className="p-4">
                        <h3 className="font-semibold text-[#1E3A5F] mb-3">Group Information</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Group Name:</span>
                            <div>{regData.groupName}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Parish:</span>
                            <div>{regData.parishName || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Diocese:</span>
                            <div>{(regData as any).dioceseName || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Access Code:</span>
                            <div className="font-mono font-semibold text-[#1E3A5F]">{(regData as any).accessCode || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Registration Status:</span>
                            <div><Badge>{(regData as any).registrationStatus || 'pending'}</Badge></div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Registered:</span>
                            <div>{new Date(regData.registeredAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </Card>

                      {/* Group Leader */}
                      <Card className="p-4">
                        <h3 className="font-semibold text-[#1E3A5F] mb-3">Group Leader</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Name:</span>
                            <div>{regData.groupLeaderName}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Email:</span>
                            <div>{regData.groupLeaderEmail}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Phone:</span>
                            <div>{regData.groupLeaderPhone}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-gray-600">Address:</span>
                            <div>
                              {(regData as any).groupLeaderStreet ? (
                                <>
                                  {(regData as any).groupLeaderStreet}<br />
                                  {(regData as any).groupLeaderCity}, {(regData as any).groupLeaderState} {(regData as any).groupLeaderZip}
                                </>
                              ) : 'No address provided'}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Alternative Contacts */}
                      <Card className="p-4">
                        <h3 className="font-semibold text-[#1E3A5F] mb-3">Alternative Contacts</h3>
                        <div className="space-y-4">
                          {/* Contact 1 */}
                          <div>
                            <div className="font-medium text-sm text-gray-700 mb-2">Contact 1</div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Name:</span>
                                <div>{(regData as any).alternativeContact1Name || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Email:</span>
                                <div>{(regData as any).alternativeContact1Email || 'N/A'}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Phone:</span>
                                <div>{(regData as any).alternativeContact1Phone || 'N/A'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Contact 2 */}
                          {((regData as any).alternativeContact2Name || (regData as any).alternativeContact2Email || (regData as any).alternativeContact2Phone) && (
                            <div className="pt-3 border-t">
                              <div className="font-medium text-sm text-gray-700 mb-2">Contact 2</div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="font-medium text-gray-600">Name:</span>
                                  <div>{(regData as any).alternativeContact2Name || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Email:</span>
                                  <div>{(regData as any).alternativeContact2Email || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-600">Phone:</span>
                                  <div>{(regData as any).alternativeContact2Phone || 'N/A'}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Additional Information */}
                      <Card className="p-4">
                        <h3 className="font-semibold text-[#1E3A5F] mb-3">Additional Information</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Special Requests:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                              {(regData as any).specialRequests || 'None'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Dietary Restrictions Summary:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                              {(regData as any).dietaryRestrictionsSummary || 'None'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">ADA Accommodations Summary:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                              {(regData as any).adaAccommodationsSummary || 'None'}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Group Leader Dashboard Link */}
                      {(regData as any).accessCode && (
                        <Card className="p-4 bg-blue-50 border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-[#1E3A5F] mb-1">Group Leader Access</h4>
                              <p className="text-sm text-gray-600">
                                Access Code: <span className="font-mono font-bold text-[#1E3A5F]">{(regData as any).accessCode}</span>
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open('/dashboard/group-leader', '_blank')
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Dashboard
                            </Button>
                          </div>
                        </Card>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-[#1E3A5F]">
                Total Participants: {totalParticipantsCalc}
              </h3>
              <div className="text-sm text-gray-600">
                Original: {registration.totalParticipants}
              </div>
            </div>

            {/* Warning if count reduced */}
            {totalParticipantsCalc < registration.totalParticipants && (
              <Card className="p-4 bg-yellow-50 border-yellow-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900">Participant Count Reduced</div>
                    <div className="text-sm text-yellow-800 mt-1">
                      You are reducing the participant count from {registration.totalParticipants} to {totalParticipantsCalc}. A refund may be needed based on the updated balance.
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Summary by Housing Type */}
            <Card className="p-4">
              <h4 className="font-semibold text-[#1E3A5F] mb-3">Summary by Housing Type</h4>
              <div className="space-y-3">
                {(inventoryCounts.onCampusYouth > 0 || inventoryCounts.onCampusChaperones > 0) && (
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="font-medium text-[#1E3A5F]">On-Campus</span>
                    <span>{inventoryCounts.onCampusYouth} youth, {inventoryCounts.onCampusChaperones} chaperones</span>
                  </div>
                )}
                {(inventoryCounts.offCampusYouth > 0 || inventoryCounts.offCampusChaperones > 0) && (
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium text-green-800">Off-Campus</span>
                    <span>{inventoryCounts.offCampusYouth} youth, {inventoryCounts.offCampusChaperones} chaperones</span>
                  </div>
                )}
                {(inventoryCounts.dayPassYouth > 0 || inventoryCounts.dayPassChaperones > 0) && (
                  <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                    <span className="font-medium text-amber-800">Day Pass</span>
                    <span>{inventoryCounts.dayPassYouth} youth, {inventoryCounts.dayPassChaperones} chaperones</span>
                  </div>
                )}
                {inventoryCounts.priests > 0 && (
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span className="font-medium text-purple-800">Priests</span>
                    <span>{inventoryCounts.priests}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-[#1E3A5F]">{totalParticipantsCalc} participants</span>
              </div>
            </Card>

            {/* Note about editing */}
            <div className="text-xs text-gray-500 italic">
              Note: To edit participant counts by housing type, use the Participant Inventory section in the Overview tab.
            </div>

            {/* Individual Participants List */}
            {registration.participants && registration.participants.length > 0 && (
              <Card className="p-4 mt-6">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">
                  Individual Participant Records
                </h3>
                <div className="space-y-3">
                  {registration.participants.map((participant: Participant) => (
                    <div
                      key={participant.id}
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-[#1E3A5F]">
                            {participant.firstName} {participant.lastName}
                            {participant.preferredName && (
                              <span className="text-gray-600 ml-2">({participant.preferredName})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1 grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Age:</span> {participant.age}
                            </div>
                            <div>
                              <span className="font-medium">Gender:</span> {participant.gender}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>{' '}
                              {participant.participantType === 'youth_u18'
                                ? 'Youth Under 18'
                                : participant.participantType === 'youth_o18'
                                ? 'Youth Over 18'
                                : participant.participantType === 'chaperone'
                                ? 'Chaperone'
                                : 'Priest'}
                            </div>
                            {participant.tShirtSize && (
                              <div>
                                <span className="font-medium">T-Shirt:</span> {participant.tShirtSize}
                              </div>
                            )}
                          </div>
                          {participant.liabilityFormCompleted && (
                            <div className="mt-2">
                              <Badge variant="default" className="text-xs">
                                Liability Form Completed
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedParticipant(participant)
                            setShowEditParticipantModal(true)
                          }}
                          className="ml-4"
                        >
                          <User className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-4">
                Payment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount Due:</span>
                  <span className="font-medium">
                    ${registration.paymentBalance?.totalAmountDue?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">
                    ${registration.paymentBalance?.amountPaid?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Balance Remaining:</span>
                  <span className="font-bold text-[#1E3A5F]">
                    ${registration.paymentBalance?.amountRemaining?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Badge
                  variant={
                    registration.paymentBalance?.paymentStatus === 'paid_full'
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {registration.paymentBalance?.paymentStatus || 'pending'}
                </Badge>
              </div>

              {/* Record Additional Payment Button - Universal payment recording */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => setShowRecordAdditionalPaymentModal(true)}
                  className="w-full bg-[#10B981] hover:bg-[#059669]"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  + Record Additional Payment
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Record any payment: check, card, cash, wire transfer, etc.
                </p>
              </div>

              {/* Record Check Payment Button - Legacy specific check button */}
              {registration.event?.settings?.checkPaymentEnabled &&
               registration.paymentBalance?.amountRemaining &&
               registration.paymentBalance.amountRemaining > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={() => setShowRecordCheckModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Check Payment (Legacy)
                  </Button>
                </div>
              )}
            </Card>

            {/* Check Payment Instructions */}
            {registration.event?.settings?.checkPaymentEnabled && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-[#1E3A5F] mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Check Payment Information
                </h3>
                <div className="space-y-2 text-sm">
                  {(fullRegistration || registration).event?.settings?.checkPaymentPayableTo && (
                    <div>
                      <span className="font-medium">Make checks payable to:</span>
                      <p className="text-gray-700 mt-1">
                        {(fullRegistration || registration).event?.settings?.checkPaymentPayableTo}
                      </p>
                    </div>
                  )}
                  {(fullRegistration || registration).event?.settings?.checkPaymentAddress && (
                    <div className="mt-2">
                      <span className="font-medium">Mail to:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-line">
                        {(fullRegistration || registration).event?.settings?.checkPaymentAddress}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Payment History */}
            {(fullRegistration || registration).payments && (fullRegistration || registration).payments!.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-[#1E3A5F] mb-4">
                  Payment History
                </h3>
                <div className="space-y-3">
                  {(fullRegistration || registration).payments!.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {payment.paymentMethod.toUpperCase()}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {new Date(payment.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg text-green-600">
                            ${payment.amount.toFixed(2)}
                          </div>
                          <Badge
                            variant={
                              payment.paymentStatus === 'succeeded'
                                ? 'default'
                                : payment.paymentStatus === 'pending'
                                ? 'outline'
                                : 'destructive'
                            }
                          >
                            {payment.paymentStatus}
                          </Badge>
                        </div>
                      </div>

                      {/* Check Payment Details */}
                      {payment.paymentMethod === 'check' && (
                        <div className="mt-2 pt-2 border-t space-y-2 text-sm">
                          {payment.checkNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Check Number:</span>
                              <span className="font-medium">{payment.checkNumber}</span>
                            </div>
                          )}
                          {payment.checkReceivedDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Received Date:</span>
                              <span className="font-medium">
                                {new Date(payment.checkReceivedDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {!payment.checkReceivedDate && payment.paymentStatus === 'pending' && (
                            <>
                              <div className="text-xs text-amber-600 italic">
                                Check payment pending - awaiting receipt
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => {
                                  setSelectedPayment(payment)
                                  setShowCheckModal(true)
                                }}
                              >
                                Mark as Received
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Payment Notes */}
                      {payment.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-gray-600">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{payment.notes}</p>
                        </div>
                      )}

                      {/* Payment Type */}
                      <div className="text-xs text-gray-500 mt-2">
                        Type: {payment.paymentType}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowRefundModal(true)}
              disabled={!registration.paymentBalance?.amountPaid || registration.paymentBalance.amountPaid === 0}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-4">
            {loadingAuditTrail ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#1E3A5F]" />
                <span className="ml-2 text-gray-600">Loading updates...</span>
              </div>
            ) : auditTrail.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No updates yet
              </div>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((edit) => (
                  <Card key={edit.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          {edit.editType.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          {new Date(edit.editedAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          By {edit.editedBy.firstName} {edit.editedBy.lastName} (
                          {edit.editedBy.email})
                        </div>
                      </div>
                      {edit.difference !== null && edit.difference !== undefined && edit.difference !== 0 && (
                        <div
                          className={`font-bold text-lg ${
                            edit.difference > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {edit.difference > 0 ? '+' : ''}$
                          {Number(edit.difference).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Changes Made */}
                    {edit.changesMade && Object.keys(edit.changesMade).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <div className="font-medium mb-2">Changes:</div>
                        <div className="space-y-1">
                          {Object.entries(edit.changesMade).map(
                            ([field, change]: [string, unknown]) => {
                              // Check if this is an old/new format or a direct value
                              const isOldNewFormat = change && typeof change === 'object' && 'old' in change && 'new' in change

                              if (isOldNewFormat) {
                                const changeObj = change as {old: unknown; new: unknown}
                                return (
                                  <div key={field} className="text-xs">
                                    <span className="font-medium">
                                      {field.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>{' '}
                                    <span className="text-gray-600">
                                      {typeof changeObj.old === 'object'
                                        ? JSON.stringify(changeObj.old)
                                        : String(changeObj.old || 'N/A')}
                                    </span>
                                    {' → '}
                                    <span className="text-gray-900">
                                      {typeof changeObj.new === 'object'
                                        ? JSON.stringify(changeObj.new)
                                        : String(changeObj.new)}
                                    </span>
                                  </div>
                                )
                              } else {
                                // Direct value (e.g., refund fields)
                                return (
                                  <div key={field} className="text-xs">
                                    <span className="font-medium">
                                      {field.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>{' '}
                                    <span className="text-gray-900">
                                      {typeof change === 'number' && field.toLowerCase().includes('amount')
                                        ? `$${Number(change).toFixed(2)}`
                                        : String(change)}
                                    </span>
                                  </div>
                                )
                              }
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price Change */}
                    {edit.oldTotal !== null && edit.oldTotal !== undefined && edit.newTotal !== null && edit.newTotal !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Price: ${Number(edit.oldTotal).toFixed(2)} → ${Number(edit.newTotal).toFixed(2)}
                      </div>
                    )}

                    {/* Admin Notes */}
                    {edit.adminNotes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-900 mb-1">
                          Admin Notes:
                        </div>
                        <div className="text-blue-800">{edit.adminNotes}</div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>

      {/* Refund Modal */}
      {registration && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          registrationId={registration.id}
          registrationType="group"
          currentBalance={registration.paymentBalance?.amountRemaining || 0}
          amountPaid={registration.paymentBalance?.amountPaid || 0}
          onRefundProcessed={() => {
            setShowRefundModal(false)
            onUpdate?.()
          }}
        />
      )}

      {/* Mark Check Received Modal */}
      <MarkCheckReceivedModal
        isOpen={showCheckModal}
        onClose={() => {
          setShowCheckModal(false)
          setSelectedPayment(null)
        }}
        payment={selectedPayment}
        onSuccess={() => {
          setShowCheckModal(false)
          setSelectedPayment(null)
          onUpdate?.()
        }}
      />

      {/* Record Check Payment Modal */}
      {registration && registration.paymentBalance && (
        <RecordCheckPaymentModal
          isOpen={showRecordCheckModal}
          onClose={() => setShowRecordCheckModal(false)}
          registrationId={registration.id}
          registrationType="group"
          balanceRemaining={registration.paymentBalance.amountRemaining}
          totalAmountDue={registration.paymentBalance.totalAmountDue}
          onSuccess={() => {
            setShowRecordCheckModal(false)
            onUpdate?.()
          }}
        />
      )}

      {/* Record Additional Payment Modal */}
      {registration && registration.paymentBalance && (
        <RecordAdditionalPaymentModal
          isOpen={showRecordAdditionalPaymentModal}
          onClose={() => setShowRecordAdditionalPaymentModal(false)}
          registrationId={registration.id}
          registrationType="group"
          registrationName={registration.groupName}
          balanceRemaining={registration.paymentBalance.amountRemaining}
          onSuccess={() => {
            setShowRecordAdditionalPaymentModal(false)
            onUpdate?.()
          }}
        />
      )}

      {/* Edit Participant Modal */}
      <EditParticipantModal
        isOpen={showEditParticipantModal}
        onClose={() => {
          setShowEditParticipantModal(false)
          setSelectedParticipant(null)
        }}
        participant={selectedParticipant}
        onSuccess={() => {
          setShowEditParticipantModal(false)
          setSelectedParticipant(null)
          onUpdate?.()
        }}
      />
    </Dialog>
  )
}
