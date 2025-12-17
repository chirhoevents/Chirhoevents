'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LinkedEvent {
  id: string
  accessCode: string
  eventName: string
  eventDates: string
  groupName: string
}

interface EventContextType {
  selectedEventId: string
  setSelectedEventId: (id: string) => void
  linkedEvents: LinkedEvent[]
  setLinkedEvents: (events: LinkedEvent[]) => void
  currentEvent: LinkedEvent | null
  refreshEvents: () => Promise<void>
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export function EventProvider({ children }: { children: ReactNode }) {
  const [selectedEventId, setSelectedEventIdState] = useState<string>('')
  const [linkedEvents, setLinkedEvents] = useState<LinkedEvent[]>([])

  // Load selected event ID from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('selectedEventId')
    if (savedEventId) {
      setSelectedEventIdState(savedEventId)
    }
  }, [])

  // Save selected event ID to localStorage when it changes
  const setSelectedEventId = (id: string) => {
    setSelectedEventIdState(id)
    localStorage.setItem('selectedEventId', id)

    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('eventChanged', { detail: { eventId: id } }))
  }

  const currentEvent = linkedEvents.find((e) => e.id === selectedEventId) || null

  const refreshEvents = async () => {
    try {
      const response = await fetch('/api/group-leader/settings')
      if (response.ok) {
        const data = await response.json()
        setLinkedEvents(data.linkedEvents || [])

        // If no event is selected, select the first one
        if (!selectedEventId && data.linkedEvents && data.linkedEvents.length > 0) {
          setSelectedEventId(data.linkedEvents[0].id)
        }
      }
    } catch (error) {
      console.error('Error refreshing events:', error)
    }
  }

  return (
    <EventContext.Provider
      value={{
        selectedEventId,
        setSelectedEventId,
        linkedEvents,
        setLinkedEvents,
        currentEvent,
        refreshEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider')
  }
  return context
}
