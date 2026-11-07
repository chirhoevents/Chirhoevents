'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DirectoryGroup } from '@/lib/poros-group-directory'

const MEAL_COLORS: Record<string, string> = {
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  purple: '#9b59b6',
  pink: '#e83e8c',
  brown: '#8b4513',
  grey: '#95a5a6',
  gray: '#95a5a6',
  black: '#343a40',
}

function mealColorHex(meal: DirectoryGroup['meal']): string {
  if (!meal) return '#6b7280'
  return meal.colorHex || MEAL_COLORS[meal.name.toLowerCase()] || '#6b7280'
}

// Search by group number (prefix, so "53" finds 53, 53A and 53B but not 153),
// group/parish name, group leader, seminarian SGL or religious.
export function filterDirectoryGroups(groups: DirectoryGroup[], rawTerm: string): DirectoryGroup[] {
  const term = rawTerm.trim().toLowerCase()
  if (!term) return []
  const numberTerm = term.replace(/^#\s*/, '')
  return groups.filter(g =>
    (numberTerm !== '' && (g.groupNumber || '').toLowerCase().startsWith(numberTerm)) ||
    g.name.toLowerCase().includes(term) ||
    g.leader.toLowerCase().includes(term) ||
    g.sgl.some(n => n.toLowerCase().includes(term)) ||
    g.religious.some(n => n.toLowerCase().includes(term))
  )
}

// Starred groups, remembered per event on this device only
export function useFavoriteGroups(eventId: string) {
  const key = `poros_favorite_groups_${eventId}`
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) setFavorites(parsed.filter(x => typeof x === 'string'))
    } catch {
      // Storage unavailable (private mode, blocked) — favorites just won't persist
    }
  }, [key])

  const toggle = useCallback((groupId: string) => {
    setFavorites(prev => {
      const next = prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [key])

  return { favorites, toggle }
}

export function GroupCard({
  group,
  isFavorite,
  onToggleFavorite,
}: {
  group: DirectoryGroup
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const color = mealColorHex(group.meal)
  const hasRooms = group.maleRooms.length > 0 || group.femaleRooms.length > 0 || group.otherRooms.length > 0
  const mealTimes = group.meal
    ? ([
        ['Breakfast', group.meal.breakfast],
        ['Lunch', group.meal.lunch],
        ['Dinner', group.meal.dinner],
        ['Sun Breakfast', group.meal.sundayBreakfast],
      ] as const).filter(([, t]) => t)
    : []

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg relative text-left">
      <button
        onClick={() => onToggleFavorite(group.id)}
        className="absolute top-3 right-3 text-2xl leading-none hover:scale-110 transition-transform"
        aria-label={isFavorite ? 'Remove from My Groups' : 'Add to My Groups'}
        title={isFavorite ? 'Remove from My Groups' : 'Add to My Groups'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      {/* Header */}
      <div className="mb-3 pr-9 flex items-start gap-3">
        {group.groupNumber && (
          <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-lg font-bold shadow-md flex-shrink-0">
            {group.groupNumber}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#1E3A5F] leading-tight break-words">{group.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-gray-600 text-sm">{group.people} people</span>
            {group.meal && (
              <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: color }}>
                {group.meal.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Leader */}
      <div className="bg-gray-50 rounded-xl p-3 mb-3">
        <p className="text-sm"><strong>Group Leader:</strong> {group.leader}</p>
      </div>

      {/* Small group */}
      {(group.sgl.length > 0 || group.religious.length > 0 || group.smallGroupRoom) && (
        <div className="bg-purple-50 rounded-xl p-3 mb-3 space-y-0.5">
          {group.sgl.length > 0 && (
            <p className="text-sm"><strong>Seminarian SGL:</strong> {group.sgl.join(', ')}</p>
          )}
          {group.religious.length > 0 && (
            <p className="text-sm"><strong>Religious:</strong> {group.religious.join(', ')}</p>
          )}
          {group.smallGroupRoom && (
            <p className="text-sm"><strong>Small Group Room:</strong> {group.smallGroupRoom}</p>
          )}
        </div>
      )}

      {/* Housing */}
      {group.offCampus ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-3 mb-3">
          <p className="font-semibold text-yellow-800 text-sm">Off-Campus Housing</p>
        </div>
      ) : group.dayPass ? (
        <div className="bg-gray-50 border-l-4 border-gray-400 rounded-xl p-3 mb-3">
          <p className="font-semibold text-gray-700 text-sm">Day Pass</p>
        </div>
      ) : hasRooms ? (
        <div className="bg-blue-50 rounded-xl p-3 mb-3">
          <p className="font-semibold text-[#1E3A5F] mb-2 text-sm">Housing</p>
          <div className="grid grid-cols-2 gap-2">
            {group.maleRooms.length > 0 && (
              <div className="bg-blue-100 rounded-lg p-2">
                <p className="text-xs font-semibold text-blue-800">Males</p>
                <p className="text-xs text-blue-700 font-medium break-words">{group.maleRooms.join(', ')}</p>
              </div>
            )}
            {group.femaleRooms.length > 0 && (
              <div className="bg-pink-100 rounded-lg p-2">
                <p className="text-xs font-semibold text-pink-800">Females</p>
                <p className="text-xs text-pink-700 font-medium break-words">{group.femaleRooms.join(', ')}</p>
              </div>
            )}
            {group.otherRooms.length > 0 && (
              <div className="bg-gray-100 rounded-lg p-2 col-span-2">
                <p className="text-xs text-gray-700 font-medium break-words">{group.otherRooms.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Meal times */}
      {group.meal && mealTimes.length > 0 && (
        <div className="rounded-xl p-3" style={{ backgroundColor: `${color}20` }}>
          <p className="font-semibold mb-2 text-sm" style={{ color }}>
            Meal Times ({group.meal.name})
          </p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {mealTimes.map(([label, time]) => (
              <div key={label} className="bg-white/80 rounded p-1.5">
                <strong>{label}:</strong> {time}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function GroupSearchInput({
  value,
  onChange,
  variant = 'dark',
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  variant?: 'dark' | 'light'
  autoFocus?: boolean
}) {
  const dark = variant === 'dark'
  return (
    <div className="relative">
      <input
        type="text"
        enterKeyHint="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search group #, name, leader..."
        aria-label="Search groups"
        className={
          dark
            ? 'w-full px-4 py-3 pl-10 pr-10 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15'
            : 'w-full px-4 py-2.5 pl-10 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1E3A5F]'
        }
      />
      <svg
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${dark ? 'text-white/50' : 'text-gray-400'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${dark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
