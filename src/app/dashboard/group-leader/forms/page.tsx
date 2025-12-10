'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  FileText,
  Download,
  Mail,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react'

type FormStatus = 'completed' | 'pending'
type ParticipantType = 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest'

interface ParticipantForm {
  id: string
  firstName: string | null
  lastName: string | null
  age: number | null
  gender: string | null
  participantType: ParticipantType | null
  formStatus: FormStatus
  formId?: string
  pdfUrl?: string
  parentEmail?: string
  completedAt?: string
}

export default function LiabilityFormsPage() {
  const [forms, setForms] = useState<ParticipantForm[]>([])
  const [filteredForms, setFilteredForms] = useState<ParticipantForm[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [selectedForm, setSelectedForm] = useState<ParticipantForm | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchForms()
  }, [])

  useEffect(() => {
    filterForms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, activeFilter])

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/group-leader/forms')
      if (response.ok) {
        const data = await response.json()
        setForms(data.forms)
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterForms = () => {
    if (activeFilter === 'all') {
      setFilteredForms(forms)
    } else if (activeFilter === 'completed') {
      setFilteredForms(forms.filter(f => f.formStatus === 'completed'))
    } else {
      setFilteredForms(forms.filter(f => f.formStatus === 'pending'))
    }
  }

  const getParticipantTypeLabel = (type: ParticipantType | null): string => {
    if (!type) return 'Not Started'
    const labels = {
      youth_u18: 'Youth U18',
      youth_o18: 'Youth 18+',
      chaperone: 'Chaperone',
      priest: 'Clergy'
    }
    return labels[type]
  }

  const handleDownloadPDF = async (formId: string) => {
    try {
      const response = await fetch(`/api/liability/forms/${formId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `liability-form-${formId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handleDownloadAllPDFs = async () => {
    setDownloading(true)
    try {
      const response = await fetch('/api/group-leader/forms/download-all')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `liability-forms-all.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading all PDFs:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleResendEmail = async (participantId: string, parentEmail: string | null) => {
    const email = parentEmail || prompt('Enter email address to send the form link:')
    if (!email) return

    try {
      const response = await fetch('/api/group-leader/forms/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, parentEmail: email })
      })
      if (response.ok) {
        alert('Email sent successfully!')
      } else {
        alert('Failed to send email')
      }
    } catch (error) {
      console.error('Error resending email:', error)
      alert('Error sending email')
    }
  }

  const handleDeleteForm = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to delete ${participantName}'s form? This cannot be undone and they will need to fill out the form again.`)) {
      return
    }

    try {
      const response = await fetch(`/api/group-leader/forms/${participantId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Form deleted successfully. The participant can now fill out a new form.')
        fetchForms() // Refresh the list
      } else {
        alert('Failed to delete form')
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Error deleting form')
    }
  }

  const handleBulkEmailReminders = async () => {
    try {
      const pendingForms = forms.filter(f => f.formStatus === 'pending')
      const response = await fetch('/api/group-leader/forms/bulk-email-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: pendingForms.map(f => f.id)
        })
      })
      if (response.ok) {
        alert(`Sent reminders to ${pendingForms.length} participants!`)
      }
    } catch (error) {
      console.error('Error sending bulk reminders:', error)
    }
  }

  const completedCount = forms.filter(f => f.formStatus === 'completed').length
  const pendingCount = forms.filter(f => f.formStatus === 'pending').length
  const totalCount = forms.length
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading forms...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Liability Forms
          </h1>
          <p className="text-[#6B7280]">
            Track and manage liability forms for all participants
          </p>
        </div>

        <div className="flex gap-2">
          {completedCount === totalCount && totalCount > 0 && (
            <Button
              onClick={handleDownloadAllPDFs}
              disabled={downloading}
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download All PDFs'}
            </Button>
          )}
          {pendingCount > 0 && (
            <Button
              onClick={handleBulkEmailReminders}
              variant="outline"
              className="border-[#1E3A5F] text-[#1E3A5F]"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Pending ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card className="p-6 bg-white border-[#D1D5DB]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1E3A5F]">
            Overall Progress
          </h3>
          <span className="text-2xl font-bold text-[#1E3A5F]">
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="w-full bg-[#E5E7EB] rounded-full h-3 mb-2">
          <div
            className="bg-[#10B981] h-3 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-[#6B7280]">
          <span>{completionPercentage.toFixed(0)}% Complete</span>
          <span>{pendingCount} Pending</span>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-[#E5E7EB]">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'all'
              ? 'text-[#9C8466] border-b-2 border-[#9C8466]'
              : 'text-[#6B7280] hover:text-[#1E3A5F]'
          }`}
        >
          All Forms ({totalCount})
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'completed'
              ? 'text-[#9C8466] border-b-2 border-[#9C8466]'
              : 'text-[#6B7280] hover:text-[#1E3A5F]'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'pending'
              ? 'text-[#9C8466] border-b-2 border-[#9C8466]'
              : 'text-[#6B7280] hover:text-[#1E3A5F]'
          }`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {/* Forms Table */}
      <Card className="overflow-hidden border-[#D1D5DB]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9FAFB] border-b-2 border-[#D1D5DB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E5E7EB]">
              {filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">
                    No forms found
                  </td>
                </tr>
              ) : (
                filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-[#1F2937]">
                        {form.firstName && form.lastName ? (
                          `${form.firstName} ${form.lastName}`
                        ) : (
                          <span className="text-[#6B7280] italic">Form not started</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">
                      {form.age || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280] capitalize">
                      {form.gender || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        form.participantType
                          ? 'bg-[#E8DCC8] text-[#1E3A5F]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getParticipantTypeLabel(form.participantType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {form.formStatus === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {form.formStatus === 'completed' && form.formId && form.firstName && form.lastName && (
                          <>
                            <button
                              onClick={() => setSelectedForm(form)}
                              className="text-[#9C8466] hover:text-[#8B7355]"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(form.formId!)}
                              className="text-[#10B981] hover:text-[#059669]"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleResendEmail(form.id, form.parentEmail ?? null)}
                              className="text-[#3B82F6] hover:text-[#2563EB]"
                              title="Resend Email"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteForm(form.id, `${form.firstName} ${form.lastName}`)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Form"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {form.formStatus === 'pending' && form.participantType === 'youth_u18' && form.parentEmail && (
                          <button
                            onClick={() => handleResendEmail(form.id, form.parentEmail!)}
                            className="text-[#3B82F6] hover:text-[#2563EB]"
                            title="Resend Parent Email"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Details Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1E3A5F]">
                  Form Details
                </h2>
                <p className="text-[#6B7280] mt-1">
                  {selectedForm.firstName} {selectedForm.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedForm(null)}
                className="text-[#6B7280] hover:text-[#1E3A5F]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#6B7280]">Participant Type</p>
                  <p className="font-medium text-[#1F2937]">
                    {getParticipantTypeLabel(selectedForm.participantType)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Age / Gender</p>
                  <p className="font-medium text-[#1F2937] capitalize">
                    {selectedForm.age} / {selectedForm.gender}
                  </p>
                </div>
              </div>

              {selectedForm.completedAt && (
                <div>
                  <p className="text-sm text-[#6B7280]">Completed At</p>
                  <p className="font-medium text-[#1F2937]">
                    {new Date(selectedForm.completedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                {selectedForm.formId && (
                  <Button
                    onClick={() => handleDownloadPDF(selectedForm.formId!)}
                    className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedForm(null)}
                  variant="outline"
                  className="border-[#1E3A5F] text-[#1E3A5F]"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
