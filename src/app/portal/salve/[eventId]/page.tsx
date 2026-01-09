'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  QrCode,
  Search,
  Users,
  Loader2,
  Check,
  AlertCircle,
  X,
  Printer,
  Camera,
  ArrowLeft,
  CheckSquare,
  FileText,
  Tag,
  Settings,
  Undo2,
} from 'lucide-react'
import { toast } from '@/lib/toast'

// Dynamic import for QR scanner to avoid SSR issues
const QRScanner = dynamic(
  () => import('@/components/salve/QRScanner').then((mod) => mod.QRScanner),
  { ssr: false, loading: () => <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div> }
)

interface GroupData {
  id: string
  type?: 'individual' | 'group'
  groupName: string
  parishName: string | null
  accessCode: string
  groupLeaderName: string
  groupLeaderEmail: string
  totalParticipants: number
  registrationStatus: string
  payment: {
    status: string
    totalAmount: number
    paidAmount: number
    balanceRemaining: number
  }
  forms: {
    completed: number
    pending: number
  }
  housing: {
    assigned: boolean
  }
  participants: ParticipantData[]
}

interface ParticipantData {
  id: string
  firstName: string
  lastName: string
  age: number
  gender: string
  participantType: string
  liabilityFormCompleted: boolean
  checkedIn: boolean
  checkedInAt: string | null
  housing?: {
    buildingName: string
    roomNumber: string
    bedLetter: string
  } | null
  mealColor?: string | null
  smallGroup?: string | null
}

type CheckInStatus = 'idle' | 'scanning' | 'loading' | 'found' | 'not_found' | 'error'

export default function SalveDedicatedPortal() {
  const params = useParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const eventId = params.eventId as string

  const [status, setStatus] = useState<CheckInStatus>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [participantNotes, setParticipantNotes] = useState<Record<string, string>>({})
  const [checkingIn, setCheckingIn] = useState(false)
  const [eventName, setEventName] = useState('')
  const [stats, setStats] = useState({ totalExpected: 0, checkedIn: 0, issues: 0 })
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')

  // Success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [checkedInCount, setCheckedInCount] = useState(0)
  const [notCheckedInParticipants, setNotCheckedInParticipants] = useState<ParticipantData[]>([])
  const [checkedInParticipantIds, setCheckedInParticipantIds] = useState<string[]>([])
  const [printingNameTags, setPrintingNameTags] = useState(false)
  const [printingPacket, setPrintingPacket] = useState(false)
  const [undoingCheckIn, setUndoingCheckIn] = useState(false)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [eventId])

  async function checkAuthAndFetchData() {
    try {
      setAuthChecking(true)
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Check authorization - user must be admin, salve_user, or salve_coordinator
      const authResponse = await fetch('/api/admin/check-access', { headers })
      if (authResponse.ok) {
        setIsAdmin(true)
        setIsAuthorized(true)
      } else {
        // Check if they have salve-specific role
        const salveAuthResponse = await fetch(`/api/portal/salve/check-access?eventId=${eventId}`, { headers })
        if (salveAuthResponse.ok) {
          const salveData = await salveAuthResponse.json()
          setIsAuthorized(true)
          setIsAdmin(salveData.isAdmin || false)
        } else {
          setIsAuthorized(false)
          setError('You do not have permission to access this portal')
          setLoading(false)
          setAuthChecking(false)
          return
        }
      }

      setAuthChecking(false)

      // Fetch event data
      await fetchEventInfo()
      await fetchStats()
    } catch (err) {
      console.error('Auth check failed:', err)
      setError('Failed to verify access')
      setAuthChecking(false)
      setLoading(false)
    }
  }

  async function fetchEventInfo() {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(`/api/admin/events/${eventId}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setEventName(data.name || 'Event')
      } else {
        setError('Failed to load event')
      }
    } catch (err) {
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(`/api/admin/events/${eventId}/salve/stats`, { headers })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error('Please enter an access code or search term')
      return
    }

    setStatus('loading')
    setGroupData(null)

    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
      const query = searchQuery.trim()

      // Always search by name first, unless it looks like a specific access code format
      // Access codes are typically uppercase and exactly 6-8 characters
      const looksLikeAccessCode = /^[A-Z0-9]{6,8}$/.test(query.toUpperCase()) && !/^[A-Z]+$/.test(query.toUpperCase())

      // First try search (allows partial name matching)
      const searchUrl = `/api/admin/events/${eventId}/salve/lookup?search=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl, { headers })

      if (response.ok) {
        const data = await response.json()
        let group: GroupData | null = null

        if (data.results) {
          if (data.results.length === 0) {
            // If no results and looks like access code, try access code lookup
            if (looksLikeAccessCode) {
              const accessCodeUrl = `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(query)}`
              const accessCodeResponse = await fetch(accessCodeUrl, { headers })
              if (accessCodeResponse.ok) {
                const accessCodeData = await accessCodeResponse.json()
                if (accessCodeData.id) {
                  group = accessCodeData
                }
              }
            }
            if (!group) {
              setStatus('not_found')
              return
            }
          } else if (data.results.length === 1) {
            group = data.results[0]
          } else {
            group = data.results[0]
            toast.info(`Found ${data.results.length} matching groups. Showing first result.`)
          }
        } else if (data.id) {
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')
          const notCheckedIn = new Set<string>(
            group.participants
              .filter((p: ParticipantData) => !p.checkedIn)
              .map((p: ParticipantData) => p.id)
          )
          setSelectedParticipants(notCheckedIn)
        } else {
          setStatus('not_found')
        }
      } else if (response.status === 404) {
        setStatus('not_found')
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error('Search failed:', err)
      setStatus('error')
    }
  }

  async function handleQrScan(accessCode: string) {
    if (!accessCode) {
      toast.error('Invalid QR code')
      setStatus('idle')
      return
    }

    setStatus('loading')
    setGroupData(null)
    setSearchQuery(accessCode)

    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await fetch(
        `/api/admin/events/${eventId}/salve/lookup?accessCode=${encodeURIComponent(accessCode)}`,
        { headers }
      )

      if (response.ok) {
        const data = await response.json()
        let group: GroupData | null = null

        if (data.results) {
          if (data.results.length > 0) {
            group = data.results[0]
          }
        } else if (data.id) {
          group = data
        }

        if (group) {
          setGroupData(group)
          setStatus('found')
          toast.success(`Found: ${group.groupName}`)
          const notCheckedIn = new Set<string>(
            group.participants
              .filter((p: ParticipantData) => !p.checkedIn)
              .map((p: ParticipantData) => p.id)
          )
          setSelectedParticipants(notCheckedIn)
        } else {
          setStatus('not_found')
          toast.error('Group not found for this QR code')
        }
      } else if (response.status === 404) {
        setStatus('not_found')
        toast.error('No group found with this access code')
      } else {
        setStatus('error')
        toast.error('Failed to look up group')
      }
    } catch (err) {
      console.error('QR lookup failed:', err)
      setStatus('error')
      toast.error('Failed to look up group')
    }
  }

  function toggleParticipant(participantId: string) {
    setSelectedParticipants(prev => {
      const next = new Set(prev)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        next.add(participantId)
      }
      return next
    })
  }

  function selectAllParticipants() {
    const all = new Set(
      groupData?.participants
        .filter(p => !p.checkedIn)
        .map(p => p.id) || []
    )
    setSelectedParticipants(all)
  }

  function deselectAllParticipants() {
    setSelectedParticipants(new Set())
  }

  async function handleCheckIn() {
    if (!groupData || selectedParticipants.size === 0) {
      toast.error('Please select at least one participant to check in')
      return
    }

    setCheckingIn(true)

    try {
      const token = await getToken()
      // Check if this is an individual registration
      const isIndividual = (groupData as any).type === 'individual'

      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          groupRegistrationId: isIndividual ? undefined : groupData.id,
          participantIds: Array.from(selectedParticipants),
          registrationType: isIndividual ? 'individual' : 'group',
          action: 'check_in',
          absentParticipantIds: groupData.participants
            .filter(p => !p.checkedIn && !selectedParticipants.has(p.id))
            .map(p => p.id),
          notes: participantNotes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check in')
      }

      setCheckedInCount(selectedParticipants.size)
      setCheckedInParticipantIds(Array.from(selectedParticipants))
      setNotCheckedInParticipants(
        groupData.participants.filter(p => !p.checkedIn && !selectedParticipants.has(p.id))
      )
      setIsSuccessModalOpen(true)
      fetchStats()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }

  function resetSearch() {
    setStatus('idle')
    setSearchQuery('')
    setGroupData(null)
    setSelectedParticipants(new Set())
    setParticipantNotes({})
  }

  async function handleUndoCheckIn() {
    if (!groupData || checkedInParticipantIds.length === 0) {
      toast.error('No participants to undo check-in for')
      return
    }

    setUndoingCheckIn(true)
    try {
      const token = await getToken()
      const isIndividual = (groupData as any).type === 'individual'

      const response = await fetch(`/api/admin/events/${eventId}/salve/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          groupRegistrationId: isIndividual ? undefined : groupData.id,
          participantIds: checkedInParticipantIds,
          registrationType: isIndividual ? 'individual' : 'group',
          action: 'check_out', // Undo = check out
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to undo check-in')
      }

      toast.success('Check-in undone successfully')
      setIsSuccessModalOpen(false)
      setCheckedInParticipantIds([])
      setCheckedInCount(0)
      fetchStats()
      // Refresh the group data to show updated status
      if (groupData) {
        const refreshToken = await getToken()
        const refreshHeaders = refreshToken ? { 'Authorization': `Bearer ${refreshToken}` } : {}
        const refreshResponse = await fetch(
          `/api/admin/events/${eventId}/salve/lookup?groupId=${groupData.id}`,
          { headers: refreshHeaders }
        )
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json()
          setGroupData(refreshedData)
          // Select all non-checked-in participants again
          const notCheckedIn = new Set<string>(
            refreshedData.participants
              .filter((p: ParticipantData) => !p.checkedIn)
              .map((p: ParticipantData) => p.id)
          )
          setSelectedParticipants(notCheckedIn)
          setStatus('found')
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to undo check-in')
    } finally {
      setUndoingCheckIn(false)
    }
  }

  async function handlePrintNameTags() {
    if (!groupData || checkedInParticipantIds.length === 0) {
      toast.error('No participants to print name tags for')
      return
    }

    setPrintingNameTags(true)
    try {
      const token = await getToken()
      const isIndividual = (groupData as any).type === 'individual'

      const response = await fetch(`/api/admin/events/${eventId}/salve/generate-name-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          participantIds: isIndividual ? undefined : checkedInParticipantIds,
          groupId: isIndividual ? undefined : groupData.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate name tags')
      }

      const data = await response.json()

      // Open name tags in a new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const template = data.template || {}
        const nameTags = data.nameTags || []

        // Template settings with defaults
        const size = template.size || 'standard'
        const backgroundColor = template.backgroundColor || '#FFFFFF'
        const textColor = template.textColor || '#1E3A5F'
        const accentColor = template.accentColor || '#9C8466'
        const fontFamily = template.fontFamily || 'sans-serif'
        const fontSize = template.fontSize || 'medium'
        const showName = template.showName !== false
        const showGroup = template.showGroup !== false
        const showParticipantType = template.showParticipantType !== false
        const showHousing = template.showHousing !== false
        const showQrCode = template.showQrCode !== false
        const showDiocese = template.showDiocese === true
        const showConferenceHeader = template.showConferenceHeader === true
        const conferenceHeaderText = template.conferenceHeaderText || eventName || ''
        const showLogo = template.showLogo === true
        const logoUrl = template.logoUrl || ''
        const showHeaderBanner = template.showHeaderBanner === true
        const headerBannerUrl = template.headerBannerUrl || ''

        const is4x6 = size === 'badge_4x6'
        const has4x6Banner = is4x6 && showHeaderBanner && headerBannerUrl
        const fontFamilyCSS = fontFamily === 'sans-serif' ? 'Arial, Helvetica, sans-serif' : fontFamily

        // Special font sizes for 4x6 badge - much larger for visibility
        const badge4x6Fonts = {
          firstName: '48px',
          lastName: '40px',
          details: '20px',
          housing: '16px',
          badge: '16px'
        }

        // Standard font sizes
        const standardFonts: Record<string, { name: string; details: string }> = {
          small: { name: '16px', details: '10px' },
          medium: { name: '20px', details: '12px' },
          large: { name: '24px', details: '14px' },
        }
        const fonts = standardFonts[fontSize] || standardFonts.medium

        // Generate 4x6 badge HTML (matches pre-print design)
        if (is4x6) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Name Tags - ${groupData.groupName}</title>
              <style>
                @page {
                  size: 4in 6in;
                  margin: 0;
                }
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: ${fontFamilyCSS};
                }
                .badge {
                  width: 4in;
                  height: 6in;
                  background-color: ${backgroundColor};
                  color: ${textColor};
                  page-break-after: always;
                  position: relative;
                  overflow: hidden;
                  display: flex;
                  flex-direction: column;
                }
                .badge:last-child {
                  page-break-after: auto;
                }
                .header-banner {
                  width: 4in;
                  height: 2.5in;
                  background-size: cover;
                  background-position: center;
                  background-repeat: no-repeat;
                  flex-shrink: 0;
                }
                .header-banner img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .content-area {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  padding: 16px 20px;
                  text-align: center;
                }
                .name-section {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                }
                .first-name {
                  font-size: ${badge4x6Fonts.firstName};
                  font-weight: bold;
                  line-height: 1.1;
                  margin-bottom: 4px;
                }
                .last-name {
                  font-size: ${badge4x6Fonts.lastName};
                  font-weight: bold;
                  line-height: 1.1;
                  margin-bottom: 12px;
                }
                .group-name {
                  font-size: ${badge4x6Fonts.details};
                  color: #555;
                  margin-bottom: 4px;
                }
                .diocese {
                  font-size: 16px;
                  color: #777;
                  margin-bottom: 8px;
                }
                .participant-badge {
                  display: inline-block;
                  background-color: ${accentColor};
                  color: white;
                  padding: 8px 20px;
                  border-radius: 6px;
                  font-size: ${badge4x6Fonts.badge};
                  font-weight: 600;
                  margin-top: 8px;
                }
                .bottom-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  padding: 12px 20px 16px;
                  flex-shrink: 0;
                }
                .housing-info {
                  font-size: ${badge4x6Fonts.housing};
                  text-align: left;
                  flex: 1;
                  line-height: 1.3;
                }
                .housing-info strong {
                  display: block;
                  margin-bottom: 2px;
                }
                .qr-code {
                  width: 70px;
                  height: 70px;
                  flex-shrink: 0;
                  margin-left: 12px;
                }
                .meal-bar {
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  height: 12px;
                }
                /* Fallback header without banner */
                .fallback-header {
                  height: 2.5in;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  background: linear-gradient(135deg, ${accentColor} 0%, ${textColor} 100%);
                  color: white;
                }
                .fallback-header .event-name {
                  font-size: 28px;
                  font-weight: bold;
                  text-align: center;
                  padding: 0 20px;
                }
                .fallback-header .logo {
                  max-height: 80px;
                  max-width: 80%;
                  margin-bottom: 12px;
                }
              </style>
            </head>
            <body>
              ${nameTags.map((tag: any) => `
                <div class="badge">
                  ${has4x6Banner ? `
                    <div class="header-banner">
                      <img src="${headerBannerUrl}" alt="" />
                    </div>
                  ` : `
                    <div class="fallback-header">
                      ${showLogo && logoUrl ? `
                        <img src="${logoUrl}" class="logo" alt="" />
                      ` : ''}
                      ${showConferenceHeader && conferenceHeaderText ? `
                        <div class="event-name">${conferenceHeaderText}</div>
                      ` : ''}
                    </div>
                  `}

                  <div class="content-area">
                    <div class="name-section">
                      ${showName ? `
                        <div class="first-name">${tag.firstName}</div>
                        <div class="last-name">${tag.lastName}</div>
                      ` : ''}
                      ${showGroup ? `<div class="group-name">${tag.groupName}</div>` : ''}
                      ${showDiocese && tag.diocese ? `<div class="diocese">${tag.diocese}</div>` : ''}
                      ${showParticipantType ? `
                        <div class="participant-badge">
                          ${tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                        </div>
                      ` : ''}
                    </div>
                  </div>

                  <div class="bottom-row">
                    ${showHousing && tag.housing ? `
                      <div class="housing-info">
                        <strong>Housing:</strong>
                        ${tag.housing.fullLocation}
                      </div>
                    ` : '<div></div>'}
                    ${showQrCode && tag.qrCode ? `
                      <img class="qr-code" src="${tag.qrCode}" alt="QR" />
                    ` : ''}
                  </div>

                  ${tag.mealColor ? `
                    <div class="meal-bar" style="background-color: ${tag.mealColor.hex || tag.mealColor}"></div>
                  ` : ''}
                </div>
              `).join('')}
            </body>
            </html>
          `)
        } else {
          // Standard layout for non-4x6 badges
          const sizeStyles: Record<string, { width: string; height: string }> = {
            small: { width: '2.5in', height: '1.5in' },
            standard: { width: '3.5in', height: '2.25in' },
            large: { width: '4in', height: '3in' },
          }
          const sizeConfig = sizeStyles[size] || sizeStyles.standard

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Name Tags - ${groupData.groupName}</title>
              <style>
                @page {
                  size: letter;
                  margin: 0.5in;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: ${fontFamilyCSS};
                }
                .name-tags-container {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 0.25in;
                }
                .name-tag {
                  width: ${sizeConfig.width};
                  height: ${sizeConfig.height};
                  border: 1px solid #ccc;
                  border-radius: 8px;
                  padding: 12px;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  background-color: ${backgroundColor};
                  color: ${textColor};
                  page-break-inside: avoid;
                  position: relative;
                  overflow: hidden;
                }
                .conference-header {
                  text-align: center;
                  font-size: 10px;
                  font-weight: 600;
                  padding: 4px;
                  background-color: ${accentColor};
                  color: white;
                  margin: -12px -12px 8px -12px;
                  border-radius: 7px 7px 0 0;
                }
                .logo-section {
                  text-align: center;
                  padding: 4px 0;
                }
                .logo-section img {
                  max-height: 30px;
                  max-width: 100%;
                }
                .main-content {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  text-align: center;
                }
                .name {
                  font-size: ${fonts.name};
                  font-weight: bold;
                  color: ${textColor};
                }
                .group-name {
                  font-size: ${fonts.details};
                  color: #666;
                  margin-top: 4px;
                }
                .diocese {
                  font-size: 10px;
                  color: #888;
                }
                .badge-label {
                  display: inline-block;
                  background-color: ${accentColor};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 10px;
                  margin-top: 4px;
                }
                .bottom-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  margin-top: auto;
                  padding-top: 8px;
                }
                .housing {
                  font-size: 10px;
                  text-align: left;
                  flex: 1;
                }
                .qr-code {
                  width: 40px;
                  height: 40px;
                  flex-shrink: 0;
                }
                .meal-color-bar {
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  height: 8px;
                  border-radius: 0 0 7px 7px;
                }
              </style>
            </head>
            <body>
              <div class="name-tags-container">
                ${nameTags.map((tag: any) => `
                  <div class="name-tag">
                    ${showConferenceHeader && conferenceHeaderText ? `
                      <div class="conference-header">${conferenceHeaderText}</div>
                    ` : ''}
                    ${showLogo && logoUrl ? `
                      <div class="logo-section">
                        <img src="${logoUrl}" alt="Logo" />
                      </div>
                    ` : ''}
                    <div class="main-content">
                      ${showName ? `<div class="name">${tag.firstName} ${tag.lastName}</div>` : ''}
                      ${showGroup ? `<div class="group-name">${tag.groupName}</div>` : ''}
                      ${showDiocese && tag.diocese ? `<div class="diocese">${tag.diocese}</div>` : ''}
                      ${showParticipantType ? `
                        <div class="badge-label">
                          ${tag.isClergy ? 'Clergy' : tag.isChaperone ? 'Chaperone' : 'Youth'}
                        </div>
                      ` : ''}
                    </div>
                    <div class="bottom-row">
                      ${showHousing && tag.housing ? `
                        <div class="housing">
                          <strong>Housing:</strong> ${tag.housing.fullLocation}
                        </div>
                      ` : '<div></div>'}
                      ${showQrCode && tag.qrCode ? `
                        <img class="qr-code" src="${tag.qrCode}" alt="QR" />
                      ` : ''}
                    </div>
                    ${tag.mealColor ? `
                      <div class="meal-color-bar" style="background-color: ${tag.mealColor.hex || tag.mealColor}"></div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </body>
            </html>
          `)
        }

        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
      }

      toast.success('Name tags ready for printing')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print name tags')
    } finally {
      setPrintingNameTags(false)
    }
  }

  async function handlePrintWelcomePacket() {
    if (!groupData) {
      toast.error('No group data to print packet for')
      return
    }

    setPrintingPacket(true)
    try {
      const token = await getToken()
      const isIndividual = (groupData as any).type === 'individual'

      const response = await fetch(`/api/admin/events/${eventId}/salve/generate-packet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          groupId: isIndividual ? undefined : groupData.id,
          registrationId: isIndividual ? groupData.id : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate welcome packet')
      }

      const data = await response.json()

      // Get event info, schedule, and inserts from the response
      const eventInfo = data.event || {}
      const resources = data.resources || {}
      const inserts = data.inserts || []
      const settings = data.settings || {}
      const participants = data.participants?.list || []
      const housing = data.housing?.summary || []

      // Open packet in a new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Welcome Packet - ${groupData.groupName}</title>
            <style>
              @page { size: letter; margin: 0.75in; }
              @media print {
                .no-print { display: none !important; }
                .page-break { page-break-before: always; }
              }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 8.5in; margin: 0 auto; color: #333; line-height: 1.6; font-size: 14px; }
              h1 { color: #1E3A5F; margin-bottom: 0.5em; font-size: 28px; }
              h2 { color: #9C8466; margin-top: 1.5em; font-size: 20px; border-bottom: 2px solid #9C8466; padding-bottom: 5px; }
              h3 { color: #1E3A5F; font-size: 16px; margin-top: 1em; }
              .header { border-bottom: 3px solid #9C8466; margin-bottom: 1em; padding-bottom: 1em; }
              .header img { max-height: 60px; margin-bottom: 10px; }
              .welcome { font-size: 1.3em; margin-bottom: 1em; font-style: italic; }
              table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 14px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f5f5f5; font-weight: bold; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0; }
              .info-box { background: #f9f9f9; padding: 1em; border-radius: 8px; border-left: 4px solid #9C8466; }
              .info-box h3 { margin-top: 0; }
              .schedule-day { margin-bottom: 1.5em; }
              .schedule-item { padding: 8px 0; border-bottom: 1px dashed #ddd; }
              .schedule-time { font-weight: bold; color: #1E3A5F; width: 100px; display: inline-block; }
              .insert-image { max-width: 100%; height: auto; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              ${eventInfo.logoUrl ? `<img src="${eventInfo.logoUrl}" alt="Logo" />` : ''}
              <h1>Welcome to ${eventInfo.name || eventName}!</h1>
              ${eventInfo.organizationName ? `<p style="color: #666; margin: 0;">${eventInfo.organizationName}</p>` : ''}
            </div>

            <p class="welcome">Salve, ${groupData.groupLeaderName}!</p>
            <p>Welcome to ${eventInfo.name || eventName}. Your group <strong>${groupData.groupName}</strong>${data.group?.diocese ? ` from ${data.group.diocese}` : ''} has ${groupData.totalParticipants} registered participants.</p>

            <div class="info-grid">
              <div class="info-box">
                <h3>Registration Status</h3>
                <p><strong>Status:</strong> ${groupData.registrationStatus}</p>
                <p><strong>Payment:</strong> ${groupData.payment.balanceRemaining <= 0 ? 'Paid in Full ✓' : `$${groupData.payment.balanceRemaining.toFixed(2)} remaining`}</p>
                <p><strong>Forms:</strong> ${groupData.forms.completed}/${groupData.forms.completed + groupData.forms.pending} Complete</p>
              </div>
              <div class="info-box">
                <h3>Contact Information</h3>
                ${data.group?.contactEmail ? `<p><strong>Email:</strong> ${data.group.contactEmail}</p>` : ''}
                ${data.group?.contactPhone ? `<p><strong>Phone:</strong> ${data.group.contactPhone}</p>` : ''}
                ${data.group?.accessCode ? `<p><strong>Access Code:</strong> ${data.group.accessCode}</p>` : ''}
              </div>
            </div>

            <h2>Participant Roster</h2>
            <table>
              <tr>
                <th>Name</th>
                <th>Type</th>
                ${settings.includeHousingColumn !== false ? '<th>Housing</th>' : ''}
              </tr>
              ${participants.map((p: any) => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.isClergy ? 'Clergy' : p.isChaperone ? 'Chaperone' : 'Youth'}</td>
                  ${settings.includeHousingColumn !== false ? `<td>${p.housing ? `${p.housing.building} ${p.housing.room}${p.housing.bed ? ` - Bed ${p.housing.bed}` : ''}` : 'TBD'}</td>` : ''}
                </tr>
              `).join('')}
            </table>

            ${housing.length > 0 ? `
              <h2>Housing Summary</h2>
              ${housing.map((room: any) => `
                <div style="margin-bottom: 1em; padding: 10px; background: #f9f9f9; border-radius: 8px;">
                  <h3 style="margin: 0 0 10px 0;">${room.building} - Room ${room.roomNumber}</h3>
                  <p style="margin: 5px 0; color: #666;">Floor ${room.floor || 'N/A'} | Capacity: ${room.capacity} | ${room.gender || 'Mixed'}</p>
                  <ul style="margin: 5px 0;">
                    ${room.occupants.map((o: any) => `<li>${o.name}${o.bedLetter ? ` (Bed ${o.bedLetter})` : ''} - ${o.participantType}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            ` : ''}

            ${resources.schedule && resources.schedule.length > 0 && settings.includeEventSchedule !== false ? `
              <h2 class="page-break">Event Schedule</h2>
              ${Array.from(new Set(resources.schedule.map((s: any) => s.day))).map((day: any) => `
                <div class="schedule-day">
                  <h3>${day}</h3>
                  ${resources.schedule.filter((s: any) => s.day === day).map((entry: any) => `
                    <div class="schedule-item">
                      <span class="schedule-time">${entry.startTime}${entry.endTime ? ` - ${entry.endTime}` : ''}</span>
                      <strong>${entry.title}</strong>
                      ${entry.location ? `<span style="color: #666;"> @ ${entry.location}</span>` : ''}
                      ${entry.description ? `<br/><span style="font-size: 12px; color: #666;">${entry.description}</span>` : ''}
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            ` : ''}

            ${resources.mealTimes && resources.mealTimes.length > 0 && settings.includeMealSchedule !== false ? `
              <h2>Meal Schedule</h2>
              <table>
                <tr><th>Day</th><th>Meal</th><th>Time</th></tr>
                ${resources.mealTimes.map((mt: any) => `
                  <tr>
                    <td>${mt.day}</td>
                    <td>${mt.meal}</td>
                    <td>${mt.time}</td>
                  </tr>
                `).join('')}
              </table>
            ` : ''}

            ${/* Embed image inserts directly - each on its own page */
              inserts.filter((insert: any) => insert.imageUrls && insert.imageUrls.length > 0).map((insert: any) =>
                insert.imageUrls.map((imageUrl: string, imgIndex: number) => `
                  <div class="page-break" style="text-align: center;">
                    ${imgIndex === 0 ? `<h2 style="margin-top: 0; text-align: left;">${insert.name}</h2>` : ''}
                    <img src="${imageUrl}" alt="${insert.name}" style="max-width: 100%; height: auto; margin: 20px 0;" />
                  </div>
                `).join('')
              ).join('')
            }

            <div style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px;">
              Generated on ${new Date().toLocaleString()}
            </div>
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 500)
      }

      toast.success('Welcome packet ready for printing')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print welcome packet')
    } finally {
      setPrintingPacket(false)
    }
  }

  const totalExpected = stats?.totalExpected || 0
  const checkedIn = stats?.checkedIn || 0
  const issues = stats?.issues || 0
  const notCheckedInCount = totalExpected - checkedIn
  const progressPercentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 0

  if (loading || authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {authChecking ? 'Verifying access...' : 'Loading SALVE Check-In Portal...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              {error || 'You do not have permission to access the SALVE Check-In Portal.'}
            </p>
            <Link href="/dashboard/admin">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">SALVE Check-In Station</h1>
              <p className="text-xs text-white/80">{eventName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/portal/salve/${eventId}/participants`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Users className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">All Participants</span>
              </Button>
            </Link>
            <Link href={`/dashboard/admin/events/${eventId}/salve/welcome-packets`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <FileText className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Edit Packets</span>
              </Button>
            </Link>
            <Link href={`/dashboard/admin/events/${eventId}/salve/name-tags`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Tag className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Edit Name Tags</span>
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/dashboard/admin/salve">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
          <Card>
            <CardContent className="p-3 md:pt-4 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Checked In</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">
                    {checkedIn} / {totalExpected}
                  </p>
                </div>
                <Check className="w-6 h-6 md:w-8 md:h-8 text-green-500 hidden sm:block" />
              </div>
              <Progress value={progressPercentage} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progressPercentage}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:pt-4 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Issues</p>
                  <p className="text-lg md:text-2xl font-bold text-amber-600">{issues}</p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-amber-500 hidden sm:block" />
              </div>
              <p className="text-xs text-muted-foreground mt-2 hidden md:block">Missing forms or payments</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-600 text-white">
            <CardContent className="p-3 md:pt-4 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-white/70">Not Checked In</p>
                  <p className="text-lg md:text-2xl font-bold">{notCheckedInCount}</p>
                </div>
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white/50 hidden sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search / Scan Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {status === 'idle' && (
              <div className="space-y-6">
                <div className="text-center">
                  <QrCode className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Scan QR Code or Search</h2>
                  <p className="text-muted-foreground">
                    Scan the group leader&apos;s QR code or search by name, email, or access code
                  </p>
                </div>

                {/* Scan QR Code Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => setStatus('scanning')}
                    size="lg"
                    className="h-14 px-8 text-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Camera className="w-6 h-6 mr-3" />
                    Scan QR Code
                  </Button>
                </div>

                <div className="flex items-center gap-4 max-w-xl mx-auto">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-muted-foreground">or search manually</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex gap-2 max-w-xl mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or access code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 h-12"
                    />
                  </div>
                  <Button onClick={handleSearch} className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700">
                    Search
                  </Button>
                </div>
              </div>
            )}

            {status === 'scanning' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold">Scan QR Code</h2>
                  <p className="text-muted-foreground">
                    Point camera at the group leader&apos;s QR code
                  </p>
                </div>
                <QRScanner
                  onScan={handleQrScan}
                  onError={(err) => {
                    console.error('QR Error:', err)
                    toast.error('QR scanner error. Try manual search.')
                  }}
                  onClose={() => setStatus('idle')}
                />
              </div>
            )}

            {status === 'loading' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-600" />
                <p className="text-muted-foreground mt-4">Looking up registration...</p>
              </div>
            )}

            {status === 'not_found' && (
              <div className="text-center py-12">
                <X className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-red-600 mb-2">Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  No registration found for &quot;{searchQuery}&quot;
                </p>
                <Button onClick={resetSearch}>Try Again</Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                <p className="text-muted-foreground mb-4">
                  Something went wrong. Please try again.
                </p>
                <Button onClick={resetSearch}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Check-In Screen */}
        {status === 'found' && groupData && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Salve, {groupData.groupLeaderName.split(' ')[0]}!
                    </h2>
                    <p className="text-white/80">Welcome to {eventName}</p>
                  </div>
                  <Button variant="outline" className="text-white border-white hover:bg-white/10" onClick={resetSearch}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Group Info & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{groupData.groupName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupData.parishName && (
                    <p className="text-muted-foreground">{groupData.parishName}</p>
                  )}
                  <p className="font-medium">{groupData.totalParticipants} Participants Registered</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {groupData.payment.balanceRemaining <= 0 ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm">
                        Payment: {groupData.payment.balanceRemaining <= 0 ? 'Paid in Full' : `$${groupData.payment.balanceRemaining.toFixed(2)} remaining`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {groupData.forms.pending === 0 ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm">
                        Liability Forms: {groupData.forms.completed}/{groupData.forms.completed + groupData.forms.pending} Complete
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {groupData.housing.assigned ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm">
                        Housing: {groupData.housing.assigned ? 'Assigned' : 'Not Assigned'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issues */}
              {(groupData.payment.balanceRemaining > 0 || groupData.forms.pending > 0) && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Outstanding Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {groupData.payment.balanceRemaining > 0 && (
                        <li className="text-sm text-amber-700">
                          Outstanding balance: ${groupData.payment.balanceRemaining.toFixed(2)}
                        </li>
                      )}
                      {groupData.participants
                        .filter(p => !p.liabilityFormCompleted)
                        .slice(0, 5)
                        .map(p => (
                          <li key={p.id} className="text-sm text-amber-700">
                            {p.firstName} {p.lastName} - Missing Liability Form
                          </li>
                        ))}
                      {groupData.forms.pending > 5 && (
                        <li className="text-sm text-amber-700">
                          ... and {groupData.forms.pending - 5} more missing forms
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Participant Roster */}
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <CardTitle className="text-lg">Check In Participants</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllParticipants} className="flex-1 md:flex-none">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllParticipants} className="flex-1 md:flex-none">
                    Deselect All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {groupData.participants.map((participant) => {
                      const isSelected = selectedParticipants.has(participant.id)
                      const isAlreadyCheckedIn = participant.checkedIn

                      return (
                        <div
                          key={participant.id}
                          className={`flex items-center gap-4 p-3 rounded-lg border ${
                            isAlreadyCheckedIn
                              ? 'bg-green-50 border-green-200'
                              : isSelected
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-gray-200'
                          }`}
                        >
                          {!isAlreadyCheckedIn && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleParticipant(participant.id)}
                            />
                          )}

                          {isAlreadyCheckedIn && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {participant.firstName} {participant.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({participant.age}, {participant.gender === 'male' ? 'M' : 'F'})
                              </span>
                              {!participant.liabilityFormCompleted && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  Missing Form
                                </Badge>
                              )}
                              {isAlreadyCheckedIn && (
                                <Badge className="bg-green-500">Checked In</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {participant.housing ? (
                                <span>{participant.housing.buildingName} {participant.housing.roomNumber}-{participant.housing.bedLetter}</span>
                              ) : (
                                <span className="text-amber-600">No housing assigned</span>
                              )}
                              {participant.mealColor && (
                                <span className="ml-2">{participant.mealColor} Meals</span>
                              )}
                              {participant.smallGroup && (
                                <span className="ml-2">SG-{participant.smallGroup}</span>
                              )}
                            </div>
                          </div>

                          {!isAlreadyCheckedIn && !isSelected && (
                            <Input
                              placeholder="Add note (arriving later?)"
                              value={participantNotes[participant.id] || ''}
                              onChange={(e) => setParticipantNotes(prev => ({
                                ...prev,
                                [participant.id]: e.target.value,
                              }))}
                              className="w-48 text-sm"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {selectedParticipants.size} selected
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({groupData.participants.filter(p => p.checkedIn).length} already checked in)
                    </span>
                  </div>
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkingIn || selectedParticipants.size === 0}
                    className="px-8 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {checkingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Check className="w-4 h-4 mr-2" />
                    Check In Selected ({selectedParticipants.size})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <Check className="w-6 h-6" />
              Check-In Successful!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{checkedInCount}</p>
              <p className="text-sm text-green-700">participants checked in</p>
            </div>

            {notCheckedInParticipants.length > 0 && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="font-medium text-amber-800 mb-2">Not Checked In ({notCheckedInParticipants.length}):</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {notCheckedInParticipants.map(p => (
                    <li key={p.id}>
                      {p.firstName} {p.lastName}
                      {participantNotes[p.id] && (
                        <span className="text-amber-600"> - {participantNotes[p.id]}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="font-medium">Next Steps:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto py-3"
                  onClick={handlePrintWelcomePacket}
                  disabled={printingPacket}
                >
                  {printingPacket ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Print Welcome Packet
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3"
                  onClick={handlePrintNameTags}
                  disabled={printingNameTags}
                >
                  {printingNameTags ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Print Name Tags ({checkedInCount})
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={handleUndoCheckIn}
              disabled={undoingCheckIn}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {undoingCheckIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Undo2 className="w-4 h-4 mr-2" />
              )}
              Undo Check-in
            </Button>
            <Button
              onClick={() => {
                setIsSuccessModalOpen(false)
                resetSearch()
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Done - Next Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
