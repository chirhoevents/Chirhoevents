'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ArrowLeft } from 'lucide-react'

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/dark-logo-horizontal.png"
                alt="ChiRho Events"
                width={200}
                height={60}
                className="h-10 md:h-14 w-auto"
                priority
              />
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#9C8466]/10 rounded-full mb-6">
                <Calendar className="h-10 w-10 text-[#9C8466]" />
              </div>

              <h1 className="text-3xl font-bold text-[#1E3A5F] mb-4">
                Event Listing - Coming Soon
              </h1>

              <p className="text-lg text-[#6B7280] mb-8">
                We&apos;re working on a comprehensive event listing page.
                For now, please use your direct event registration link.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-8 text-left">
                <p className="text-sm text-blue-900">
                  <strong>Have a registration link?</strong> Your event organizer
                  should have provided you with a direct link to register for your specific event.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
                <a href="#contact">
                  <Button className="w-full sm:w-auto">
                    Contact Support
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
