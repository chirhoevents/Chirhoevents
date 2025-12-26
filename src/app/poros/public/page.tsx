import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

export const metadata = {
  title: 'Poros Portal - Event Resources',
  description: 'Access event resources, schedules, and meal times',
}

export default async function PorosPublicLandingPage() {
  // Fetch events that have public portal enabled - with defensive error handling
  let events: any[] = []
  try {
    events = await prisma.event.findMany({
      where: {
        status: { in: ['registration_open', 'registration_closed', 'in_progress'] },
        settings: {
          porosPublicPortalEnabled: true
        }
      },
      include: {
        settings: true,
        organization: {
          select: { name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    })
  } catch (error) {
    console.error('Error fetching events with settings filter:', error)
    // Fallback: just get active events without filtering on settings
    try {
      events = await prisma.event.findMany({
        where: {
          status: { in: ['registration_open', 'registration_closed', 'in_progress'] }
        },
        include: {
          settings: true,
          organization: {
            select: { name: true }
          }
        },
        orderBy: { startDate: 'asc' }
      })
      // Filter in memory if settings exist
      events = events.filter(e => e.settings?.porosPublicPortalEnabled === true)
    } catch (innerError) {
      console.error('Error with fallback query:', innerError)
      events = []
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#0f1f33]">
      {/* Header */}
      <header className="bg-[#1E3A5F] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
          <Image
            src="/light-logo-horizontal.png"
            alt="ChiRho Events"
            width={180}
            height={45}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Poros Portal</h1>
          <p className="text-white/70">Select your event to view resources</p>
        </div>

        {events.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Active Events</h2>
            <p className="text-white/60">
              There are no events with the public portal enabled at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/poros/public/${event.id}`}
                className="block bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#1E3A5F] to-[#3b5998] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1E3A5F] text-lg truncate">{event.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {format(new Date(event.startDate), 'MMM d')}
                      {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                    </p>
                    {event.locationName && (
                      <p className="text-gray-400 text-sm truncate">{event.locationName}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Add to Home Screen hint */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
          <p className="text-white/80 text-sm">
            <span className="font-semibold">Tip:</span> Add this page to your home screen for quick access!
          </p>
          <p className="text-white/50 text-xs mt-1">
            Tap the share button and select &quot;Add to Home Screen&quot;
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-white/40 text-sm">
          Powered by ChiRho Events
        </p>
      </footer>
    </div>
  )
}
