'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Download, Save, Loader2, Play, Trash2, ChevronUp, ChevronDown, GripVertical, Filter, Columns, Settings2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ReportTemplate {
  id: string
  name: string
  description: string | null
  reportType: string
  configuration: any
  isPublic: boolean
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface FieldOption {
  value: string
  label: string
  category?: string
  description?: string
}

interface CustomReportBuilderProps {
  eventId: string
  eventName: string
  organizationId?: string
  open: boolean
  onClose: () => void
}

// Data source definitions with their available fields
const DATA_SOURCES: Record<string, { label: string; description: string; fields: FieldOption[] }> = {
  registrations: {
    label: 'Group Registrations',
    description: 'All group registration records with leader info and participant counts',
    fields: [
      { value: 'accessCode', label: 'Registration Code', category: 'Basic' },
      { value: 'groupName', label: 'Group Name', category: 'Basic' },
      { value: 'parishName', label: 'Parish Name', category: 'Basic' },
      { value: 'dioceseName', label: 'Diocese Name', category: 'Basic' },
      { value: 'groupLeaderName', label: 'Group Leader Name', category: 'Contact' },
      { value: 'groupLeaderEmail', label: 'Group Leader Email', category: 'Contact' },
      { value: 'groupLeaderPhone', label: 'Group Leader Phone', category: 'Contact' },
      { value: 'secondaryContactName', label: 'Secondary Contact Name', category: 'Contact' },
      { value: 'secondaryContactEmail', label: 'Secondary Contact Email', category: 'Contact' },
      { value: 'secondaryContactPhone', label: 'Secondary Contact Phone', category: 'Contact' },
      { value: 'youthCount', label: 'Youth Count', category: 'Counts' },
      { value: 'chaperoneCount', label: 'Chaperone Count', category: 'Counts' },
      { value: 'priestCount', label: 'Priest Count', category: 'Counts' },
      { value: 'totalParticipants', label: 'Total Participants', category: 'Counts' },
      { value: 'housingType', label: 'Housing Type', category: 'Housing' },
      { value: 'registrationStatus', label: 'Registration Status', category: 'Status' },
      { value: 'paymentStatus', label: 'Payment Status', category: 'Financial' },
      { value: 'totalAmountDue', label: 'Total Amount Due', category: 'Financial' },
      { value: 'amountPaid', label: 'Amount Paid', category: 'Financial' },
      { value: 'amountRemaining', label: 'Balance Remaining', category: 'Financial' },
      { value: 'createdAt', label: 'Registration Date', category: 'Dates' },
      { value: 'updatedAt', label: 'Last Updated', category: 'Dates' },
    ],
  },
  participants: {
    label: 'Participant Roster',
    description: 'Individual participant details from group registrations',
    fields: [
      { value: 'firstName', label: 'First Name', category: 'Basic' },
      { value: 'lastName', label: 'Last Name', category: 'Basic' },
      { value: 'preferredName', label: 'Preferred Name', category: 'Basic' },
      { value: 'age', label: 'Age', category: 'Basic' },
      { value: 'dateOfBirth', label: 'Date of Birth', category: 'Basic' },
      { value: 'gender', label: 'Gender', category: 'Basic' },
      { value: 'participantType', label: 'Participant Type', category: 'Type' },
      { value: 'tShirtSize', label: 'T-Shirt Size', category: 'Preferences' },
      { value: 'checkedIn', label: 'Checked In', category: 'Status' },
      { value: 'checkedInAt', label: 'Check-in Time', category: 'Status' },
      { value: 'groupRegistration.accessCode', label: 'Registration Code', category: 'Group' },
      { value: 'groupRegistration.groupName', label: 'Group Name', category: 'Group' },
      { value: 'groupRegistration.parishName', label: 'Parish Name', category: 'Group' },
      { value: 'groupRegistration.dioceseName', label: 'Diocese Name', category: 'Group' },
      { value: 'groupRegistration.groupLeaderName', label: 'Group Leader Name', category: 'Group' },
      { value: 'groupRegistration.groupLeaderEmail', label: 'Group Leader Email', category: 'Group' },
      { value: 'groupRegistration.groupLeaderPhone', label: 'Group Leader Phone', category: 'Group' },
      { value: 'groupRegistration.housingType', label: 'Housing Type', category: 'Group' },
      { value: 'liabilityForm.allergies', label: 'Allergies', category: 'Medical' },
      { value: 'liabilityForm.medications', label: 'Medications', category: 'Medical' },
      { value: 'liabilityForm.medicalConditions', label: 'Medical Conditions', category: 'Medical' },
      { value: 'liabilityForm.dietaryRestrictions', label: 'Dietary Restrictions', category: 'Medical' },
      { value: 'liabilityForm.adaAccommodations', label: 'ADA Accommodations', category: 'Medical' },
      { value: 'liabilityForm.emergencyContact1Name', label: 'Emergency Contact Name', category: 'Emergency' },
      { value: 'liabilityForm.emergencyContact1Phone', label: 'Emergency Contact Phone', category: 'Emergency' },
      { value: 'liabilityForm.emergencyContact1Relation', label: 'Emergency Contact Relation', category: 'Emergency' },
    ],
  },
  individuals: {
    label: 'Individual Registrations',
    description: 'Individual (non-group) registration records',
    fields: [
      { value: 'firstName', label: 'First Name', category: 'Basic' },
      { value: 'lastName', label: 'Last Name', category: 'Basic' },
      { value: 'preferredName', label: 'Preferred Name', category: 'Basic' },
      { value: 'email', label: 'Email', category: 'Contact' },
      { value: 'phone', label: 'Phone', category: 'Contact' },
      { value: 'age', label: 'Age', category: 'Basic' },
      { value: 'gender', label: 'Gender', category: 'Basic' },
      { value: 'tShirtSize', label: 'T-Shirt Size', category: 'Preferences' },
      { value: 'housingType', label: 'Housing Type', category: 'Housing' },
      { value: 'registrationStatus', label: 'Registration Status', category: 'Status' },
      { value: 'checkedIn', label: 'Checked In', category: 'Status' },
      { value: 'checkedInAt', label: 'Check-in Time', category: 'Status' },
      { value: 'paymentStatus', label: 'Payment Status', category: 'Financial' },
      { value: 'totalAmountDue', label: 'Total Amount Due', category: 'Financial' },
      { value: 'amountPaid', label: 'Amount Paid', category: 'Financial' },
      { value: 'emergencyContact1Name', label: 'Emergency Contact Name', category: 'Emergency' },
      { value: 'emergencyContact1Phone', label: 'Emergency Contact Phone', category: 'Emergency' },
      { value: 'emergencyContact1Relation', label: 'Emergency Contact Relation', category: 'Emergency' },
      { value: 'liabilityForm.allergies', label: 'Allergies', category: 'Medical' },
      { value: 'liabilityForm.medications', label: 'Medications', category: 'Medical' },
      { value: 'liabilityForm.dietaryRestrictions', label: 'Dietary Restrictions', category: 'Medical' },
      { value: 'createdAt', label: 'Registration Date', category: 'Dates' },
    ],
  },
  vendors: {
    label: 'Vendor Registrations',
    description: 'Vendor booth registrations with business info and payment status',
    fields: [
      { value: 'vendorCode', label: 'Vendor Code', category: 'Basic' },
      { value: 'businessName', label: 'Business Name', category: 'Basic' },
      { value: 'boothDescription', label: 'Booth Description', category: 'Basic' },
      { value: 'contactFirstName', label: 'Contact First Name', category: 'Contact' },
      { value: 'contactLastName', label: 'Contact Last Name', category: 'Contact' },
      { value: 'email', label: 'Email', category: 'Contact' },
      { value: 'phone', label: 'Phone', category: 'Contact' },
      { value: 'selectedTier', label: 'Booth Tier', category: 'Booth' },
      { value: 'tierPrice', label: 'Tier Price', category: 'Financial' },
      { value: 'additionalNeeds', label: 'Additional Needs', category: 'Booth' },
      { value: 'status', label: 'Approval Status', category: 'Status' },
      { value: 'rejectionReason', label: 'Rejection Reason', category: 'Status' },
      { value: 'approvedAt', label: 'Approval Date', category: 'Dates' },
      { value: 'paymentStatus', label: 'Payment Status', category: 'Financial' },
      { value: 'invoiceTotal', label: 'Invoice Total', category: 'Financial' },
      { value: 'amountPaid', label: 'Amount Paid', category: 'Financial' },
      { value: 'paidAt', label: 'Payment Date', category: 'Dates' },
      { value: 'staffCount', label: 'Booth Staff Count', category: 'Staff' },
      { value: 'createdAt', label: 'Registration Date', category: 'Dates' },
    ],
  },
  staff: {
    label: 'Staff & Volunteers',
    description: 'Event staff and vendor booth workers',
    fields: [
      { value: 'firstName', label: 'First Name', category: 'Basic' },
      { value: 'lastName', label: 'Last Name', category: 'Basic' },
      { value: 'email', label: 'Email', category: 'Contact' },
      { value: 'phone', label: 'Phone', category: 'Contact' },
      { value: 'role', label: 'Role', category: 'Assignment' },
      { value: 'isVendorStaff', label: 'Is Vendor Staff', category: 'Type' },
      { value: 'vendorCode', label: 'Vendor Code', category: 'Vendor' },
      { value: 'vendorRegistration.businessName', label: 'Vendor Business Name', category: 'Vendor' },
      { value: 'tshirtSize', label: 'T-Shirt Size', category: 'Preferences' },
      { value: 'dietaryRestrictions', label: 'Dietary Restrictions', category: 'Preferences' },
      { value: 'pricePaid', label: 'Price Paid', category: 'Financial' },
      { value: 'paymentStatus', label: 'Payment Status', category: 'Financial' },
      { value: 'checkedIn', label: 'Checked In', category: 'Status' },
      { value: 'checkedInAt', label: 'Check-in Time', category: 'Status' },
      { value: 'porosAccessCode', label: 'Poros Access Code', category: 'System' },
      { value: 'createdAt', label: 'Registration Date', category: 'Dates' },
    ],
  },
  financial: {
    label: 'Financial & Payments',
    description: 'Payment transactions, balances, and refunds',
    fields: [
      { value: 'registrationType', label: 'Registration Type', category: 'Basic' },
      { value: 'registrationName', label: 'Registration Name', category: 'Basic' },
      { value: 'contactEmail', label: 'Contact Email', category: 'Contact' },
      { value: 'amount', label: 'Payment Amount', category: 'Payment' },
      { value: 'paymentMethod', label: 'Payment Method', category: 'Payment' },
      { value: 'status', label: 'Payment Status', category: 'Payment' },
      { value: 'stripePaymentIntentId', label: 'Stripe Payment ID', category: 'Payment' },
      { value: 'checkNumber', label: 'Check Number', category: 'Payment' },
      { value: 'totalAmountDue', label: 'Total Amount Due', category: 'Balance' },
      { value: 'amountPaid', label: 'Total Paid', category: 'Balance' },
      { value: 'amountRemaining', label: 'Balance Remaining', category: 'Balance' },
      { value: 'lastPaymentDate', label: 'Last Payment Date', category: 'Dates' },
      { value: 'refundAmount', label: 'Refund Amount', category: 'Refunds' },
      { value: 'refundReason', label: 'Refund Reason', category: 'Refunds' },
      { value: 'refundDate', label: 'Refund Date', category: 'Dates' },
      { value: 'createdAt', label: 'Transaction Date', category: 'Dates' },
    ],
  },
  checkins: {
    label: 'Check-in Activity',
    description: 'Check-in/check-out logs and attendance tracking',
    fields: [
      { value: 'personType', label: 'Person Type', category: 'Basic' },
      { value: 'personName', label: 'Person Name', category: 'Basic' },
      { value: 'groupName', label: 'Group Name', category: 'Group' },
      { value: 'action', label: 'Action', category: 'Activity' },
      { value: 'station', label: 'Station', category: 'Activity' },
      { value: 'notes', label: 'Notes', category: 'Activity' },
      { value: 'performedBy', label: 'Performed By', category: 'Activity' },
      { value: 'createdAt', label: 'Timestamp', category: 'Dates' },
    ],
  },
  medical: {
    label: 'Medical & Dietary',
    description: 'Participant medical info, allergies, and dietary restrictions',
    fields: [
      { value: 'participant.firstName', label: 'First Name', category: 'Basic' },
      { value: 'participant.lastName', label: 'Last Name', category: 'Basic' },
      { value: 'participant.age', label: 'Age', category: 'Basic' },
      { value: 'participant.participantType', label: 'Participant Type', category: 'Basic' },
      { value: 'participant.groupRegistration.groupName', label: 'Group Name', category: 'Group' },
      { value: 'participant.groupRegistration.groupLeaderName', label: 'Group Leader', category: 'Group' },
      { value: 'participant.groupRegistration.groupLeaderPhone', label: 'Leader Phone', category: 'Group' },
      { value: 'allergies', label: 'Allergies', category: 'Medical' },
      { value: 'allergiesPeanuts', label: 'Peanut Allergy', category: 'Allergies' },
      { value: 'allergiesTreeNuts', label: 'Tree Nut Allergy', category: 'Allergies' },
      { value: 'allergiesShellfish', label: 'Shellfish Allergy', category: 'Allergies' },
      { value: 'allergiesDairy', label: 'Dairy Allergy', category: 'Allergies' },
      { value: 'allergiesEggs', label: 'Egg Allergy', category: 'Allergies' },
      { value: 'allergiesWheat', label: 'Wheat/Gluten Allergy', category: 'Allergies' },
      { value: 'allergiesSoy', label: 'Soy Allergy', category: 'Allergies' },
      { value: 'medications', label: 'Medications', category: 'Medical' },
      { value: 'medicalConditions', label: 'Medical Conditions', category: 'Medical' },
      { value: 'dietaryRestrictions', label: 'Dietary Restrictions', category: 'Dietary' },
      { value: 'adaAccommodations', label: 'ADA Accommodations', category: 'Medical' },
      { value: 'emergencyContact1Name', label: 'Emergency Contact', category: 'Emergency' },
      { value: 'emergencyContact1Phone', label: 'Emergency Phone', category: 'Emergency' },
      { value: 'emergencyContact1Relation', label: 'Contact Relation', category: 'Emergency' },
    ],
  },
  incidents: {
    label: 'Medical Incidents (Rapha)',
    description: 'Medical incidents and first aid records from the event',
    fields: [
      { value: 'participantName', label: 'Participant Name', category: 'Basic' },
      { value: 'participantAge', label: 'Participant Age', category: 'Basic' },
      { value: 'groupName', label: 'Group Name', category: 'Group' },
      { value: 'incidentType', label: 'Incident Type', category: 'Incident' },
      { value: 'severity', label: 'Severity', category: 'Incident' },
      { value: 'incidentDate', label: 'Incident Date', category: 'Incident' },
      { value: 'incidentTime', label: 'Incident Time', category: 'Incident' },
      { value: 'location', label: 'Location', category: 'Incident' },
      { value: 'description', label: 'Description', category: 'Incident' },
      { value: 'treatmentProvided', label: 'Treatment Provided', category: 'Treatment' },
      { value: 'staffMemberName', label: 'Staff Member', category: 'Treatment' },
      { value: 'parentContacted', label: 'Parent Contacted', category: 'Parent' },
      { value: 'parentContactTime', label: 'Parent Contact Time', category: 'Parent' },
      { value: 'parentContactNotes', label: 'Parent Contact Notes', category: 'Parent' },
      { value: 'sentToHospital', label: 'Sent to Hospital', category: 'Outcome' },
      { value: 'hospitalName', label: 'Hospital Name', category: 'Outcome' },
      { value: 'ambulanceCalled', label: 'Ambulance Called', category: 'Outcome' },
      { value: 'status', label: 'Status', category: 'Status' },
      { value: 'followUpRequired', label: 'Follow-up Required', category: 'Status' },
      { value: 'resolvedAt', label: 'Resolved At', category: 'Dates' },
      { value: 'resolutionNotes', label: 'Resolution Notes', category: 'Status' },
    ],
  },
  housing: {
    label: 'Housing Assignments',
    description: 'Room and building assignments',
    fields: [
      { value: 'building.name', label: 'Building Name', category: 'Building' },
      { value: 'room.roomNumber', label: 'Room Number', category: 'Room' },
      { value: 'room.floor', label: 'Floor', category: 'Room' },
      { value: 'room.capacity', label: 'Room Capacity', category: 'Room' },
      { value: 'room.currentOccupancy', label: 'Current Occupancy', category: 'Room' },
      { value: 'room.roomType', label: 'Room Type', category: 'Room' },
      { value: 'room.gender', label: 'Room Gender', category: 'Room' },
      { value: 'room.isAdaAccessible', label: 'ADA Accessible', category: 'Room' },
      { value: 'participant.firstName', label: 'Participant First Name', category: 'Occupant' },
      { value: 'participant.lastName', label: 'Participant Last Name', category: 'Occupant' },
      { value: 'participant.participantType', label: 'Participant Type', category: 'Occupant' },
      { value: 'participant.groupRegistration.groupName', label: 'Group Name', category: 'Occupant' },
      { value: 'assignedAt', label: 'Assigned Date', category: 'Dates' },
    ],
  },
  tshirts: {
    label: 'T-Shirt Orders',
    description: 'T-shirt size breakdown for ordering',
    fields: [
      { value: 'firstName', label: 'First Name', category: 'Basic' },
      { value: 'lastName', label: 'Last Name', category: 'Basic' },
      { value: 'tShirtSize', label: 'T-Shirt Size', category: 'Order' },
      { value: 'participantType', label: 'Person Type', category: 'Type' },
      { value: 'groupName', label: 'Group Name', category: 'Group' },
      { value: 'parishName', label: 'Parish Name', category: 'Group' },
      { value: 'registrationType', label: 'Registration Type', category: 'Type' },
    ],
  },
  coupons: {
    label: 'Coupon Usage',
    description: 'Discount code redemptions and usage',
    fields: [
      { value: 'coupon.code', label: 'Coupon Code', category: 'Coupon' },
      { value: 'coupon.name', label: 'Coupon Name', category: 'Coupon' },
      { value: 'coupon.discountType', label: 'Discount Type', category: 'Coupon' },
      { value: 'coupon.discountValue', label: 'Discount Value', category: 'Coupon' },
      { value: 'registrationType', label: 'Registration Type', category: 'Redemption' },
      { value: 'registrationName', label: 'Registration Name', category: 'Redemption' },
      { value: 'discountApplied', label: 'Discount Applied', category: 'Redemption' },
      { value: 'redeemedAt', label: 'Redeemed At', category: 'Dates' },
    ],
  },
}

// Filter options for each data source
const FILTER_OPTIONS: Record<string, { value: string; label: string; type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange' | 'boolean'; options?: { value: string; label: string }[] }[]> = {
  registrations: [
    { value: 'registrationStatus', label: 'Registration Status', type: 'multiselect', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { value: 'housingType', label: 'Housing Type', type: 'multiselect', options: [
      { value: 'on_campus', label: 'On Campus' },
      { value: 'off_campus', label: 'Off Campus' },
      { value: 'day_pass', label: 'Day Pass' },
    ]},
    { value: 'paymentStatus', label: 'Payment Status', type: 'multiselect', options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid_full', label: 'Paid in Full' },
    ]},
    { value: 'search', label: 'Search (name, parish, email)', type: 'text' },
  ],
  participants: [
    { value: 'participantType', label: 'Participant Type', type: 'multiselect', options: [
      { value: 'youth_u18', label: 'Youth (Under 18)' },
      { value: 'youth_o18', label: 'Youth (18+)' },
      { value: 'chaperone', label: 'Chaperone' },
      { value: 'priest', label: 'Priest/Clergy' },
    ]},
    { value: 'gender', label: 'Gender', type: 'multiselect', options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ]},
    { value: 'checkedIn', label: 'Check-in Status', type: 'select', options: [
      { value: 'all', label: 'All' },
      { value: 'true', label: 'Checked In' },
      { value: 'false', label: 'Not Checked In' },
    ]},
    { value: 'liabilityFormStatus', label: 'Liability Form', type: 'select', options: [
      { value: 'all', label: 'All' },
      { value: 'completed', label: 'Has Form' },
      { value: 'pending', label: 'Missing Form' },
    ]},
    { value: 'hasMedicalNeeds', label: 'Has Medical Needs', type: 'boolean' },
    { value: 'minAge', label: 'Minimum Age', type: 'text' },
    { value: 'maxAge', label: 'Maximum Age', type: 'text' },
    { value: 'search', label: 'Search (name)', type: 'text' },
  ],
  individuals: [
    { value: 'registrationStatus', label: 'Registration Status', type: 'multiselect', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { value: 'checkedIn', label: 'Check-in Status', type: 'select', options: [
      { value: 'all', label: 'All' },
      { value: 'true', label: 'Checked In' },
      { value: 'false', label: 'Not Checked In' },
    ]},
    { value: 'search', label: 'Search (name, email)', type: 'text' },
  ],
  vendors: [
    { value: 'status', label: 'Approval Status', type: 'multiselect', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ]},
    { value: 'paymentStatus', label: 'Payment Status', type: 'multiselect', options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid', label: 'Paid' },
    ]},
    { value: 'search', label: 'Search (business name, contact)', type: 'text' },
  ],
  staff: [
    { value: 'isVendorStaff', label: 'Staff Type', type: 'select', options: [
      { value: 'all', label: 'All Staff' },
      { value: 'true', label: 'Vendor Staff Only' },
      { value: 'false', label: 'Event Volunteers Only' },
    ]},
    { value: 'checkedIn', label: 'Check-in Status', type: 'select', options: [
      { value: 'all', label: 'All' },
      { value: 'true', label: 'Checked In' },
      { value: 'false', label: 'Not Checked In' },
    ]},
    { value: 'paymentStatus', label: 'Payment Status', type: 'multiselect', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' },
      { value: 'waived', label: 'Waived' },
    ]},
    { value: 'role', label: 'Role', type: 'text' },
    { value: 'search', label: 'Search (name, email)', type: 'text' },
  ],
  financial: [
    { value: 'registrationType', label: 'Registration Type', type: 'multiselect', options: [
      { value: 'group', label: 'Group Registration' },
      { value: 'individual', label: 'Individual Registration' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'staff', label: 'Staff' },
    ]},
    { value: 'paymentMethod', label: 'Payment Method', type: 'multiselect', options: [
      { value: 'stripe', label: 'Credit Card (Stripe)' },
      { value: 'check', label: 'Check' },
      { value: 'cash', label: 'Cash' },
      { value: 'other', label: 'Other' },
    ]},
    { value: 'status', label: 'Payment Status', type: 'multiselect', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'succeeded', label: 'Succeeded' },
      { value: 'failed', label: 'Failed' },
      { value: 'refunded', label: 'Refunded' },
    ]},
    { value: 'dateRange', label: 'Date Range', type: 'daterange' },
  ],
  checkins: [
    { value: 'action', label: 'Action Type', type: 'multiselect', options: [
      { value: 'check_in', label: 'Check In' },
      { value: 'check_out', label: 'Check Out' },
      { value: 'print_packet', label: 'Print Packet' },
      { value: 'print_name_tag', label: 'Print Name Tag' },
    ]},
    { value: 'dateRange', label: 'Date Range', type: 'daterange' },
    { value: 'station', label: 'Station', type: 'text' },
  ],
  medical: [
    { value: 'hasAllergies', label: 'Has Allergies', type: 'boolean' },
    { value: 'hasMedications', label: 'Has Medications', type: 'boolean' },
    { value: 'hasMedicalConditions', label: 'Has Medical Conditions', type: 'boolean' },
    { value: 'hasDietaryRestrictions', label: 'Has Dietary Restrictions', type: 'boolean' },
    { value: 'participantType', label: 'Participant Type', type: 'multiselect', options: [
      { value: 'youth_u18', label: 'Youth (Under 18)' },
      { value: 'youth_o18', label: 'Youth (18+)' },
      { value: 'chaperone', label: 'Chaperone' },
      { value: 'priest', label: 'Priest/Clergy' },
    ]},
  ],
  incidents: [
    { value: 'incidentType', label: 'Incident Type', type: 'multiselect', options: [
      { value: 'injury', label: 'Injury' },
      { value: 'illness', label: 'Illness' },
      { value: 'allergic_reaction', label: 'Allergic Reaction' },
      { value: 'medication_administration', label: 'Medication Administration' },
      { value: 'other', label: 'Other' },
    ]},
    { value: 'severity', label: 'Severity', type: 'multiselect', options: [
      { value: 'minor', label: 'Minor' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'severe', label: 'Severe' },
    ]},
    { value: 'status', label: 'Status', type: 'multiselect', options: [
      { value: 'active', label: 'Active' },
      { value: 'monitoring', label: 'Monitoring' },
      { value: 'resolved', label: 'Resolved' },
    ]},
    { value: 'dateRange', label: 'Date Range', type: 'daterange' },
  ],
  housing: [
    { value: 'building', label: 'Building', type: 'text' },
    { value: 'roomType', label: 'Room Type', type: 'text' },
    { value: 'gender', label: 'Gender', type: 'select', options: [
      { value: 'all', label: 'All' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ]},
  ],
  tshirts: [
    { value: 'sizes', label: 'T-Shirt Sizes', type: 'multiselect', options: [
      { value: 'YXS', label: 'Youth XS' },
      { value: 'YS', label: 'Youth S' },
      { value: 'YM', label: 'Youth M' },
      { value: 'YL', label: 'Youth L' },
      { value: 'YXL', label: 'Youth XL' },
      { value: 'AS', label: 'Adult S' },
      { value: 'AM', label: 'Adult M' },
      { value: 'AL', label: 'Adult L' },
      { value: 'AXL', label: 'Adult XL' },
      { value: 'A2XL', label: 'Adult 2XL' },
      { value: 'A3XL', label: 'Adult 3XL' },
    ]},
    { value: 'personType', label: 'Person Type', type: 'multiselect', options: [
      { value: 'participant', label: 'Participant' },
      { value: 'individual', label: 'Individual Registration' },
      { value: 'staff', label: 'Staff' },
    ]},
  ],
  coupons: [
    { value: 'registrationType', label: 'Registration Type', type: 'multiselect', options: [
      { value: 'group', label: 'Group' },
      { value: 'individual', label: 'Individual' },
      { value: 'staff', label: 'Staff' },
      { value: 'vendor', label: 'Vendor' },
    ]},
    { value: 'dateRange', label: 'Date Range', type: 'daterange' },
  ],
}

// Grouping options for each data source
const GROUPING_OPTIONS: Record<string, { value: string; label: string }[]> = {
  registrations: [
    { value: 'none', label: 'No Grouping' },
    { value: 'diocese', label: 'By Diocese' },
    { value: 'housingType', label: 'By Housing Type' },
    { value: 'paymentStatus', label: 'By Payment Status' },
  ],
  participants: [
    { value: 'none', label: 'No Grouping' },
    { value: 'group', label: 'By Group/Parish' },
    { value: 'participantType', label: 'By Participant Type' },
    { value: 'gender', label: 'By Gender' },
    { value: 'housingType', label: 'By Housing Type' },
  ],
  individuals: [
    { value: 'none', label: 'No Grouping' },
    { value: 'housingType', label: 'By Housing Type' },
    { value: 'paymentStatus', label: 'By Payment Status' },
  ],
  vendors: [
    { value: 'none', label: 'No Grouping' },
    { value: 'status', label: 'By Approval Status' },
    { value: 'paymentStatus', label: 'By Payment Status' },
    { value: 'tier', label: 'By Booth Tier' },
  ],
  staff: [
    { value: 'none', label: 'No Grouping' },
    { value: 'role', label: 'By Role' },
    { value: 'type', label: 'By Staff Type (Vendor/Event)' },
    { value: 'vendor', label: 'By Vendor' },
  ],
  financial: [
    { value: 'none', label: 'No Grouping' },
    { value: 'registrationType', label: 'By Registration Type' },
    { value: 'paymentMethod', label: 'By Payment Method' },
    { value: 'status', label: 'By Status' },
  ],
  checkins: [
    { value: 'none', label: 'No Grouping' },
    { value: 'action', label: 'By Action Type' },
    { value: 'station', label: 'By Station' },
    { value: 'date', label: 'By Date' },
  ],
  medical: [
    { value: 'none', label: 'No Grouping' },
    { value: 'group', label: 'By Group' },
    { value: 'participantType', label: 'By Participant Type' },
    { value: 'allergyType', label: 'By Allergy Type' },
  ],
  incidents: [
    { value: 'none', label: 'No Grouping' },
    { value: 'incidentType', label: 'By Incident Type' },
    { value: 'severity', label: 'By Severity' },
    { value: 'status', label: 'By Status' },
    { value: 'date', label: 'By Date' },
  ],
  housing: [
    { value: 'none', label: 'No Grouping' },
    { value: 'building', label: 'By Building' },
    { value: 'floor', label: 'By Floor' },
    { value: 'gender', label: 'By Gender' },
  ],
  tshirts: [
    { value: 'none', label: 'No Grouping' },
    { value: 'size', label: 'By Size' },
    { value: 'personType', label: 'By Person Type' },
    { value: 'group', label: 'By Group' },
  ],
  coupons: [
    { value: 'none', label: 'No Grouping' },
    { value: 'coupon', label: 'By Coupon' },
    { value: 'registrationType', label: 'By Registration Type' },
  ],
}

export function CustomReportBuilder({
  eventId,
  eventName,
  organizationId,
  open,
  onClose,
}: CustomReportBuilderProps) {
  const { getToken } = useAuth()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dataSource, setDataSource] = useState<string>('participants')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [groupBy, setGroupBy] = useState<string>('none')
  const [sortBy, setSortBy] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('fields')

  // Get current data source config
  const currentSource = DATA_SOURCES[dataSource]
  const currentFilters = FILTER_OPTIONS[dataSource] || []
  const currentGroupings = GROUPING_OPTIONS[dataSource] || []

  // Group fields by category
  const fieldsByCategory = currentSource?.fields.reduce((acc, field) => {
    const category = field.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(field)
    return acc
  }, {} as Record<string, FieldOption[]>) || {}

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  // Clear report data when data source changes
  useEffect(() => {
    setReportData(null)
    setSelectedFields([])
    setFilters({})
    setGroupBy('none')
    setSortBy('')
  }, [dataSource])

  const loadTemplates = async () => {
    if (!organizationId) return
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/report-templates?organizationId=${organizationId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    }
  }

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setDataSource(template.configuration.dataSource || template.reportType)
      setSelectedFields(template.configuration.fields || [])
      setFilters(template.configuration.filters || {})
      setGroupBy(template.configuration.groupBy || 'none')
      setSortBy(template.configuration.sortBy || '')
      setSortDirection(template.configuration.sortDirection || 'asc')
      setTemplateName(template.name)
      setTemplateDescription(template.description || '')
      setIsPublic(template.isPublic)
      setReportData(null)
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateName) {
      alert('Please enter a template name')
      return
    }
    if (!organizationId) {
      alert('Organization ID is required to save templates')
      return
    }

    setLoading(true)
    try {
      const configuration = {
        dataSource,
        fields: selectedFields,
        filters,
        groupBy,
        sortBy,
        sortDirection,
        reportType: dataSource, // For backwards compatibility
      }

      const url = selectedTemplate
        ? `/api/admin/report-templates/${selectedTemplate}`
        : '/api/admin/report-templates'

      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(url, {
        method: selectedTemplate ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          organizationId,
          name: templateName,
          description: templateDescription,
          reportType: dataSource,
          configuration,
          isPublic,
        }),
      })

      if (response.ok) {
        const savedTemplate = await response.json()
        alert('Template saved successfully!')
        await loadTemplates()
        if (savedTemplate?.id) {
          setSelectedTemplate(savedTemplate.id)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to save template: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    if (!confirm('Are you sure you want to delete this template?')) return

    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/report-templates/${selectedTemplate}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (response.ok) {
        alert('Template deleted successfully!')
        setSelectedTemplate('')
        setTemplateName('')
        setTemplateDescription('')
        loadTemplates()
      } else {
        alert('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteReport = async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field to include in the report')
      return
    }

    setExecuting(true)
    try {
      const url = `/api/admin/events/${eventId}/reports/custom`

      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
          configuration: {
            dataSource,
            fields: selectedFields,
            filters,
            groupBy: groupBy !== 'none' ? groupBy : undefined,
            sortBy,
            sortDirection,
            reportType: dataSource,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        const errorText = await response.text()
        console.error('Report failed:', errorText)
        alert(`Failed to execute report: ${errorText}`)
      }
    } catch (error) {
      console.error('Error executing report:', error)
      alert(`Error executing report: ${error}`)
    } finally {
      setExecuting(false)
    }
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!reportData) return

    if (format === 'csv') {
      const csv = convertToCSV(reportData)
      downloadFile(csv, `${templateName || dataSource}-report.csv`, 'text/csv')
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to print reports')
        return
      }

      const reportHtml = generatePrintHTML()
      printWindow.document.write(reportHtml)
      printWindow.document.close()

      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  const convertToCSV = (data: any): string => {
    let csvData: any[] = []

    if (data.grouped && Array.isArray(data.data)) {
      // Flatten grouped data
      csvData = data.data.flatMap((group: any) =>
        (group.items || group.participants || []).map((item: any) => ({
          _groupKey: group.groupKey || group.groupName || '',
          ...flattenObject(item),
        }))
      )
    } else if (Array.isArray(data.data)) {
      csvData = data.data.map((item: any) => flattenObject(item))
    } else if (data.data?.items) {
      csvData = data.data.items.map((item: any) => flattenObject(item))
    } else {
      csvData = [flattenObject(data.data)]
    }

    if (!csvData || csvData.length === 0) return 'No data available'

    const headers = Object.keys(csvData[0])
    const rows = csvData.map(row =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        const strValue = String(value)
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return strValue
      }).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  const flattenObject = (obj: any, prefix = ''): any => {
    let flattened: any = {}

    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        flattened[prefix + key] = ''
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        Object.assign(flattened, flattenObject(obj[key], prefix + key + '.'))
      } else if (Array.isArray(obj[key])) {
        flattened[prefix + key] = obj[key].join('; ')
      } else {
        flattened[prefix + key] = obj[key]
      }
    }

    return flattened
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const generatePrintHTML = (): string => {
    const reportTitle = templateName || DATA_SOURCES[dataSource]?.label || 'Custom Report'
    let tableHTML = ''

    // Get visible field labels
    const fieldLabels = selectedFields.map(f => {
      const field = currentSource?.fields.find(ff => ff.value === f)
      return field?.label || f
    })

    if (reportData?.grouped && Array.isArray(reportData.data)) {
      // Grouped data
      tableHTML = reportData.data.map((group: any) => {
        const items = group.items || group.participants || []
        return `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px;">
              ${group.groupKey || group.groupName || 'Group'}
              <span style="font-weight: normal; color: #666; font-size: 14px; margin-left: 10px;">(${items.length} records)</span>
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
              <thead>
                <tr style="background-color: #e5e7eb;">
                  ${fieldLabels.map(label => `<th style="border: 1px solid #333; padding: 6px 8px; text-align: left;">${label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${items.map((item: any, i: number) => `
                  <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                    ${selectedFields.map(field => `<td style="border: 1px solid #333; padding: 6px 8px;">${getNestedValue(item, field)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `
      }).join('')
    } else {
      // Flat data
      const items = Array.isArray(reportData?.data) ? reportData.data : (reportData?.data?.items || [])
      tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #e5e7eb;">
              ${fieldLabels.map(label => `<th style="border: 1px solid #333; padding: 6px 8px; text-align: left;">${label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, i: number) => `
              <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                ${selectedFields.map(field => `<td style="border: 1px solid #333; padding: 6px 8px;">${getNestedValue(item, field)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - ${eventName}</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          .subtitle { color: #666; margin-bottom: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div class="subtitle">${eventName} • Generated ${new Date().toLocaleString()}</div>
        ${tableHTML}
      </body>
      </html>
    `
  }

  const getNestedValue = (obj: any, path: string): string => {
    const value = path.split('.').reduce((acc, part) => acc?.[part], obj)
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value instanceof Date) return value.toLocaleString()
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const selectAllFields = () => {
    setSelectedFields(currentSource?.fields.map(f => f.value) || [])
  }

  const clearAllFields = () => {
    setSelectedFields([])
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...selectedFields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newFields.length) return
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
    setSelectedFields(newFields)
  }

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const renderFilterInput = (filter: typeof currentFilters[0]) => {
    const value = filters[filter.value]

    switch (filter.type) {
      case 'select':
        return (
          <Select value={value || 'all'} onValueChange={(v) => updateFilter(filter.value, v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-1">
            {filter.options?.map(opt => (
              <Badge
                key={opt.value}
                variant={(value || []).includes(opt.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  const current = value || []
                  const newValue = current.includes(opt.value)
                    ? current.filter((v: string) => v !== opt.value)
                    : [...current, opt.value]
                  updateFilter(filter.value, newValue.length > 0 ? newValue : undefined)
                }}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        )

      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => updateFilter(filter.value, e.target.value || undefined)}
            placeholder={`Enter ${filter.label.toLowerCase()}...`}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => updateFilter(filter.value, checked || undefined)}
            />
            <span className="text-sm">{value ? 'Yes' : 'No'}</span>
          </div>
        )

      case 'daterange':
        return (
          <div className="flex gap-2">
            <Input
              type="date"
              value={value?.start || ''}
              onChange={(e) => updateFilter(filter.value, { ...value, start: e.target.value })}
              className="flex-1"
            />
            <span className="self-center">to</span>
            <Input
              type="date"
              value={value?.end || ''}
              onChange={(e) => updateFilter(filter.value, { ...value, end: e.target.value })}
              className="flex-1"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Custom Report Builder - {eventName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Template Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">Load Saved Template</Label>
              <div className="flex gap-2">
                <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({DATA_SOURCES[template.reportType]?.label || template.reportType})
                        {template.isPublic && ' 🌐'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <Button variant="destructive" size="icon" onClick={handleDeleteTemplate} disabled={loading}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="w-64">
              <Label className="text-xs text-gray-500">Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATA_SOURCES).map(([key, source]) => (
                    <SelectItem key={key} value={key}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data source description */}
          <p className="text-sm text-gray-500 -mt-2">{currentSource?.description}</p>

          {/* Main Configuration Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fields" className="flex items-center gap-2">
                <Columns className="h-4 w-4" />
                Columns ({selectedFields.length})
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Options
              </TabsTrigger>
            </TabsList>

            {/* Fields Tab */}
            <TabsContent value="fields" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllFields}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={clearAllFields}>Clear All</Button>
                </div>
                <span className="text-sm text-gray-500">{selectedFields.length} fields selected</span>
              </div>

              <div className="flex-1 overflow-hidden flex gap-4">
                {/* Available Fields */}
                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-gray-100 px-3 py-2 border-b font-medium text-sm">Available Fields</div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-4">
                      {Object.entries(fieldsByCategory).map(([category, fields]) => (
                        <div key={category}>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h4>
                          <div className="grid grid-cols-2 gap-1">
                            {fields.map(field => (
                              <label key={field.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedFields.includes(field.value)}
                                  onChange={() => toggleField(field.value)}
                                  className="rounded"
                                />
                                <span className={selectedFields.includes(field.value) ? 'font-medium' : ''}>{field.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected Fields (Ordered) */}
                <div className="w-64 border rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-gray-100 px-3 py-2 border-b font-medium text-sm">Column Order</div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {selectedFields.map((fieldValue, index) => {
                        const field = currentSource?.fields.find(f => f.value === fieldValue)
                        return (
                          <div key={fieldValue} className="flex items-center gap-1 bg-gray-50 rounded p-1.5 text-sm">
                            <GripVertical className="h-3 w-3 text-gray-400" />
                            <span className="flex-1 truncate">{field?.label || fieldValue}</span>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(index, 'down')} disabled={index === selectedFields.length - 1}>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                      {selectedFields.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No fields selected</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="flex-1 overflow-auto mt-4">
              <div className="grid grid-cols-2 gap-4">
                {currentFilters.map(filter => (
                  <div key={filter.value} className="space-y-1">
                    <Label className="text-sm">{filter.label}</Label>
                    {renderFilterInput(filter)}
                  </div>
                ))}
                {currentFilters.length === 0 && (
                  <p className="col-span-2 text-center text-gray-500 py-8">No filters available for this data source</p>
                )}
              </div>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="flex-1 overflow-auto mt-4">
              <div className="space-y-6">
                {/* Grouping */}
                <div className="space-y-2">
                  <Label>Group Results By</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentGroupings.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sorting */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <div className="flex gap-2 max-w-md">
                    <Select value={sortBy || 'none'} onValueChange={(v) => setSortBy(v === 'none' ? '' : v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default Order</SelectItem>
                        {selectedFields.map(fieldValue => {
                          const field = currentSource?.fields.find(f => f.value === fieldValue)
                          return (
                            <SelectItem key={fieldValue} value={fieldValue}>{field?.label || fieldValue}</SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {sortBy && (
                      <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as 'asc' | 'desc')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Save Template */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold">Save as Template</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Youth Roster with Medical Info"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="What this report shows..."
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                    <span className="text-sm">Share with other users in my organization</span>
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSaveTemplate} disabled={loading || !templateName} variant="outline" className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Template
            </Button>
            <Button onClick={handleExecuteReport} disabled={executing || selectedFields.length === 0} className="flex-1 bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
              {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run Report
            </Button>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {templateName || DATA_SOURCES[dataSource]?.label || 'Custom'} Report
                  </h3>
                  <p className="text-sm text-gray-600">
                    {eventName} • {reportData.totalCount || (Array.isArray(reportData.data) ? reportData.data.length : 0)} records • Generated {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    Print/PDF
                  </Button>
                  <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Results Preview */}
              <div className="border rounded-lg overflow-hidden max-h-80">
                <div className="overflow-auto max-h-80">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {selectedFields.map(fieldValue => {
                          const field = currentSource?.fields.find(f => f.value === fieldValue)
                          return (
                            <th key={fieldValue} className="border-b border-gray-300 px-3 py-2 text-left font-medium">
                              {field?.label || fieldValue}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.grouped ? reportData.data.flatMap((g: any) => g.items || g.participants || []) : (Array.isArray(reportData.data) ? reportData.data : [])).slice(0, 100).map((item: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {selectedFields.map(fieldValue => (
                            <td key={fieldValue} className="border-b border-gray-200 px-3 py-2">
                              {getNestedValue(item, fieldValue)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(reportData.totalCount || 0) > 100 && (
                <p className="text-sm text-gray-500 text-center">Showing first 100 of {reportData.totalCount} records. Export to see all.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
