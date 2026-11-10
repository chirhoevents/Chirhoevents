'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEvent } from '@/contexts/EventContext'
import {
  ScrollText,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  X,
  Mail,
  Loader2,
} from 'lucide-react'

interface LetterInfo {
  id: string
  submissionMethod: string
  status: 'pending' | 'submitted_externally' | 'uploaded' | 'verified' | 'rejected'
  fileUrl: string | null
  originalFilename: string | null
  uploadedAt: string | null
  externalSubmissionNotes: string | null
  rejectionReason: string | null
  verifiedAt: string | null
}

interface LetterRow {
  participantId: string | null
  participantName: string
  participantEmail: string | null
  participantType: string
  letter: LetterInfo | null
}

interface LettersData {
  groupId: string
  groupName: string
  settings: {
    method: string
    contactName: string | null
    contactEmail: string | null
    instructions: string | null
    requiredFor: string[]
  }
  letters: LetterRow[]
}

const TYPE_LABELS: Record<string, string> = {
  youth_u18: 'Youth U18',
  youth_o18: 'Youth 18+',
  chaperone: 'Chaperone',
  priest: 'Priest',
  deacon: 'Deacon',
  seminarian: 'Seminarian',
  religious_sister: 'Religious Sister',
  religious_brother: 'Religious Brother',
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

function rowKey(row: LetterRow) {
  return row.participantId ?? `letter-${row.letter?.id}`
}

export default function LettersPage() {
  const { selectedEventId } = useEvent()
  const [data, setData] = useState<LettersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ key: string; text: string; error: boolean } | null>(null)

  useEffect(() => {
    fetchLetters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId])

  const fetchLetters = async () => {
    if (!selectedEventId) {
      setLoading(false)
      return
    }
    try {
      const response = await fetch(`/api/group-leader/letters?eventId=${selectedEventId}`)
      if (response.ok) {
        setData(await response.json())
      }
    } catch (error) {
      console.error('Error fetching letters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (row: LetterRow, file: File | undefined) => {
    if (!file) return
    const key = rowKey(row)
    setMessage(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({ key, text: 'Please upload a PDF, JPEG, or PNG file', error: true })
      return
    }
    if (file.size > MAX_SIZE) {
      setMessage({ key, text: 'File size must be less than 10 MB', error: true })
      return
    }

    setUploadingKey(key)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (row.participantId) formData.append('participantId', row.participantId)
      else if (row.letter) formData.append('letterId', row.letter.id)

      const response = await fetch('/api/group-leader/letters/upload', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      await fetchLetters()
      setMessage({ key, text: 'Letter uploaded. The event organizer will review it.', error: false })
    } catch (error: any) {
      setMessage({ key, text: error.message || 'Failed to upload letter', error: true })
    } finally {
      setUploadingKey(null)
    }
  }

  const getStatusBadge = (letter: LetterInfo | null) => {
    switch (letter?.status) {
      case 'verified':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        )
      case 'uploaded':
        return (
          <div className="flex items-center text-amber-600">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Uploaded – Pending Review</span>
          </div>
        )
      case 'submitted_externally':
        return (
          <div className="flex items-center text-blue-600">
            <Mail className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Sent to Organizer</span>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex items-center text-red-600">
            <X className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Rejected</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Not Submitted</span>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading letters...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Failed to load letters of good standing</div>
      </div>
    )
  }

  const rows = data.letters
  const onFile = rows.filter(r => r.letter?.fileUrl).length
  const verified = rows.filter(r => r.letter?.status === 'verified').length
  const missing = rows.filter(r => !r.letter?.fileUrl && r.letter?.status !== 'verified').length
  const requiredLabels = data.settings.requiredFor.map(t => TYPE_LABELS[t] ?? t).join(', ')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">Letters of Good Standing</h1>
        <p className="text-[#6B7280]">
          Upload letters of good standing for the clergy and religious in your group
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Require a Letter', value: rows.length, color: 'text-[#1E3A5F]', Icon: ScrollText, iconColor: 'text-[#9C8466]' },
          { label: 'Letter on File', value: onFile, color: 'text-amber-600', Icon: Upload, iconColor: 'text-amber-600' },
          { label: 'Verified', value: verified, color: 'text-green-600', Icon: CheckCircle, iconColor: 'text-green-600' },
          { label: 'Still Needed', value: missing, color: 'text-red-600', Icon: AlertTriangle, iconColor: 'text-red-600' },
        ].map(({ label, value, color, Icon, iconColor }) => (
          <Card key={label} className="bg-white border-[#D1D5DB]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B7280]">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${iconColor}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded space-y-2">
        {data.settings.instructions && (
          <p className="text-sm text-blue-900 whitespace-pre-line">{data.settings.instructions}</p>
        )}
        <p className="text-sm text-blue-900">
          <strong>Required for:</strong> {requiredLabels || 'No participant types'}.{' '}
          Upload a copy of each letter here so the event organizer has it on file. Accepted
          formats: PDF, JPEG, PNG. Maximum file size: 10 MB.
        </p>
        {(data.settings.contactName || data.settings.contactEmail) && (
          <p className="text-sm text-blue-900">
            <strong>Organizer contact:</strong> {data.settings.contactName}
            {data.settings.contactEmail && (
              <a href={`mailto:${data.settings.contactEmail}`} className="ml-1 underline">
                {data.settings.contactEmail}
              </a>
            )}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <Card className="p-12 text-center bg-white border-[#D1D5DB]">
            <ScrollText className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">No One Needs a Letter Yet</h2>
            <p className="text-[#6B7280] max-w-md mx-auto">
              Clergy and religious in your group who need a letter of good standing will appear
              here after they complete their liability forms.
            </p>
          </Card>
        ) : (
          rows.map(row => {
            const key = rowKey(row)
            const letter = row.letter
            const isUploading = uploadingKey === key
            const canUpload = letter?.status !== 'verified'

            return (
              <Card key={key} className="bg-white border-[#D1D5DB]">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg text-[#1E3A5F]">{row.participantName}</CardTitle>
                      <p className="text-sm text-[#6B7280] mt-1">
                        {TYPE_LABELS[row.participantType] ?? row.participantType}
                        {row.participantEmail && ` • ${row.participantEmail}`}
                      </p>
                    </div>
                    {getStatusBadge(letter)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {letter?.fileUrl && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-[#9C8466]" />
                        <div>
                          <p className="text-sm font-medium text-[#1F2937]">{letter.originalFilename}</p>
                          {letter.uploadedAt && (
                            <p className="text-xs text-[#6B7280]">
                              Uploaded {new Date(letter.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <a href={letter.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </a>
                    </div>
                  )}

                  {letter?.status === 'submitted_externally' && !letter.fileUrl && (
                    <p className="text-sm text-[#6B7280]">
                      This person said they sent their letter to the organizer directly. If you have
                      a copy, upload it here so it is on file.
                    </p>
                  )}

                  {letter?.status === 'rejected' && letter.rejectionReason && (
                    <p className="text-sm text-red-600">
                      <strong>Reason:</strong> {letter.rejectionReason} — please upload a new letter.
                    </p>
                  )}

                  {letter?.status === 'verified' && (
                    <p className="text-sm text-green-700">
                      Verified by the event organizer. Contact them if this letter needs to change.
                    </p>
                  )}

                  {canUpload && (
                    <label
                      className={`inline-flex items-center rounded-md border border-[#9C8466] px-3 py-1.5 text-sm font-medium text-[#9C8466] transition-colors hover:bg-[#9C8466] hover:text-white ${
                        isUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                      }`}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploading
                        ? 'Uploading...'
                        : letter?.fileUrl
                          ? 'Replace Letter'
                          : 'Upload Letter'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={e => {
                          handleUpload(row, e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}

                  {message?.key === key && (
                    <p className={`text-sm ${message.error ? 'text-red-600' : 'text-green-700'}`}>
                      {message.text}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
