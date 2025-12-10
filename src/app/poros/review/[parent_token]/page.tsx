'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface FormData {
  participantFirstName: string
  participantLastName: string
  participantPreferredName?: string
  participantAge: number
  participantGender: string
  tShirtSize: string
  medicalConditions?: string
  medications?: string
  allergies?: string
  dietaryRestrictions?: string
  adaAccommodations?: string
  emergencyContact1Name: string
  emergencyContact1Phone: string
  emergencyContact1Relation: string
  emergencyContact2Name?: string
  emergencyContact2Phone?: string
  emergencyContact2Relation?: string
  insuranceProvider: string
  insurancePolicyNumber: string
  insuranceGroupNumber?: string
  signatureData: {
    full_legal_name: string
    initials: string
    date_signed: string
    ip_address: string
  }
  completedAt: string
  eventName: string
  groupName: string
}

export default function ReviewSubmittedForm() {
  const params = useParams()
  const parentToken = params.parent_token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)

  useEffect(() => {
    async function loadFormData() {
      try {
        const response = await fetch('/api/liability/youth-u18/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_token: parentToken }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load form')
        }

        const data = await response.json()
        setFormData(data.form_data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }

    if (parentToken) {
      loadFormData()
    }
  }, [parentToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
          <p className="text-navy font-medium">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Unable to Load Form</h2>
          <p className="text-gray-600">{error || 'Form not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Image
              src="/Poros logo.png"
              alt="Poros - ChiRho Events"
              width={350}
              height={105}
              className="h-16 md:h-20 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-navy mb-2">Submitted Liability Form</h1>
            <p className="text-gray-600">Review of completed form for {formData.participantFirstName} {formData.participantLastName}</p>
            <p className="text-sm text-gray-500 mt-2">
              Submitted on {new Date(formData.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gold/10 border-2 border-gold rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-navy mb-2">Important Notice</h3>
              <p className="text-gray-700 mb-2">
                <strong>Once submitted, this form cannot be edited.</strong> This is a read-only view of your submitted information.
              </p>
              <p className="text-gray-700">
                If you believe a mistake was made, please <strong>contact your group leader immediately</strong> to make the necessary changes. Your group leader will need to delete this form and have you complete a new one.
              </p>
            </div>
          </div>
        </div>

        {/* Event Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">Event Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Event</p>
              <p className="text-gray-900">{formData.eventName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Group</p>
              <p className="text-gray-900">{formData.groupName}</p>
            </div>
          </div>
        </div>

        {/* Participant Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">Participant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">First Name</p>
              <p className="text-gray-900">{formData.participantFirstName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Last Name</p>
              <p className="text-gray-900">{formData.participantLastName}</p>
            </div>
            {formData.participantPreferredName && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Preferred Name</p>
                <p className="text-gray-900">{formData.participantPreferredName}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-600">Age</p>
              <p className="text-gray-900">{formData.participantAge}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Gender</p>
              <p className="text-gray-900 capitalize">{formData.participantGender}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">T-Shirt Size</p>
              <p className="text-gray-900">{formData.tShirtSize}</p>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">Medical Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Medical Conditions</p>
              <p className="text-gray-900">{formData.medicalConditions || 'None reported'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Current Medications</p>
              <p className="text-gray-900">{formData.medications || 'None reported'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Allergies</p>
              <p className="text-gray-900 font-medium">{formData.allergies || 'None reported'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Dietary Restrictions</p>
              <p className="text-gray-900">{formData.dietaryRestrictions || 'None reported'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">ADA Accommodations Needed</p>
              <p className="text-gray-900">{formData.adaAccommodations || 'None reported'}</p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">Emergency Contacts</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-navy mb-3">Primary Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Name</p>
                  <p className="text-gray-900">{formData.emergencyContact1Name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Phone</p>
                  <p className="text-gray-900">{formData.emergencyContact1Phone}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Relationship</p>
                  <p className="text-gray-900">{formData.emergencyContact1Relation}</p>
                </div>
              </div>
            </div>
            {formData.emergencyContact2Name && (
              <div>
                <h3 className="font-semibold text-navy mb-3">Secondary Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Name</p>
                    <p className="text-gray-900">{formData.emergencyContact2Name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Phone</p>
                    <p className="text-gray-900">{formData.emergencyContact2Phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Relationship</p>
                    <p className="text-gray-900">{formData.emergencyContact2Relation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Insurance Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">Insurance Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Insurance Provider</p>
              <p className="text-gray-900">{formData.insuranceProvider}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Policy Number</p>
              <p className="text-gray-900">{formData.insurancePolicyNumber}</p>
            </div>
            {formData.insuranceGroupNumber && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Group Number</p>
                <p className="text-gray-900">{formData.insuranceGroupNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Signature Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">E-Signature & Consent</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">Signed By (Full Legal Name)</p>
                <p className="text-gray-900 font-medium">{formData.signatureData.full_legal_name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Initials</p>
                <p className="text-gray-900 font-medium">{formData.signatureData.initials}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Date Signed</p>
                <p className="text-gray-900">{new Date(formData.signatureData.date_signed).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">IP Address</p>
                <p className="text-gray-900 text-xs">{formData.signatureData.ip_address}</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-green-800">
                ✓ Medical Treatment Consent<br/>
                ✓ Activity Participation & Liability Waiver<br/>
                ✓ Photo & Media Release<br/>
                ✓ Transportation Authorization
              </p>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.print()}
            className="bg-navy text-white px-8 py-3 rounded-lg font-semibold hover:bg-navy/90 transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Form
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © 2025 ChiRho Events. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
