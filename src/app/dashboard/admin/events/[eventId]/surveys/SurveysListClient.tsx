'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  Loader2,
  Users,
  UserCheck,
  BarChart3,
  Eye,
  EyeOff,
} from 'lucide-react'

interface Survey {
  id: string
  title: string
  status: 'draft' | 'active' | 'closed'
  isAnonymous: boolean
  sendToParticipants: boolean
  sendToGroupLeaders: boolean
  sendToStaff: boolean
  createdAt: string
  _count: { questions: number; recipients: number; responses: number }
}

interface SurveysListClientProps {
  eventId: string
  eventName: string
}

const STATUS_BADGE: Record<Survey['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-blue-100 text-blue-700',
}

export default function SurveysListClient({ eventId, eventName }: SurveysListClientProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => {
    loadSurveys()
  }, [eventId])

  const authHeaders = async (extra: Record<string, string> = {}) => {
    const token = await getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
  }

  const loadSurveys = async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/surveys`, { headers })
      if (!res.ok) throw new Error('Failed to load surveys')
      const data = await res.json()
      setSurveys(data.surveys || [])
    } catch (err) {
      console.error('Error loading surveys:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error('Failed to create survey')
      const data = await res.json()
      router.push(`/dashboard/admin/events/${eventId}/surveys/${data.survey.id}`)
    } catch (err) {
      console.error('Error creating survey:', err)
      alert('Failed to create survey')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/admin/events/${eventId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">Surveys</h1>
            <p className="text-sm text-[#6B7280]">{eventName}</p>
          </div>
        </div>
        <Button
          className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
          onClick={() => {
            setTitle('')
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Survey
        </Button>
      </div>

      <Card className="bg-white border-[#D1D5DB]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 px-6">
              <ClipboardList className="h-12 w-12 text-[#9C8466] mx-auto mb-4" />
              <h3 className="font-semibold text-[#1E3A5F] mb-2">No surveys yet</h3>
              <p className="text-[#6B7280] mb-4">
                Create a post-event survey to collect feedback from participants and/or group
                leaders — multiple choice, rating scales, and short-answer questions all in one.
              </p>
              <Button
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                onClick={() => {
                  setTitle('')
                  setModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Survey
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {surveys.map(survey => (
                <Link
                  key={survey.id}
                  href={`/dashboard/admin/events/${eventId}/surveys/${survey.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1E3A5F]">{survey.title}</p>
                      <Badge className={STATUS_BADGE[survey.status]}>{survey.status}</Badge>
                      {survey.isAnonymous ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <EyeOff className="h-3 w-3" /> Anonymous
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Eye className="h-3 w-3" /> Identified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[#6B7280]">
                      <span>{survey._count.questions} question{survey._count.questions === 1 ? '' : 's'}</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {survey._count.recipients} sent
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> {survey._count.responses} responded
                      </span>
                      <span>
                        {[
                          survey.sendToParticipants && 'Participants',
                          survey.sendToGroupLeaders && 'Group Leaders',
                          survey.sendToStaff && 'Staff',
                        ]
                          .filter(Boolean)
                          .join(' + ')}
                      </span>
                    </div>
                  </div>
                  <BarChart3 className="h-5 w-5 text-[#9C8466] flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="survey-title">Survey Title</Label>
            <Input
              id="survey-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., 2026 Retreat Feedback"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <p className="text-xs text-[#6B7280]">
              You can add questions, choose an audience, and turn on anonymous mode next.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
