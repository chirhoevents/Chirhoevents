'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'

// Types for the JSON data structure
interface YouthGroup {
  id: string
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

interface Room {
  building: string
  roomId: string
  gender: string
  capacity: number
  type: string
  features?: string
}

interface MealTimes {
  satBreakfast?: string
  satLunch?: string
  satDinner?: string
  sunBreakfast?: string
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
  rooms?: Room[]
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
  timestamp?: string
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

function getMealColorStyle(color: string | undefined) {
  if (!color) return { background: '#f8f9fa', color: '#6c757d', text: 'No Color' }
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

export default function M2KPublicView({ event, data }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedMealColor, setSelectedMealColor] = useState<string | null>(null)

  // Load favorites on mount
  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

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

  // Non-favorited groups for overview
  const nonFavoritedGroups = useMemo(() => {
    return data.youthGroups.filter(g => !favorites.includes(g.id))
  }, [data.youthGroups, favorites])

  // Stats
  const totalGroups = data.youthGroups.length
  const totalParticipants = data.youthGroups.reduce((total, group) =>
    total + group.maleTeens + group.femaleTeens + group.maleChaperones + group.femaleChaperones, 0)

  // Active colors
  const activeColors = data.activeColors || Object.keys(data.mealTimes || {})

  // Get housing room info
  function getHousingRoomNames(groupId: string, gender: 'male' | 'female'): string[] {
    const assignments = gender === 'male'
      ? data.housingAssignments?.male[groupId]
      : data.housingAssignments?.female[groupId]
    return assignments || []
  }

  // Get small group room info
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

  // Create group card
  function GroupCard({ group, showDetails = false }: { group: YouthGroup; showDetails?: boolean }) {
    const maleTotal = group.maleTeens + group.maleChaperones
    const femaleTotal = group.femaleTeens + group.femaleChaperones
    const totalGroup = maleTotal + femaleTotal

    const mealColor = data.mealColorAssignments?.[group.id]
    const mealColorStyle = getMealColorStyle(mealColor)

    const maleHousingRooms = getHousingRoomNames(group.id, 'male')
    const femaleHousingRooms = getHousingRoomNames(group.id, 'female')
    const smallGroupRooms = getSmallGroupRoomNames(group.id)

    const isHousingAssigned = maleHousingRooms.length > 0 || femaleHousingRooms.length > 0
    const isSmallGroupAssigned = smallGroupRooms.length > 0
    const overallAssigned = isHousingAssigned || isSmallGroupAssigned

    const isFavorited = favorites.includes(group.id)

    return (
      <div
        className={`bg-white p-4 rounded-lg shadow-sm border-l-4 relative ${
          overallAssigned ? 'border-l-green-500' : 'border-l-red-500'
        } ${showDetails ? (overallAssigned ? 'bg-green-50' : 'bg-red-50') : ''}`}
        style={{ paddingLeft: '35px' }}
      >
        {/* Favorite Star */}
        <button
          onClick={() => toggleFavorite(group.id)}
          className="absolute top-2 left-2 text-xl hover:scale-110 transition-transform"
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorited ? '⭐' : '☆'}
        </button>

        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <strong className="text-base">{group.parish}</strong>
          <div className="flex gap-1 items-center">
            {mealColor && (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ backgroundColor: mealColorStyle.background, color: mealColorStyle.color }}
              >
                {mealColorStyle.text}
              </span>
            )}
          </div>
        </div>

        {/* Group Info */}
        <p className="text-sm">
          <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">{group.id}</span>
          {' | '}{totalGroup} people total
        </p>

        {showDetails && (
          <>
            <p className="mt-2 text-sm">
              <strong>Leader:</strong> {group.leader} | <strong>Phone:</strong> {group.phone}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              <strong>Male:</strong> {group.maleTeens} teens + {group.maleChaperones} chaperones |{' '}
              <strong>Female:</strong> {group.femaleTeens} teens + {group.femaleChaperones} chaperones
            </p>
            {group.specialAccommodations && (
              <p className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                <strong>Special Accommodations:</strong> {group.specialAccommodations}
              </p>
            )}
          </>
        )}

        {/* Seminarian SGL */}
        {group.seminarianSgl && (
          <p className="text-xs text-gray-700 mt-2">
            <strong>Seminarian SGL:</strong> {group.seminarianSgl}
          </p>
        )}

        {/* Religious */}
        {group.religious && (
          <p className="text-xs text-gray-700 mt-1">
            <strong>Religious:</strong> {group.religious}
          </p>
        )}

        {/* Housing Assignments */}
        {group.stayingOffCampus ? (
          <div className="bg-yellow-100 p-2 rounded mt-2 border-l-4 border-l-orange-500">
            <strong className="text-sm">OFF-CAMPUS HOUSING</strong>
            <p className="text-xs mt-1">This group is staying off-campus</p>
          </div>
        ) : (
          <div className="bg-gray-50 p-2 rounded mt-2">
            <strong className="text-sm">Housing Assignments</strong>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {maleTotal > 0 && (
                <div className="bg-blue-100 p-2 rounded border-l-4 border-l-blue-500">
                  <strong className="text-xs">Males: {maleTotal}</strong>
                  {maleHousingRooms.length > 0 ? (
                    <p className="text-xs text-green-700 font-bold mt-0.5">{maleHousingRooms.join(', ')}</p>
                  ) : (
                    <p className="text-xs text-orange-600 font-bold mt-0.5">Not assigned</p>
                  )}
                </div>
              )}
              {femaleTotal > 0 && (
                <div className="bg-pink-100 p-2 rounded border-l-4 border-l-pink-500">
                  <strong className="text-xs">Females: {femaleTotal}</strong>
                  {femaleHousingRooms.length > 0 ? (
                    <p className="text-xs text-green-700 font-bold mt-0.5">{femaleHousingRooms.join(', ')}</p>
                  ) : (
                    <p className="text-xs text-orange-600 font-bold mt-0.5">Not assigned</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADA */}
        {hasADA(group.id) && (
          <div className="bg-purple-100 p-2 rounded mt-2 border-l-4 border-l-purple-600 text-center">
            <strong className="text-xs text-purple-800">ADA Accommodations Assigned</strong>
          </div>
        )}

        {/* Small Group */}
        <div className="bg-blue-50 p-2 rounded mt-2">
          <strong className="text-sm">Small Group Location</strong>
          {smallGroupRooms.length > 0 ? (
            <div className="bg-gradient-to-r from-blue-100 to-pink-100 p-2 rounded mt-1">
              <strong className="text-xs">Group Location:</strong>
              <p className="text-xs text-green-700 font-bold mt-0.5">{smallGroupRooms.join(', ')}</p>
            </div>
          ) : (
            <div className="bg-yellow-100 p-1 rounded mt-1 text-center">
              <p className="text-xs text-yellow-800 font-bold">No small group location assigned</p>
            </div>
          )}
        </div>

        {/* Meal Times (only in search results) */}
        {showDetails && mealColor && data.mealTimes?.[mealColor] && (
          <div
            className="p-2 rounded mt-2 border-l-4"
            style={{ backgroundColor: `${mealColorStyle.background}20`, borderLeftColor: mealColorStyle.background }}
          >
            <strong className="text-sm">Meal Times - {mealColorStyle.text} Group</strong>
            <div className="mt-1 text-xs space-y-1">
              <div className="bg-white p-1 rounded">
                <strong>Saturday Breakfast:</strong> {data.mealTimes[mealColor].satBreakfast || 'TBA'}
              </div>
              <div className="bg-white p-1 rounded">
                <strong>Saturday Lunch:</strong> {data.mealTimes[mealColor].satLunch || 'TBA'}
              </div>
              <div className="bg-white p-1 rounded">
                <strong>Saturday Dinner:</strong> {data.mealTimes[mealColor].satDinner || 'TBA'}
              </div>
              <div className="bg-white p-1 rounded">
                <strong>Sunday Breakfast:</strong> {data.mealTimes[mealColor].sunBreakfast || 'TBA'}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-500 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <div className="text-lg font-bold">Mount 2K Portal</div>
            <div className="text-sm opacity-90">
              {data.dashboardSubtitle || `Housing and Small Group Assignments - ${new Date(event.startDate).getFullYear()}`}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-[60px] z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap">
          {[
            { id: 'dashboard', label: 'Assignment Dashboard' },
            { id: 'meals', label: 'Meal Times' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'resources', label: 'Resources' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold text-sm border-b-3 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-3">
              Assignment Dashboard
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border-t-4 border-t-blue-500">
                <h3 className="text-2xl font-bold">{totalGroups}</h3>
                <p className="text-sm text-gray-600 font-semibold uppercase">Total Youth Groups</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-t-4 border-t-purple-500">
                <h3 className="text-2xl font-bold">{totalParticipants}</h3>
                <p className="text-sm text-gray-600 font-semibold uppercase">Total Participants</p>
              </div>
            </div>

            {/* Search */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Quick Parish Assignment Search</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Parish, Group ID, Leader, Phone, Seminarian SGL, or Religious..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Search Results */}
            {searchTerm && (
              <div>
                {filteredGroups.length > 0 ? (
                  <>
                    <h3 className="font-semibold text-gray-800 mb-3">
                      Search Results ({filteredGroups.length} found)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredGroups.map(group => (
                        <GroupCard key={group.id} group={group} showDetails />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-yellow-800">
                    No groups found matching your search.
                  </div>
                )}
              </div>
            )}

            {/* Favorites Section */}
            {favoritedGroups.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-400">
                <h3 className="font-bold text-gray-800 mb-3">Your Favorited Groups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoritedGroups.map(group => (
                    <GroupCard key={group.id} group={group} showDetails />
                  ))}
                </div>
              </div>
            )}

            {/* All Groups Overview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-3">Complete Assignment Overview</h3>
              {nonFavoritedGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nonFavoritedGroups.map(group => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">All groups are in your favorites section above.</p>
              )}
            </div>
          </div>
        )}

        {/* Meal Times Tab */}
        {activeTab === 'meals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-3">
              Meal Times
            </h2>
            <p className="text-gray-600">
              View your group&apos;s meal schedule based on your assigned color.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-l-gray-800">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Your Group&apos;s Meal Schedule</h3>
              <p className="text-gray-600 mb-4">Select your assigned meal color to view your specific meal times:</p>

              {/* Color buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {activeColors.map(color => {
                  const style = getMealColorStyle(color)
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedMealColor(color)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-transform hover:scale-105 ${
                        selectedMealColor === color ? 'ring-2 ring-offset-2 ring-gray-800' : ''
                      }`}
                      style={{ backgroundColor: style.background, color: style.color }}
                    >
                      {color}
                    </button>
                  )
                })}
              </div>

              {/* Meal times display */}
              {selectedMealColor && data.mealTimes?.[selectedMealColor] && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-bold text-gray-800 mb-3">{selectedMealColor} Team Schedule</h4>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded border-l-4 border-l-green-500">
                      <strong>Saturday Breakfast:</strong> {data.mealTimes[selectedMealColor].satBreakfast}
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-l-blue-500">
                      <strong>Saturday Lunch:</strong> {data.mealTimes[selectedMealColor].satLunch}
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-l-orange-500">
                      <strong>Saturday Dinner:</strong> {data.mealTimes[selectedMealColor].satDinner}
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-l-yellow-500">
                      <strong>Sunday Breakfast:</strong> {data.mealTimes[selectedMealColor].sunBreakfast}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-3">
              Mount 2K Schedule
            </h2>
            <p className="text-gray-600 mb-4">
              Complete event schedule for the retreat weekend.
            </p>

            {['friday', 'saturday', 'sunday'].map(day => {
              const events = data.schedule?.[day as keyof typeof data.schedule] || []
              const startDate = data.conferenceStartDate ? new Date(data.conferenceStartDate) : new Date(event.startDate)
              const dayDate = new Date(startDate)
              if (day === 'saturday') dayDate.setDate(dayDate.getDate() + 1)
              if (day === 'sunday') dayDate.setDate(dayDate.getDate() + 2)

              const dayColors: Record<string, string> = {
                friday: '#3b82f6',
                saturday: '#10b981',
                sunday: '#f59e0b',
              }

              return (
                <div
                  key={day}
                  className="bg-white p-6 rounded-lg shadow-sm"
                  style={{ borderLeft: `4px solid ${dayColors[day]}` }}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {format(dayDate, 'EEEE, MMMM d')}
                  </h3>
                  {events.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 text-xs uppercase text-gray-500 font-bold">Start</th>
                            <th className="text-left p-3 text-xs uppercase text-gray-500 font-bold">End</th>
                            <th className="text-left p-3 text-xs uppercase text-gray-500 font-bold">Event</th>
                            <th className="text-left p-3 text-xs uppercase text-gray-500 font-bold">Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((evt, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-3 text-sm">{evt.startTime}</td>
                              <td className="p-3 text-sm">{evt.endTime || ''}</td>
                              <td className="p-3 text-sm">{evt.event}</td>
                              <td className="p-3 text-sm">{evt.location || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No events scheduled for this day.</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-3">
              Mount 2K Resources
            </h2>
            <p className="text-gray-600 mb-4">
              Quick access to important resources and information for the retreat.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.resources && data.resources.length > 0 ? (
                data.resources
                  .filter(r => r.name !== 'Meal Times' && r.name !== 'Event Schedule')
                  .map((resource, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-l-gray-800"
                    >
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <span className="text-2xl">{resource.emoji}</span>
                        {resource.name}
                      </h3>
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <span className="text-gray-800 font-semibold">{resource.name} &rarr;</span>
                        </a>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                          <span className="text-gray-400 italic">Link coming soon</span>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-gray-500 col-span-full text-center">
                  No additional resources available at this time.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm">
        Powered by ChiRho Events
      </footer>
    </div>
  )
}
