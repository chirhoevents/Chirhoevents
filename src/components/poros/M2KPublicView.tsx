'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'

// Types for the JSON data structure
interface YouthGroup {
  id: string
  dbId?: string // Unique database UUID for React keys
  groupCode?: string // Check-in table code like "53B"
  parish: string
  leader: string
  phone: string
  maleTeens: number
  femaleTeens: number
  maleChaperones: number
  femaleChaperones: number
  seminarianSgl?: string
  religious?: string
  stayingOffCampus?: boolean
  specialAccommodations?: string
}

interface MealTimes {
  satBreakfast?: string
  satLunch?: string
  satDinner?: string
  sunBreakfast?: string
  colorHex?: string
}

interface ScheduleEvent {
  startTime: string
  endTime?: string
  event: string
  location?: string
}

interface Resource {
  name: string
  emoji: string
  url: string
}

interface M2KData {
  youthGroups: YouthGroup[]
  rooms?: any[]
  housingAssignments?: {
    male: Record<string, string[]>
    female: Record<string, string[]>
  }
  smallGroupAssignments?: Record<string, string[]>
  mealColorAssignments?: Record<string, string>
  mealTimes?: Record<string, MealTimes>
  adaIndividuals?: { groupId: string; roomAssignment: string }[]
  resources?: Resource[]
  schedule?: {
    friday?: ScheduleEvent[]
    saturday?: ScheduleEvent[]
    sunday?: ScheduleEvent[]
  }
  activeColors?: string[]
  conferenceStartDate?: string
  dashboardSubtitle?: string
}

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'urgent'
  startDate: string | null
  endDate: string | null
}

interface Confession {
  id: string
  day: string
  startTime: string
  endTime: string | null
  location: string
  description: string | null
}

interface InfoItem {
  id: string
  title: string
  content: string
  type: string
  url: string | null
}

interface Props {
  event: {
    id: string
    name: string
    startDate: string
    endDate: string | null
    locationName: string | null
  }
  data: M2KData
  announcements?: Announcement[]
  confessions?: Confession[]
  reconciliationGuideUrl?: string | null
  infoItems?: InfoItem[]
}

// Color map for meal colors
const MEAL_COLOR_STYLES: Record<string, { background: string; color: string }> = {
  'Red': { background: '#e74c3c', color: 'white' },
  'Blue': { background: '#3498db', color: 'white' },
  'Green': { background: '#27ae60', color: 'white' },
  'Yellow': { background: '#f1c40f', color: '#212529' },
  'Orange': { background: '#e67e22', color: 'white' },
  'Purple': { background: '#9b59b6', color: 'white' },
  'Pink': { background: '#e83e8c', color: 'white' },
  'Brown': { background: '#8b4513', color: 'white' },
  'Grey': { background: '#95a5a6', color: 'white' },
  'Black': { background: '#343a40', color: 'white' },
  'White': { background: '#f8f9fa', color: '#212529' },
}

function getMealColorStyle(color: string | undefined, colorHex?: string) {
  if (!color) return { background: '#f8f9fa', color: '#6c757d', text: 'No Color' }
  // Use colorHex from database if available, otherwise fall back to predefined colors
  if (colorHex) {
    return { background: colorHex, color: 'white', text: color }
  }
  return { ...MEAL_COLOR_STYLES[color] || { background: '#f8f9fa', color: '#6c757d' }, text: color }
}

// Local storage helpers for favorites
function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  const favorites = localStorage.getItem('m2k_favorites')
  return favorites ? JSON.parse(favorites) : []
}

function saveFavorites(favorites: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('m2k_favorites', JSON.stringify(favorites))
}

export default function M2KPublicView({ event, data, announcements = [], confessions = [], reconciliationGuideUrl, infoItems = [] }: Props) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedMealColor, setSelectedMealColor] = useState<string | null>(null)
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set())

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.has(a.id))

  function dismissAnnouncement(id: string) {
    setDismissedAnnouncements(prev => new Set([...prev, id]))
  }

  function getAnnouncementStyle(type: string) {
    switch (type) {
      case 'urgent':
        return 'bg-red-500/90 border-red-400'
      case 'warning':
        return 'bg-amber-500/90 border-amber-400'
      default:
        return 'bg-blue-500/90 border-blue-400'
    }
  }

  function getAnnouncementIcon(type: string) {
    switch (type) {
      case 'urgent':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  // Load favorites on mount
  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const closeModal = () => {
    setActiveModal(null)
    setSearchTerm('')
  }

  // Toggle favorite
  function toggleFavorite(groupId: string) {
    const newFavorites = favorites.includes(groupId)
      ? favorites.filter(id => id !== groupId)
      : [...favorites, groupId]
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase()
    return data.youthGroups.filter(group =>
      group.parish.toLowerCase().includes(term) ||
      group.id.toLowerCase().includes(term) ||
      group.leader.toLowerCase().includes(term) ||
      group.phone.toLowerCase().includes(term) ||
      (group.seminarianSgl && group.seminarianSgl.toLowerCase().includes(term)) ||
      (group.religious && group.religious.toLowerCase().includes(term))
    )
  }, [searchTerm, data.youthGroups])

  // Get favorited groups
  const favoritedGroups = useMemo(() => {
    return data.youthGroups.filter(g => favorites.includes(g.id))
  }, [data.youthGroups, favorites])

  // Active colors
  const activeColors = data.activeColors || Object.keys(data.mealTimes || {})

  // Get housing room names
  function getHousingRoomNames(groupId: string, gender: 'male' | 'female'): string[] {
    const assignments = gender === 'male'
      ? data.housingAssignments?.male[groupId]
      : data.housingAssignments?.female[groupId]
    return assignments || []
  }

  // Get small group room names
  function getSmallGroupRoomNames(groupId: string): string[] {
    const assignments = data.smallGroupAssignments?.[groupId]
    if (!assignments) return []
    return assignments.map(roomKey => {
      const room = data.rooms?.find(r => `${r.building}-${r.roomId}` === roomKey && r.type === 'smallGroup')
      if (room) {
        return room.features ? `${room.building}-${room.roomId} (${room.features})` : `${room.building}-${room.roomId}`
      }
      return roomKey
    })
  }

  // Check if group has ADA
  function hasADA(groupId: string): boolean {
    return data.adaIndividuals?.some(ada => ada.groupId === groupId) || false
  }

  // Full group card component
  function FullGroupCard({ group }: { group: YouthGroup }) {
    const maleTotal = group.maleTeens + group.maleChaperones
    const femaleTotal = group.femaleTeens + group.femaleChaperones
    const totalGroup = maleTotal + femaleTotal
    const mealColor = data.mealColorAssignments?.[group.id]
    const mealColorHex = mealColor ? data.mealTimes?.[mealColor]?.colorHex : undefined
    const mealColorStyle = getMealColorStyle(mealColor, mealColorHex)
    const maleHousingRooms = getHousingRoomNames(group.id, 'male')
    const femaleHousingRooms = getHousingRoomNames(group.id, 'female')
    const smallGroupRooms = getSmallGroupRoomNames(group.id)
    const isFavorited = favorites.includes(group.id)

    return (
      <div className="bg-white rounded-2xl p-4 shadow-lg relative">
        {/* Favorite Star */}
        <button
          onClick={() => toggleFavorite(group.id)}
          className="absolute top-3 right-3 text-2xl hover:scale-110 transition-transform z-10"
        >
          {isFavorited ? '⭐' : '☆'}
        </button>

        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start justify-between pr-8">
            <h3 className="text-lg font-bold text-[#1E3A5F]">{group.parish}</h3>
            {/* Group Code - Check-in Table Number */}
            {group.groupCode && (
              <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-lg font-bold shadow-md">
                {group.groupCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-[#1E3A5F] text-white px-2 py-0.5 rounded text-xs font-bold">{group.id}</span>
            <span className="text-gray-600 text-sm">{totalGroup} people</span>
            {mealColor && (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ backgroundColor: mealColorStyle.background, color: mealColorStyle.color }}
              >
                {mealColor}
              </span>
            )}
          </div>
        </div>

        {/* Leader Info */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <p className="text-sm"><strong>Leader:</strong> {group.leader}</p>
          <p className="text-sm"><strong>Phone:</strong> {group.phone}</p>
          <p className="text-xs text-gray-500 mt-1">
            {group.maleTeens}M + {group.maleChaperones}MC | {group.femaleTeens}F + {group.femaleChaperones}FC
          </p>
        </div>

        {/* Staff */}
        {(group.seminarianSgl || group.religious) && (
          <div className="bg-purple-50 rounded-xl p-3 mb-3">
            {group.seminarianSgl && <p className="text-sm"><strong>Seminarian SGL:</strong> {group.seminarianSgl}</p>}
            {group.religious && <p className="text-sm"><strong>Religious:</strong> {group.religious}</p>}
          </div>
        )}

        {/* Housing */}
        {group.stayingOffCampus ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-3 mb-3">
            <p className="font-semibold text-yellow-800">Off-Campus Housing</p>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-xl p-3 mb-3">
            <p className="font-semibold text-[#1E3A5F] mb-2">Housing</p>
            <div className="grid grid-cols-2 gap-2">
              {maleTotal > 0 && (
                <div className="bg-blue-100 rounded-lg p-2">
                  <p className="text-xs font-semibold text-blue-800">Males ({maleTotal})</p>
                  <p className="text-xs text-blue-700 font-medium">
                    {maleHousingRooms.length > 0 ? maleHousingRooms.join(', ') : 'Not assigned'}
                  </p>
                </div>
              )}
              {femaleTotal > 0 && (
                <div className="bg-pink-100 rounded-lg p-2">
                  <p className="text-xs font-semibold text-pink-800">Females ({femaleTotal})</p>
                  <p className="text-xs text-pink-700 font-medium">
                    {femaleHousingRooms.length > 0 ? femaleHousingRooms.join(', ') : 'Not assigned'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Small Group */}
        <div className="bg-green-50 rounded-xl p-3 mb-3">
          <p className="font-semibold text-green-800 mb-1">Small Group Location</p>
          <p className="text-sm text-green-700">
            {smallGroupRooms.length > 0 ? smallGroupRooms.join(', ') : 'Not assigned'}
          </p>
        </div>

        {/* Meal Times */}
        {mealColor && data.mealTimes?.[mealColor] && (
          <div
            className="rounded-xl p-3 mb-3"
            style={{ backgroundColor: `${mealColorStyle.background}20` }}
          >
            <p className="font-semibold mb-2" style={{ color: mealColorStyle.background }}>
              Meal Times ({mealColor})
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="bg-white/80 rounded p-1.5">
                <strong>Sat Breakfast:</strong> {data.mealTimes[mealColor].satBreakfast || 'TBA'}
              </div>
              <div className="bg-white/80 rounded p-1.5">
                <strong>Sat Lunch:</strong> {data.mealTimes[mealColor].satLunch || 'TBA'}
              </div>
              <div className="bg-white/80 rounded p-1.5">
                <strong>Sat Dinner:</strong> {data.mealTimes[mealColor].satDinner || 'TBA'}
              </div>
              <div className="bg-white/80 rounded p-1.5">
                <strong>Sun Breakfast:</strong> {data.mealTimes[mealColor].sunBreakfast || 'TBA'}
              </div>
            </div>
          </div>
        )}

        {/* ADA */}
        {hasADA(group.id) && (
          <div className="bg-purple-100 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold text-purple-800">♿ ADA Accommodations</p>
          </div>
        )}

        {/* Special Accommodations */}
        {group.specialAccommodations && (
          <div className="bg-yellow-50 rounded-xl p-3 mt-3">
            <p className="text-xs text-yellow-800"><strong>Note:</strong> {group.specialAccommodations}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#0f1f33]">
      {/* Header */}
      <header className="bg-[#1E3A5F] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <Image
              src="/light-logo-horizontal.png"
              alt="ChiRho Events"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
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

        {/* Announcements Banner */}
        {visibleAnnouncements.length > 0 && (
          <div className="space-y-3 mb-6">
            {visibleAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`relative rounded-xl p-4 border ${getAnnouncementStyle(announcement.type)}`}
              >
                <button
                  onClick={() => dismissAnnouncement(announcement.id)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Dismiss announcement"
                >
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAnnouncementIcon(announcement.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">{announcement.title}</h3>
                    <p className="text-white/90 text-sm mt-1 whitespace-pre-wrap">{announcement.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search parish, leader, group ID..."
              className="w-full px-4 py-3 pl-10 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchTerm.trim() !== '' && (
            <div className="mt-4 space-y-3">
              {filteredGroups.length > 0 ? (
                <>
                  <p className="text-white/70 text-sm">{filteredGroups.length} group(s) found</p>
                  {filteredGroups.map(group => (
                    <FullGroupCard key={group.dbId || group.id} group={group} />
                  ))}
                </>
              ) : (
                <div className="bg-white/10 rounded-2xl p-4 text-center">
                  <p className="text-white/70">No groups found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Favorited Groups (My Groups) - Shows as big 2x2 style card */}
        {/* Only show favorites when there is NO active search (searchTerm must be empty string) */}
        {searchTerm.trim() === '' && favoritedGroups.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-white font-semibold text-center">⭐ My Groups</h3>
            {favoritedGroups.map(group => (
              <FullGroupCard key={group.dbId || group.id} group={group} />
            ))}
          </div>
        )}

        {/* Main Action Buttons - 2x3 Grid */}
        {searchTerm.trim() === '' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Schedule - 1x1 */}
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

            {/* Meal Times - 1x1 */}
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

            {/* Resources - 1x1 */}
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

            {/* Confessions - 1x1 */}
            {confessions.length > 0 && (
              <button
                onClick={() => setActiveModal('confessions')}
                className="portal-button bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-white font-semibold text-lg">Confessions</span>
              </button>
            )}

            {/* Info - 1x1 */}
            <button
              onClick={() => setActiveModal('info')}
              className="portal-button bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">Info</span>
            </button>

            {/* All Groups - spans 2 columns */}
            <button
              onClick={() => setActiveModal('groups')}
              className="portal-button bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 col-span-2"
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">All Groups ({data.youthGroups.length})</span>
            </button>
          </div>
        )}

        {/* Add to Home Screen Tip */}
        {searchTerm.trim() === '' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-white/80 text-sm">
              <span className="font-semibold">Tip:</span> Add this page to your home screen for quick access!
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-white/40 text-sm">Powered by ChiRho Events</p>
      </footer>

      {/* Schedule Modal */}
      {activeModal === 'schedule' && (
        <Modal onClose={closeModal} title="Schedule">
          {data.schedule && Object.keys(data.schedule).length > 0 ? (
            <div className="space-y-6">
              {['friday', 'saturday', 'sunday'].map(day => {
                const events = data.schedule?.[day as keyof typeof data.schedule] || []
                if (events.length === 0) return null
                const startDate = data.conferenceStartDate ? new Date(data.conferenceStartDate) : new Date(event.startDate)
                const dayDate = new Date(startDate)
                if (day === 'saturday') dayDate.setDate(dayDate.getDate() + 1)
                if (day === 'sunday') dayDate.setDate(dayDate.getDate() + 2)

                return (
                  <div key={day}>
                    <h4 className="font-bold text-lg mb-3 text-[#1E3A5F]">
                      {format(dayDate, 'EEEE, MMMM d')}
                    </h4>
                    <div className="space-y-2">
                      {events.map((evt, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-semibold text-blue-600 w-24 flex-shrink-0">
                            {evt.startTime}
                            {evt.endTime && ` - ${evt.endTime}`}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{evt.event}</div>
                            {evt.location && <div className="text-sm text-gray-500">{evt.location}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Schedule coming soon!</p>
          )}
        </Modal>
      )}

      {/* Meal Times Modal */}
      {activeModal === 'meals' && (
        <Modal onClose={closeModal} title="Meal Times">
          <p className="text-sm text-gray-600 text-center mb-4">
            Select your color group to see your meal times
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {activeColors.map(color => {
              const colorHex = data.mealTimes?.[color]?.colorHex
              const style = getMealColorStyle(color, colorHex)
              return (
                <button
                  key={color}
                  onClick={() => setSelectedMealColor(selectedMealColor === color ? null : color)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    selectedMealColor === color ? 'ring-2 ring-offset-2 ring-[#1E3A5F] scale-105' : ''
                  }`}
                  style={{ backgroundColor: style.background, color: style.color }}
                >
                  {color}
                </button>
              )
            })}
          </div>
          {selectedMealColor && data.mealTimes?.[selectedMealColor] && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-[#1E3A5F] mb-3">{selectedMealColor} Team</h4>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border-l-4 border-green-500">
                  <strong>Saturday Breakfast:</strong> {data.mealTimes[selectedMealColor].satBreakfast}
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-blue-500">
                  <strong>Saturday Lunch:</strong> {data.mealTimes[selectedMealColor].satLunch}
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-orange-500">
                  <strong>Saturday Dinner:</strong> {data.mealTimes[selectedMealColor].satDinner}
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-yellow-500">
                  <strong>Sunday Breakfast:</strong> {data.mealTimes[selectedMealColor].sunBreakfast}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Resources Modal */}
      {activeModal === 'resources' && (
        <Modal onClose={closeModal} title="Resources">
          {data.resources && data.resources.length > 0 ? (
            <div className="space-y-3">
              {data.resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#1E3A5F] rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                    {resource.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[#1E3A5F]">{resource.name}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No resources available yet.</p>
          )}
        </Modal>
      )}

      {/* Confessions Modal */}
      {activeModal === 'confessions' && (
        <Modal onClose={closeModal} title="Confessions">
          {confessions.length > 0 ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center mb-4">
                Available confession times and locations
              </p>
              {reconciliationGuideUrl && (
                <a
                  href={reconciliationGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-purple-800">Reconciliation Guide</div>
                    <div className="text-sm text-purple-600">Examination of conscience &amp; preparation</div>
                  </div>
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {(() => {
                const dayOrder = ['thursday', 'friday', 'saturday', 'sunday', 'monday']
                const confessionsByDay = confessions.reduce((acc: Record<string, Confession[]>, c) => {
                  if (!acc[c.day]) acc[c.day] = []
                  acc[c.day].push(c)
                  return acc
                }, {})
                const sortedDays = Object.keys(confessionsByDay).sort(
                  (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
                )
                return sortedDays.map(day => (
                  <div key={day}>
                    <h4 className="font-bold text-lg mb-3 capitalize text-[#1E3A5F]">{day}</h4>
                    <div className="space-y-2">
                      {confessionsByDay[day].map(confession => (
                        <div key={confession.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-semibold text-purple-600 w-28 flex-shrink-0">
                            {confession.startTime}
                            {confession.endTime && ` - ${confession.endTime}`}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{confession.location}</div>
                            {confession.description && (
                              <div className="text-sm text-gray-500 mt-1">{confession.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Confession times will be posted soon!
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
              {event.locationName && <p className="text-gray-500 text-sm">{event.locationName}</p>}
            </div>
            {infoItems.map(item => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-[#1E3A5F] mb-2">{item.title}</h4>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{item.content}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Link
                  </a>
                )}
              </div>
            ))}
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-800 mb-2">Need Help?</h4>
              <p className="text-blue-600 text-sm">
                Contact your group leader or event organizers for assistance.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* All Groups Modal */}
      {activeModal === 'groups' && (
        <Modal onClose={closeModal} title="All Groups">
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search groups..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E3A5F]"
            />
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {(searchTerm.trim() !== '' ? filteredGroups : data.youthGroups).map(group => (
              <FullGroupCard key={group.dbId || group.id} group={group} />
            ))}
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
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
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">{children}</div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
