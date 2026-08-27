'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Loader2,
  Send,
  BellRing,
  BarChart3,
  Save,
  UserPlus,
  FlaskConical,
  Link2,
  Copy,
  Check,
  X,
} from 'lucide-react'

type QuestionType = 'text' | 'yes_no' | 'multiple_choice' | 'multi_select' | 'scale'

interface SurveyQuestion {
  id: string
  questionText: string
  questionType: QuestionType
  options: string[] | null
  scaleMin: number | null
  scaleMax: number | null
  scaleMinLabel: string | null
  scaleMaxLabel: string | null
  required: boolean
  displayOrder: number
}

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'active' | 'closed'
  sendToParticipants: boolean
  sendToGroupLeaders: boolean
  isAnonymous: boolean
  closesAt: string | null
  publicToken: string | null
  questions: SurveyQuestion[]
  _count: { recipients: number; responses: number }
}

interface SurveyDetailClientProps {
  eventId: string
  eventName: string
  surveyId: string
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short Answer',
  yes_no: 'Yes/No',
  multiple_choice: 'Multiple Choice',
  multi_select: 'Multi-Select',
  scale: 'Rating Scale',
}

const STATUS_BADGE: Record<Survey['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-blue-100 text-blue-700',
}

export default function SurveyDetailClient({ eventId, eventName, surveyId }: SurveyDetailClientProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Settings form (local editable copy)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sendToParticipants, setSendToParticipants] = useState(true)
  const [sendToGroupLeaders, setSendToGroupLeaders] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [closesAt, setClosesAt] = useState('')

  // Question modal
  const [modalOpen, setModalOpen] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null)
  const [qForm, setQForm] = useState({
    questionText: '',
    questionType: 'text' as QuestionType,
    required: false,
    options: [''],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: '',
    scaleMaxLabel: '',
  })

  // Send modal
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [sendResult, setSendResult] = useState<string | null>(null)

  // Reach people outside registration: manual recipient, test send, public link
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [addResult, setAddResult] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [publicLink, setPublicLink] = useState<string | null>(null)
  const [publicLinkLoading, setPublicLinkLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const authHeaders = useCallback(
    async (extra: Record<string, string> = {}) => {
      const token = await getToken()
      return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
    },
    [getToken]
  )

  const loadSurvey = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}`, { headers })
      if (!res.ok) throw new Error('Failed to load survey')
      const data = await res.json()
      setSurvey(data.survey)
      setTitle(data.survey.title)
      setDescription(data.survey.description || '')
      setSendToParticipants(data.survey.sendToParticipants)
      setSendToGroupLeaders(data.survey.sendToGroupLeaders)
      setIsAnonymous(data.survey.isAnonymous)
      setClosesAt(data.survey.closesAt ? data.survey.closesAt.slice(0, 10) : '')
      setPublicLink(
        data.survey.publicToken
          ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/survey/${data.survey.publicToken}`
          : null
      )
    } catch (err) {
      console.error('Error loading survey:', err)
    } finally {
      setLoading(false)
    }
  }, [authHeaders, eventId, surveyId])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  const handleSaveSettings = async () => {
    if (!title.trim()) return
    if (!sendToParticipants && !sendToGroupLeaders) {
      alert('At least one audience (participants or group leaders) must be enabled')
      return
    }
    setSavingSettings(true)
    setSettingsSaved(false)
    setSettingsError(null)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title,
          description: description || null,
          sendToParticipants,
          sendToGroupLeaders,
          isAnonymous,
          closesAt: closesAt || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')
      await loadSurvey()
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2500)
    } catch (err) {
      console.error('Error saving survey settings:', err)
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const openAddModal = () => {
    setEditingQuestion(null)
    setQForm({
      questionText: '',
      questionType: 'text',
      required: false,
      options: ['', ''],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: '',
      scaleMaxLabel: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (question: SurveyQuestion) => {
    setEditingQuestion(question)
    setQForm({
      questionText: question.questionText,
      questionType: question.questionType,
      required: question.required,
      options: question.options && question.options.length > 0 ? question.options : ['', ''],
      scaleMin: question.scaleMin ?? 1,
      scaleMax: question.scaleMax ?? 5,
      scaleMinLabel: question.scaleMinLabel || '',
      scaleMaxLabel: question.scaleMaxLabel || '',
    })
    setModalOpen(true)
  }

  const handleSaveQuestion = async () => {
    if (!qForm.questionText.trim()) return
    setSavingQuestion(true)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const body: Record<string, unknown> = {
        questionText: qForm.questionText,
        questionType: qForm.questionType,
        required: qForm.required,
      }
      if (qForm.questionType === 'multiple_choice' || qForm.questionType === 'multi_select') {
        body.options = qForm.options.map(o => o.trim()).filter(Boolean)
      } else {
        body.options = null
      }
      if (qForm.questionType === 'scale') {
        body.scaleMin = qForm.scaleMin
        body.scaleMax = qForm.scaleMax
        body.scaleMinLabel = qForm.scaleMinLabel || null
        body.scaleMaxLabel = qForm.scaleMaxLabel || null
      }

      const url = editingQuestion
        ? `/api/admin/events/${eventId}/surveys/${surveyId}/questions/${editingQuestion.id}`
        : `/api/admin/events/${eventId}/surveys/${surveyId}/questions`
      const res = await fetch(url, {
        method: editingQuestion ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save question')
      }

      setModalOpen(false)
      await loadSurvey()
    } catch (err) {
      console.error('Error saving question:', err)
      alert(err instanceof Error ? err.message : 'Failed to save question')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question? Any collected answers for it will also be deleted.')) return
    try {
      const headers = await authHeaders()
      const res = await fetch(
        `/api/admin/events/${eventId}/surveys/${surveyId}/questions/${questionId}`,
        { method: 'DELETE', headers }
      )
      if (!res.ok) throw new Error('Failed to delete question')
      await loadSurvey()
    } catch (err) {
      console.error('Error deleting question:', err)
      alert('Failed to delete question')
    }
  }

  const handleDeleteSurvey = async () => {
    if (!confirm(`Delete "${survey?.title}"? This removes all its questions and any collected responses.`)) return
    setDeleting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Failed to delete survey')
      router.push(`/dashboard/admin/events/${eventId}/surveys`)
    } catch (err) {
      console.error('Error deleting survey:', err)
      alert('Failed to delete survey')
      setDeleting(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    setSendResult(null)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ customMessage: customMessage || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send survey')
      setSendResult(
        `Sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}${
          data.failed ? ` (${data.failed} failed)` : ''
        }.`
      )
      await loadSurvey()
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : 'Failed to send survey')
    } finally {
      setSending(false)
    }
  }

  const handleRemind = async () => {
    setReminding(true)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/remind`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reminders')
      alert(`Reminders sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}.`)
      await loadSurvey()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminders')
    } finally {
      setReminding(false)
    }
  }

  const handleAddRecipient = async () => {
    if (!addEmail.trim()) return
    setAddingRecipient(true)
    setAddResult(null)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/recipients`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: addName || undefined, email: addEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add recipient')
      setAddResult(`Sent a survey link to ${addEmail}.`)
      setAddName('')
      setAddEmail('')
      await loadSurvey()
    } catch (err) {
      setAddResult(err instanceof Error ? err.message : 'Failed to add recipient')
    } finally {
      setAddingRecipient(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) return
    setSendingTest(true)
    setTestResult(null)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/test-send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send test')
      setTestResult(`Test sent to ${testEmail}. It won't count toward your results.`)
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : 'Failed to send test')
    } finally {
      setSendingTest(false)
    }
  }

  const handleGetPublicLink = async (regenerate = false) => {
    setPublicLinkLoading(true)
    try {
      const headers = await authHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/public-link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ regenerate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create public link')
      setPublicLink(data.url)
      if (survey?.status === 'draft') await loadSurvey()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create public link')
    } finally {
      setPublicLinkLoading(false)
    }
  }

  const handleRevokePublicLink = async () => {
    if (!confirm('Revoke this link? Anyone who has it will no longer be able to respond.')) return
    setPublicLinkLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/events/${eventId}/surveys/${surveyId}/public-link`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Failed to revoke link')
      setPublicLink(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke link')
    } finally {
      setPublicLinkLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. insecure context) -- the link is
      // still shown in the input for manual copy.
    }
  }

  const addOption = () => setQForm(prev => ({ ...prev, options: [...prev.options, ''] }))
  const updateOption = (index: number, value: string) =>
    setQForm(prev => ({ ...prev, options: prev.options.map((o, i) => (i === index ? value : o)) }))
  const removeOption = (index: number) =>
    setQForm(prev => ({
      ...prev,
      options: prev.options.length <= 2 ? prev.options : prev.options.filter((_, i) => i !== index),
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-600">Survey not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/admin/events/${eventId}/surveys`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Surveys
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#1E3A5F]">{survey.title}</h1>
              <Badge className={STATUS_BADGE[survey.status]}>{survey.status}</Badge>
            </div>
            <p className="text-sm text-[#6B7280]">{eventName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/admin/events/${eventId}/surveys/${surveyId}/results`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Results ({survey._count.responses})
            </Button>
          </Link>
          {survey.status === 'active' && survey._count.recipients > survey._count.responses && (
            <Button variant="outline" size="sm" onClick={handleRemind} disabled={reminding}>
              {reminding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BellRing className="h-4 w-4 mr-2" />
              )}
              Send Reminders
            </Button>
          )}
          <Button
            size="sm"
            className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
            onClick={() => {
              setCustomMessage('')
              setSendResult(null)
              setSendModalOpen(true)
            }}
            disabled={survey.questions.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            {survey.status === 'draft' ? 'Send Survey' : 'Send to New Registrants'}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">Survey Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="survey-title">Title</Label>
            <Input id="survey-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="survey-description">Description (optional, shown to respondents)</Label>
            <Textarea
              id="survey-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between border border-[#D1D5DB] rounded-md px-4 py-3">
              <div>
                <p className="font-medium text-sm text-[#1E3A5F]">Send to Participants</p>
                <p className="text-xs text-[#6B7280]">Anyone with an email on file</p>
              </div>
              <Switch checked={sendToParticipants} onCheckedChange={setSendToParticipants} />
            </div>
            <div className="flex items-center justify-between border border-[#D1D5DB] rounded-md px-4 py-3">
              <div>
                <p className="font-medium text-sm text-[#1E3A5F]">Send to Group Leaders</p>
                <p className="text-xs text-[#6B7280]">Good for groups with minors</p>
              </div>
              <Switch checked={sendToGroupLeaders} onCheckedChange={setSendToGroupLeaders} />
            </div>
          </div>

          <div className="flex items-center justify-between border border-[#D1D5DB] rounded-md px-4 py-3">
            <div>
              <p className="font-medium text-sm text-[#1E3A5F]">Anonymous Responses</p>
              <p className="text-xs text-[#6B7280]">
                Results won&apos;t be linked back to who responded (delivery is still tracked so
                reminders work, but the results view never shows names or emails)
              </p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <div>
            <Label htmlFor="closes-at">Closes On (optional)</Label>
            <Input
              id="closes-at"
              type="date"
              value={closesAt}
              onChange={e => setClosesAt(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {settingsError && (
            <p className="text-sm text-red-600">{settingsError}</p>
          )}

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDeleteSurvey} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Survey
            </Button>
            <div className="flex items-center gap-3">
              {settingsSaved && (
                <span className="flex items-center gap-1 text-sm text-green-700">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
              <Button onClick={handleSaveSettings} disabled={savingSettings || !title.trim()} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reach people outside registration */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1E3A5F]">Reach People Outside Registration</CardTitle>
          <p className="text-sm text-[#6B7280]">
            Send to a vendor or anyone else by email, preview the survey yourself, or grab a
            link anyone can use.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {survey.questions.length === 0 && (
            <p className="text-sm text-[#6B7280] italic">Add at least one question above to enable sending.</p>
          )}

          {/* Add a one-off recipient */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4" /> Add a Recipient
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Name (optional)"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                className="sm:max-w-[180px]"
              />
              <Input
                placeholder="email@example.com"
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
              />
              <Button
                onClick={handleAddRecipient}
                disabled={addingRecipient || !addEmail.trim() || survey.questions.length === 0}
                className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white whitespace-nowrap"
              >
                {addingRecipient ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Link
              </Button>
            </div>
            {addResult && <p className="text-xs text-[#6B7280] mt-1">{addResult}</p>}
          </div>

          {/* Send a test */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <FlaskConical className="h-4 w-4" /> Send Yourself a Test
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="your@email.com"
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail.trim() || survey.questions.length === 0}
                className="whitespace-nowrap"
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                Send Test
              </Button>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {testResult || "Works even in draft. Test submissions never count toward your results."}
            </p>
          </div>

          {/* Public shareable link */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4" /> Public Link
            </Label>
            {publicLink ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input readOnly value={publicLink} className="font-mono text-xs" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopyLink} className="whitespace-nowrap">
                    {linkCopied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleRevokePublicLink}
                    disabled={publicLinkLoading}
                    className="text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Revoke
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleGetPublicLink(false)}
                disabled={publicLinkLoading || survey.questions.length === 0}
              >
                {publicLinkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Create Public Link
              </Button>
            )}
            <p className="text-xs text-[#6B7280] mt-1">
              Anyone with this link can respond -- good for flyers, QR codes, or a vendor you
              don&apos;t want to add one by one. Responses from it are always anonymous and can&apos;t be
              reminded.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[#1E3A5F]">Questions</CardTitle>
            <Button size="sm" onClick={openAddModal} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {survey.questions.length === 0 ? (
            <p className="text-center text-[#6B7280] py-4">
              No questions yet. Add multiple choice, rating scale, yes/no, multi-select, or short
              answer questions.
            </p>
          ) : (
            <div className="space-y-3">
              {survey.questions.map(question => (
                <div
                  key={question.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-[#6B7280] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        {question.questionText}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[question.questionType]}
                        </Badge>
                        {question.options && question.options.length > 0 && (
                          <span className="text-xs text-[#6B7280]">
                            {question.options.length} options
                          </span>
                        )}
                        {question.questionType === 'scale' && (
                          <span className="text-xs text-[#6B7280]">
                            {question.scaleMinLabel || question.scaleMin} &rarr;{' '}
                            {question.scaleMaxLabel || question.scaleMax}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(question)} title="Edit question">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(question.id)} title="Delete question">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Question Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="questionText">Question Text</Label>
              <Input
                id="questionText"
                value={qForm.questionText}
                onChange={e => setQForm(prev => ({ ...prev, questionText: e.target.value }))}
                placeholder="e.g., How would you rate this year's retreat?"
              />
            </div>

            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <select
                id="questionType"
                value={qForm.questionType}
                onChange={e => setQForm(prev => ({ ...prev, questionType: e.target.value as QuestionType }))}
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              >
                <option value="text">Short Answer</option>
                <option value="yes_no">Yes/No</option>
                <option value="multiple_choice">Multiple Choice (pick one)</option>
                <option value="multi_select">Multi-Select (pick any)</option>
                <option value="scale">Rating Scale</option>
              </select>
            </div>

            {(qForm.questionType === 'multiple_choice' || qForm.questionType === 'multi_select') && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2 mt-1">
                  {qForm.options.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input value={option} onChange={e => updateOption(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                      {qForm.options.length > 2 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {qForm.questionType === 'scale' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scaleMin">Lowest Value</Label>
                  <Input
                    id="scaleMin"
                    type="number"
                    value={qForm.scaleMin}
                    onChange={e => setQForm(prev => ({ ...prev, scaleMin: Number(e.target.value) }))}
                  />
                  <Input
                    className="mt-2"
                    placeholder="Label (optional), e.g. Poor"
                    value={qForm.scaleMinLabel}
                    onChange={e => setQForm(prev => ({ ...prev, scaleMinLabel: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="scaleMax">Highest Value</Label>
                  <Input
                    id="scaleMax"
                    type="number"
                    value={qForm.scaleMax}
                    onChange={e => setQForm(prev => ({ ...prev, scaleMax: Number(e.target.value) }))}
                  />
                  <Input
                    className="mt-2"
                    placeholder="Label (optional), e.g. Excellent"
                    value={qForm.scaleMaxLabel}
                    onChange={e => setQForm(prev => ({ ...prev, scaleMaxLabel: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={qForm.required}
                onChange={e => setQForm(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={savingQuestion || !qForm.questionText.trim()}
              className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white"
            >
              {savingQuestion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#6B7280]">
              This emails a personal survey link to{' '}
              {[
                survey.sendToParticipants && 'every participant with an email on file',
                survey.sendToGroupLeaders && 'every group leader',
              ]
                .filter(Boolean)
                .join(' and ')}
              . People who already have a link won&apos;t be emailed again — use &quot;Send
              Reminders&quot; for that instead.
            </p>
            <div>
              <Label htmlFor="customMessage">Custom Message (optional)</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={3}
                placeholder="Add a personal note to accompany the survey link..."
              />
            </div>
            {sendResult && <p className="text-sm font-medium text-[#1E3A5F]">{sendResult}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSend} disabled={sending} className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
