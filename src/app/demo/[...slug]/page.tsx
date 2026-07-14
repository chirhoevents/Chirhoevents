'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Construction, ArrowLeft } from 'lucide-react'

export default function DemoPlaceholder() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-8 text-center">
          <Construction className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            This portal isn&apos;t in the demo yet
          </h1>
          <p className="text-[#6B7280] mb-6">
            The Organization Admin dashboard is the first portal that&apos;s
            been fully duplicated. The other portals (Group Leader, Salve,
            Rapha, Poros, Vendor, public registration, liability) are being
            built next and will match the real product exactly — same
            components, same layout, same interactions.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/demo/dashboard/admin">
              <Button className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                Try the Admin Dashboard
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Demo home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
