'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function RoleSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const accessCode = params.accessCode as string

  const roles = [
    {
      type: 'youth_u18',
      title: 'Youth Under 18',
      description: 'Ages 12-17',
      details: 'Parent consent required',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
      iconColor: 'text-blue-600',
    },
    {
      type: 'youth_o18_chaperone',
      title: 'Youth 18+ or Chaperone',
      description: 'Ages 18+',
      details: 'Self-completion',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400',
      iconColor: 'text-green-600',
    },
    {
      type: 'clergy',
      title: 'Priest/Deacon',
      description: 'Clergy only',
      details: 'Special form',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
      iconColor: 'text-purple-600',
    },
  ]

  const handleRoleSelect = (roleType: string) => {
    // TODO: Navigate to the appropriate form based on role type
    router.push(`/portal/${accessCode}/forms/${roleType}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <div className="bg-navy py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Image
              src="/logo-horizontal.png"
              alt="ChiRho Events"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-navy hover:text-navy/80 mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Portal
          </button>

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy mb-3">Select Form Type</h1>
            <p className="text-lg text-gray-600">Who are you filling out a form for?</p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <button
                key={role.type}
                onClick={() => handleRoleSelect(role.type)}
                className={`${role.bgColor} border-2 ${role.borderColor} ${role.hoverColor} rounded-xl p-8 text-center transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1`}
              >
                <div className={`flex justify-center ${role.iconColor} mb-4`}>
                  {role.icon}
                </div>
                <h2 className="text-2xl font-bold text-navy mb-2">{role.title}</h2>
                <p className="text-gray-700 font-medium mb-1">{role.description}</p>
                <p className="text-sm text-gray-600 mb-6">{role.details}</p>
                <div className="flex items-center justify-center text-navy font-medium">
                  Continue
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Help Text */}
          <div className="mt-12 bg-gold/10 border border-gold rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-navy mb-2">Need Help Choosing?</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>Youth Under 18:</strong> If the participant is between ages 12-17, select this option. A parent will need to complete and sign the form.</li>
                  <li><strong>Youth 18+ or Chaperone:</strong> If the participant is 18 or older (including adult chaperones), select this option. The participant can complete the form themselves.</li>
                  <li><strong>Priest/Deacon:</strong> Only for clergy members attending the event. This form has specialized fields for clergy information.</li>
                </ul>
              </div>
            </div>
          </div>
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
