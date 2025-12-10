'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Safe Environment Certificates
        </h1>
        <p className="text-[#6B7280]">
          Manage safe environment training certificates for chaperones
        </p>
      </div>

      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <Shield className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          Certificate Management
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Upload and track safe environment training certificates for all chaperones. View verification status and expiration dates.
        </p>
        <div className="flex justify-center space-x-4">
          <Button className="bg-[#9C8466] hover:bg-[#8B7355] text-white" disabled>
            Upload Certificate
          </Button>
          <Button variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]" disabled>
            View All
          </Button>
        </div>
        <p className="text-sm text-[#6B7280] mt-4">
          Coming soon...
        </p>
      </Card>
    </div>
  )
}
