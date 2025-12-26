'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'

interface ScheduleEntry {
  id: string
  day: string
  startTime: string
  endTime: string | null
  title: string
  location: string | null
}

interface MealTime {
  id: string
  day: string
  meal: string
  color: string
  time: string
}

interface Resource {
  id: string
  name: string
  type: string
  url: string
}

interface Props {
  event: {
    id: string
    name: string
    startDate: string
    endDate: string | null
    locationName: string | null
  }
  scheduleByDay: Record<string, ScheduleEntry[]>
  mealTimes: MealTime[]
  resources: Resource[]
  seatingEnabled: boolean
  schedulePdfUrl: string | null
}

const MEAL_COLORS: Record<string, string> = {
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  purple: '#9b59b6',
  brown: '#8b4513',
  grey: '#95a5a6',
  gray: '#95a5a6',
}

export default function PorosPublicClient({
  event,
  scheduleByDay,
  mealTimes,
  resources,
  seatingEnabled,
  schedulePdfUrl
}: Props) {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // Organize meal times by day
  const mealTimesByDay = mealTimes.reduce((acc, mt) => {
    if (!acc[mt.day]) acc[mt.day] = []
    acc[mt.day].push(mt)
    return acc
  }, {} as Record<string, MealTime[]>)

  // Get unique colors
  const uniqueColors = [...new Set(mealTimes.map(mt => mt.color))]

  const closeModal = () => setActiveModal(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#0f1f33]">
      {/* Header */}
      <header className="bg-[#1E3A5F] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/poros/public" className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 text-center">
              <Image
                src="/light-logo-horizontal.png"
                alt="ChiRho Events"
                width={140}
                height={35}
                className="h-8 w-auto inline-block"
              />
            </div>
            <div className="w-6" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Event Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{event.name}</h1>
          <p className="text-white/70 text-sm">
            {format(new Date(event.startDate), 'MMMM d')}
            {event.endDate && ` - ${format(new Date(event.endDate), 'd, yyyy')}`}
          </p>
          {event.locationName && (
            <p className="text-white/50 text-sm mt-1">{event.locationName}</p>
          )}
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Schedule */}
          <button
            onClick={() => setActiveModal('schedule')}
            className="portal-button bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Schedule</span>
          </button>

          {/* Meal Times */}
          <button
            onClick={() => setActiveModal('meals')}
            className="portal-button bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Meal Times</span>
          </button>

          {/* Resources */}
          <button
            onClick={() => setActiveModal('resources')}
            className="portal-button bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Resources</span>
          </button>

          {/* Info / Seating */}
          <button
            onClick={() => setActiveModal('info')}
            className="portal-button bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">Info</span>
          </button>
        </div>

        {/* Quick Links from Resources */}
        {resources.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 text-center">Quick Links</h3>
            <div className="space-y-2">
              {resources.slice(0, 4).map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    {resource.type === 'map' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </div>
                  <span className="text-white font-medium flex-1">{resource.name}</span>
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Add to Home Screen */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
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

      {/* Schedule Modal */}
      {activeModal === 'schedule' && (
        <Modal onClose={closeModal} title="Schedule">
          {schedulePdfUrl ? (
            <div className="text-center">
              <a
                href={schedulePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Schedule PDF
              </a>
            </div>
          ) : Object.keys(scheduleByDay).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(scheduleByDay).map(([day, entries]) => (
                <div key={day}>
                  <h4 className="font-bold text-lg mb-3 capitalize text-[#1E3A5F]">{day}</h4>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-semibold text-blue-600 w-20 flex-shrink-0">
                          {entry.startTime}
                          {entry.endTime && ` - ${entry.endTime}`}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{entry.title}</div>
                          {entry.location && (
                            <div className="text-sm text-gray-500">{entry.location}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Schedule information coming soon!
            </p>
          )}
        </Modal>
      )}

      {/* Meal Times Modal */}
      {activeModal === 'meals' && (
        <Modal onClose={closeModal} title="Meal Times">
          {mealTimes.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(mealTimesByDay).map(([day, times]) => (
                <div key={day}>
                  <h4 className="font-bold text-lg mb-3 capitalize text-[#1E3A5F]">{day}</h4>
                  <div className="space-y-2">
                    {['breakfast', 'lunch', 'dinner'].map((meal) => {
                      const mealEntries = times.filter(t => t.meal === meal)
                      if (mealEntries.length === 0) return null
                      return (
                        <div key={meal} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-semibold capitalize mb-2">{meal}</div>
                          <div className="flex flex-wrap gap-2">
                            {mealEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                                style={{ backgroundColor: MEAL_COLORS[entry.color.toLowerCase()] || '#6b7280' }}
                              >
                                {entry.color}: {entry.time}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Meal times will be posted soon!
            </p>
          )}
        </Modal>
      )}

      {/* Resources Modal */}
      {activeModal === 'resources' && (
        <Modal onClose={closeModal} title="Resources">
          {resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#1E3A5F] rounded-lg flex items-center justify-center flex-shrink-0">
                    {resource.type === 'map' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ) : resource.type === 'pdf' ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1E3A5F]">{resource.name}</div>
                    <div className="text-sm text-gray-500 capitalize">{resource.type}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No resources available yet.
            </p>
          )}
        </Modal>
      )}

      {/* Info Modal */}
      {activeModal === 'info' && (
        <Modal onClose={closeModal} title="Event Information">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-semibold text-[#1E3A5F] mb-2">Event Details</h4>
              <p className="text-gray-600">{event.name}</p>
              <p className="text-gray-500 text-sm mt-1">
                {format(new Date(event.startDate), 'MMMM d, yyyy')}
                {event.endDate && ` - ${format(new Date(event.endDate), 'MMMM d, yyyy')}`}
              </p>
              {event.locationName && (
                <p className="text-gray-500 text-sm">{event.locationName}</p>
              )}
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-800 mb-2">Need Help?</h4>
              <p className="text-blue-600 text-sm">
                If you have questions about the event, please contact your group leader or the event organizers.
              </p>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .portal-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-radius: 1.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .portal-button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  )
}

// Modal Component
function Modal({
  onClose,
  title,
  children
}: {
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#1E3A5F]">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
