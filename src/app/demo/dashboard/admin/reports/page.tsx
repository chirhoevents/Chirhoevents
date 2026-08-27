'use client'

import AllReportsClient from './AllReportsClient'

export default function AllReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Reports</h1>
        <p className="text-[#6B7280]">
          Generate reports and analytics for your events
        </p>
      </div>

      <AllReportsClient />
    </div>
  )
}
