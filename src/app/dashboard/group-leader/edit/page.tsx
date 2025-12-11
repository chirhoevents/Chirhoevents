'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EditRegistrationPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Edit Registration
        </h1>
        <p className="text-[#6B7280]">
          Update your group registration details
        </p>
      </div>

      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <Edit className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          Edit Registration Details
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Update your group information, contact details, participant counts, and special requests.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6 text-left max-w-md mx-auto">
          <p className="text-sm text-yellow-900">
            <strong>Note:</strong> Changes to participant counts may affect your total registration cost.
            Contact support for pricing adjustments.
          </p>
        </div>
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-[#1E3A5F] text-[#1E3A5F]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
        <p className="text-sm text-[#6B7280] mt-4">
          Coming soon...
        </p>
      </Card>
    </div>
  )
}
