'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function YouthO18ChaperoneForm() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    participantType: '',
    tShirtSize: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    dietaryRestrictions: '',
    adaAccommodations: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceGroupNumber: '',
    safeEnvCertOption: '',
    safeEnvCertProgram: '',
    safeEnvCertCompletionDate: '',
    safeEnvCertExpirationDate: '',
    consentMedical: false,
    consentActivity: false,
    consentPhoto: false,
    consentTransportation: false,
    signatureFullName: '',
    signatureInitials: '',
    certifyAccurate: false,
  })

  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setCertificateFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    const age = parseInt(formData.age)
    if (age < 18) {
      setError('Age must be 18 or older for this form type')
      return
    }

    if (!formData.participantType) {
      setError('Please select participant type (Youth 18+ or Chaperone)')
      return
    }

    if (formData.participantType === 'chaperone' && !formData.safeEnvCertOption) {
      setError('Please select a safe environment certificate option')
      return
    }

    if (formData.safeEnvCertOption === 'upload_now' && !certificateFile) {
      setError('Please upload your safe environment certificate')
      return
    }

    if (!formData.consentMedical || !formData.consentActivity ||
        !formData.consentPhoto || !formData.consentTransportation) {
      setError('All consent checkboxes must be checked')
      return
    }

    if (!formData.certifyAccurate) {
      setError('You must certify that the information is accurate')
      return
    }

    // Validate initials match name
    const nameParts = formData.signatureFullName.trim().split(' ')
    if (nameParts.length < 2) {
      setError('Please enter your full legal name (first and last name)')
      return
    }
    const expectedInitials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    if (formData.signatureInitials.toUpperCase() !== expectedInitials) {
      setError(`Initials should be ${expectedInitials} based on your name`)
      return
    }

    setLoading(true)

    try {
      // Convert file to base64 if present
      let certificateFileData = null
      if (certificateFile) {
        const reader = new FileReader()
        certificateFileData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(certificateFile)
        })
      }

      const response = await fetch('/api/liability/youth-o18-chaperone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          first_name: formData.firstName,
          last_name: formData.lastName,
          preferred_name: formData.preferredName || null,
          age: parseInt(formData.age),
          gender: formData.gender,
          email: formData.email,
          phone: formData.phone,
          participant_type: formData.participantType,
          t_shirt_size: formData.tShirtSize,
          medical_conditions: formData.medicalConditions || null,
          medications: formData.medications || null,
          allergies: formData.allergies || null,
          dietary_restrictions: formData.dietaryRestrictions || null,
          ada_accommodations: formData.adaAccommodations || null,
          emergency_contact_1_name: formData.emergencyContact1Name,
          emergency_contact_1_phone: formData.emergencyContact1Phone,
          emergency_contact_1_relation: formData.emergencyContact1Relation,
          emergency_contact_2_name: formData.emergencyContact2Name || null,
          emergency_contact_2_phone: formData.emergencyContact2Phone || null,
          emergency_contact_2_relation: formData.emergencyContact2Relation || null,
          insurance_provider: formData.insuranceProvider,
          insurance_policy_number: formData.insurancePolicyNumber,
          insurance_group_number: formData.insuranceGroupNumber || null,
          safe_env_cert_file: certificateFileData,
          safe_env_cert_filename: certificateFile?.name || null,
          safe_env_cert_program: formData.safeEnvCertProgram || null,
          safe_env_cert_completion_date: formData.safeEnvCertCompletionDate || null,
          safe_env_cert_expiration_date: formData.safeEnvCertExpirationDate || null,
          safe_env_cert_upload_later: formData.safeEnvCertOption === 'upload_later',
          signature_full_name: formData.signatureFullName,
          signature_initials: formData.signatureInitials,
          signature_date: new Date().toISOString(),
          certify_accurate: formData.certifyAccurate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
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

        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-navy mb-4">✅ Thank You!</h1>
            <p className="text-gray-700 mb-6">
              Your liability form has been submitted successfully.
            </p>
            <p className="text-gray-600 mb-8">
              A confirmation email has been sent to {formData.email}.
            </p>
            <button
              onClick={() => router.push(`/poros/${accessCode}`)}
              className="bg-navy text-white px-8 py-3 rounded-lg font-semibold hover:bg-navy/90 transition-colors"
            >
              Back to Portal
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-navy mb-2">Youth 18+ / Chaperone Liability Form</h1>
          <p className="text-gray-600">Please complete all sections below</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              1. Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  min="18"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="(XXX) XXX-XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  T-Shirt Size <span className="text-red-500">*</span>
                </label>
                <select
                  name="tShirtSize"
                  value={formData.tShirtSize}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                  <option value="XL">X-Large</option>
                  <option value="2XL">2X-Large</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Participant Type <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="participantType"
                    value="youth_o18"
                    checked={formData.participantType === 'youth_o18'}
                    onChange={handleInputChange}
                    required
                    className="mr-2"
                  />
                  <span>Youth (18+)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="participantType"
                    value="chaperone"
                    checked={formData.participantType === 'chaperone'}
                    onChange={handleInputChange}
                    required
                    className="mr-2"
                  />
                  <span>Chaperone</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: Medical Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              2. Medical Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medical Conditions
                </label>
                <textarea
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="List any medical conditions we should be aware of"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Medications
                </label>
                <textarea
                  name="medications"
                  value={formData.medications}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="List all medications currently being taken"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="inline-flex items-center">
                    Allergies
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">IMPORTANT</span>
                  </span>
                </label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="List any allergies (food, medication, environmental, etc.)"
                  className="w-full px-4 py-2 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dietary Restrictions
                </label>
                <textarea
                  name="dietaryRestrictions"
                  value={formData.dietaryRestrictions}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Any dietary restrictions or preferences"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ADA Accommodations Needed
                </label>
                <textarea
                  name="adaAccommodations"
                  value={formData.adaAccommodations}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Any accessibility accommodations needed"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Emergency Contacts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              3. Emergency Contacts
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-navy mb-3">Primary Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyContact1Name"
                      value={formData.emergencyContact1Name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact1Phone"
                      value={formData.emergencyContact1Phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyContact1Relation"
                      value={formData.emergencyContact1Relation}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Spouse, Parent"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-3">Secondary Emergency Contact (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      name="emergencyContact2Name"
                      value={formData.emergencyContact2Name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="emergencyContact2Phone"
                      value={formData.emergencyContact2Phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                    <input
                      type="text"
                      name="emergencyContact2Relation"
                      value={formData.emergencyContact2Relation}
                      onChange={handleInputChange}
                      placeholder="e.g., Sibling, Friend"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Insurance Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              4. Insurance Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Insurance Provider <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Blue Cross Blue Shield"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group Number
                </label>
                <input
                  type="text"
                  name="insuranceGroupNumber"
                  value={formData.insuranceGroupNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Safe Environment Certificate (Chaperones Only) */}
          {formData.participantType === 'chaperone' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
                5. Safe Environment Certification
              </h2>
              <p className="text-gray-700 mb-4">
                As a chaperone, you must have completed safe environment training (e.g., VIRTUS, Protecting God&apos;s Children)
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="safeEnvCertOption"
                      value="upload_now"
                      checked={formData.safeEnvCertOption === 'upload_now'}
                      onChange={handleInputChange}
                      required
                      className="mr-2 mt-1"
                    />
                    <span className="font-medium">I&apos;ll upload my certificate now</span>
                  </label>

                  {formData.safeEnvCertOption === 'upload_now' && (
                    <div className="ml-6 space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Certificate File (PDF only) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="w-full"
                        />
                        {certificateFile && (
                          <p className="text-sm text-green-600 mt-2">✓ {certificateFile.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Program Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="safeEnvCertProgram"
                          value={formData.safeEnvCertProgram}
                          onChange={handleInputChange}
                          required={formData.safeEnvCertOption === 'upload_now'}
                          placeholder="e.g., VIRTUS Training"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Completion Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="safeEnvCertCompletionDate"
                            value={formData.safeEnvCertCompletionDate}
                            onChange={handleInputChange}
                            required={formData.safeEnvCertOption === 'upload_now'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Expiration Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="safeEnvCertExpirationDate"
                            value={formData.safeEnvCertExpirationDate}
                            onChange={handleInputChange}
                            required={formData.safeEnvCertOption === 'upload_now'}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="safeEnvCertOption"
                      value="upload_later"
                      checked={formData.safeEnvCertOption === 'upload_later'}
                      onChange={handleInputChange}
                      required
                      className="mr-2 mt-1"
                    />
                    <div>
                      <span className="font-medium">I&apos;ll upload my certificate later</span>
                      <p className="text-sm text-gray-600 mt-1">
                        You can upload your certificate through the Group Leader Portal after registration
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: E-Signature & Consent */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy mb-4 pb-2 border-b-2 border-gold">
              {formData.participantType === 'chaperone' ? '6' : '5'}. E-Signature & Consent
            </h2>

            <div className="space-y-4 mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consentMedical"
                  checked={formData.consentMedical}
                  onChange={handleInputChange}
                  required
                  className="mr-3 mt-1"
                />
                <div>
                  <span className="font-semibold">Medical Treatment Consent</span>
                  <p className="text-sm text-gray-600">
                    I authorize event staff to obtain necessary medical treatment in case of emergency
                  </p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consentActivity"
                  checked={formData.consentActivity}
                  onChange={handleInputChange}
                  required
                  className="mr-3 mt-1"
                />
                <div>
                  <span className="font-semibold">Activity Participation & Liability Waiver</span>
                  <p className="text-sm text-gray-600">
                    I understand the risks and release the organization from liability
                  </p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consentPhoto"
                  checked={formData.consentPhoto}
                  onChange={handleInputChange}
                  required
                  className="mr-3 mt-1"
                />
                <div>
                  <span className="font-semibold">Photo & Media Release</span>
                  <p className="text-sm text-gray-600">
                    I consent to use of photos/videos for promotional purposes
                  </p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="consentTransportation"
                  checked={formData.consentTransportation}
                  onChange={handleInputChange}
                  required
                  className="mr-3 mt-1"
                />
                <div>
                  <span className="font-semibold">Transportation Authorization</span>
                  <p className="text-sm text-gray-600">
                    I authorize transportation to/from event activities
                  </p>
                </div>
              </label>
            </div>

            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="signatureFullName"
                    value={formData.signatureFullName}
                    onChange={handleInputChange}
                    required
                    placeholder="Type your full legal name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Initials <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="signatureInitials"
                    value={formData.signatureInitials}
                    onChange={handleInputChange}
                    required
                    maxLength={3}
                    placeholder="e.g., JD"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-transparent"
                  />
                </div>
              </div>

              <label className="flex items-start mb-6">
                <input
                  type="checkbox"
                  name="certifyAccurate"
                  checked={formData.certifyAccurate}
                  onChange={handleInputChange}
                  required
                  className="mr-3 mt-1"
                />
                <span className="font-semibold">
                  I certify that all information provided is accurate and complete
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white py-4 rounded-lg font-bold text-lg hover:bg-navy/90 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Sign and Submit Form'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
