'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Profile
        </h1>
        <p className="text-[#6B7280]">
          Manage your account settings and preferences
        </p>
      </div>

      <Card className="p-12 text-center bg-white border-[#D1D5DB]">
        <User className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
          Profile Settings
        </h2>
        <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
          Manage your personal information, password, and account preferences.
        </p>
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
