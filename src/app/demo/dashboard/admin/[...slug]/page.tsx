'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Construction, ArrowLeft } from 'lucide-react'

export default function DemoAdminPlaceholder() {
  return (
    <div className="max-w-2xl">
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-8 text-center">
          <Construction className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            This section isn&apos;t in the demo yet
          </h1>
          <p className="text-[#6B7280] mb-6">
            The Org Admin dashboard is the first portal duplicated in the demo. The
            other admin sections (Events, Registrations, Poros, Salve, Rapha, Reports,
            Settings) are being built next and will match the real product exactly.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/demo/dashboard/admin">
              <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                Demo home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
