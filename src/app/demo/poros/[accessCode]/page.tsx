'use client'

import { useParams, useRouter, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const CODES: Record<string, any> = {
  'M2K2026-STMARY-ABC1': { type: 'group', displayName: "St. Mary's Youth Group", eventName: 'Summer Youth Retreat 2026' },
  'M2K2026-SJP2-XYZ2': { type: 'group', displayName: 'St. John Paul II Parish', eventName: 'Summer Youth Retreat 2026' },
  'IND-EMMA-2026': { type: 'individual', displayName: 'Emma Johnson', eventName: 'Summer Youth Retreat 2026', autoFormType: 'youth-u18' },
  'IND-TOM-2026': { type: 'individual', displayName: 'Thomas Wright', eventName: "Men's Silent Retreat", autoFormType: 'youth-o18-chaperone' },
  'STF-KELLY-2026': { type: 'staff', displayName: 'Kelly Rivera', eventName: 'Summer Youth Retreat 2026', autoFormType: 'youth-o18-chaperone' },
}

export default function PorosRoleSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const accessCode = (params?.accessCode as string) || ''
  const info = CODES[accessCode]

  if (!info) notFound()

  const roles = [
    {
      type: 'youth-u18',
      title: 'Youth Under 18',
      description: 'Ages 12-17',
      details: 'Parent consent required',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
      iconColor: 'text-blue-600',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      type: 'youth-o18-chaperone',
      title: 'Youth 18+ or Chaperone',
      description: 'Ages 18+',
      details: 'Self-completion',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:border-green-400',
      iconColor: 'text-green-600',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      type: 'clergy',
      title: 'Clergy & Religious',
      description: 'Priest, Deacon, Seminarian, Sister, or Brother',
      details: 'You will select your specific title on the next page',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
      iconColor: 'text-purple-600',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ]

  // For individual and staff, auto-continue
  if (info.type !== 'group') {
    return (
      <div className="min-h-[calc(100vh-36px)] bg-gray-50">
        <div className="bg-[#1E3A5F] py-6 shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <Link href="/demo/poros">
                <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={280} height={84} className="h-14 md:h-16 w-auto" />
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-3">
              Welcome, {info.displayName}
            </h1>
            <p className="text-gray-600 mb-6">
              Since you registered {info.type === 'staff' ? 'as staff' : 'individually'}, we already know which form
              you need. Click below to continue to your <strong>{info.autoFormType === 'youth-u18' ? 'Youth Under 18' : 'Youth 18+ / Chaperone'}</strong> waiver.
            </p>
            <button
              onClick={() => router.push(`/demo/poros/${accessCode}/forms/${info.autoFormType}/new`)}
              className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white px-8 py-3 rounded-lg font-semibold"
            >
              Continue to Form
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-36px)] bg-gray-50">
      <div className="bg-[#1E3A5F] py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Link href="/demo/poros">
              <Image src="/light-logo-horizontal.png" alt="ChiRho Events" width={280} height={84} className="h-14 md:h-16 w-auto" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#9C8466] text-sm uppercase tracking-widest mb-2">{info.displayName} · {info.eventName}</p>
            <h1 className="text-4xl font-bold text-[#1E3A5F] mb-3">Who are you?</h1>
            <p className="text-lg text-gray-600">Select the role that applies to you to open the correct liability form.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((role) => (
              <button
                key={role.type}
                onClick={() => router.push(`/demo/poros/${accessCode}/forms/${role.type}/new`)}
                className={`${role.bgColor} border-2 ${role.borderColor} ${role.hoverColor} rounded-xl p-6 text-left transition-all hover:shadow-lg`}
              >
                <div className={`${role.iconColor} mb-4`}>{role.icon}</div>
                <h3 className="text-xl font-bold text-[#1E3A5F] mb-1">{role.title}</h3>
                <p className="text-sm text-gray-700 font-medium">{role.description}</p>
                <p className="text-xs text-gray-600 mt-2">{role.details}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/demo/poros" className="text-sm text-[#1E3A5F] hover:underline">
              ← Different access code?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
