'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  X
} from 'lucide-react'

interface Certificate {
  id: string
  fileUrl: string
  originalFilename: string
  programName: string | null
  completionDate: string | null
  expirationDate: string | null
  status: 'pending' | 'verified' | 'rejected' | 'expired'
  uploadedAt: string
  verifiedAt: string | null
}

interface ChaperoneData {
  participantId: string
  participantName: string
  participantEmail: string | null
  status: 'not_required' | 'pending' | 'uploaded' | 'verified' | null
  certificates: Certificate[]
}

interface CertificatesData {
  groupId: string
  groupName: string
  chaperoneCount: number
  certificates: ChaperoneData[]
}

export default function CertificatesPage() {
  const [data, setData] = useState<CertificatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadFormData, setUploadFormData] = useState({
    programName: '',
    completionDate: '',
    expirationDate: '',
  })

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      const response = await fetch('/api/group-leader/certificates')
      if (response.ok) {
        const certificatesData = await response.json()
        setData(certificatesData)
      }
    } catch (error) {
      console.error('Error fetching certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.includes('pdf')) {
        alert('Please upload a PDF file')
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async (participantId: string) => {
    if (!selectedFile) {
      alert('Please select a file to upload')
      return
    }

    try {
      setUploadingFor(participantId)

      const formData = new FormData()
      formData.append('participantId', participantId)
      formData.append('file', selectedFile)
      if (uploadFormData.programName) {
        formData.append('programName', uploadFormData.programName)
      }
      if (uploadFormData.completionDate) {
        formData.append('completionDate', uploadFormData.completionDate)
      }
      if (uploadFormData.expirationDate) {
        formData.append('expirationDate', uploadFormData.expirationDate)
      }

      const response = await fetch('/api/group-leader/certificates/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      // Refresh the certificates list
      await fetchCertificates()

      // Reset form
      setSelectedFile(null)
      setUploadFormData({
        programName: '',
        completionDate: '',
        expirationDate: '',
      })
      setUploadingFor(null)

      alert('Certificate uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading certificate:', error)
      alert(error.message || 'Failed to upload certificate')
    } finally {
      setUploadingFor(null)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
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
            <span className="text-sm font-medium">Pending Review</span>
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Not Uploaded</span>
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
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Pending</span>
          </div>
        )
    }
  }

  const getCertificateStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Verified</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">Pending</span>
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Rejected</span>
      case 'expired':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Expired</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#1E3A5F]">Loading certificates...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Failed to load certificates data</div>
      </div>
    )
  }

  // Calculate statistics
  const totalChaperones = data.chaperoneCount
  const uploadedCount = data.certificates.filter(c => c.status === 'uploaded' || c.status === 'verified').length
  const verifiedCount = data.certificates.filter(c => c.status === 'verified').length
  const pendingCount = totalChaperones - uploadedCount

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Safe Environment Certificates
        </h1>
        <p className="text-[#6B7280]">
          Manage safe environment training certificates for your chaperones
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Total Chaperones</p>
                <p className="text-2xl font-bold text-[#1E3A5F]">{totalChaperones}</p>
              </div>
              <Shield className="h-8 w-8 text-[#9C8466]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Uploaded</p>
                <p className="text-2xl font-bold text-amber-600">{uploadedCount}</p>
              </div>
              <Upload className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Verified</p>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#D1D5DB]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">Pending</p>
                <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-900">
          <strong>Important:</strong> All chaperones are required to have valid Safe Environment Training certificates.
          Please upload certificates for each chaperone. Accepted formats: PDF only. Maximum file size: 5MB.
        </p>
      </div>

      {/* Chaperones List */}
      <div className="space-y-4">
        {data.certificates.length === 0 ? (
          <Card className="p-12 text-center bg-white border-[#D1D5DB]">
            <Shield className="h-16 w-16 text-[#9C8466] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#1E3A5F] mb-2">
              No Chaperones Yet
            </h2>
            <p className="text-[#6B7280] mb-6 max-w-md mx-auto">
              Chaperones will appear here after participants complete their liability forms and identify themselves as chaperones.
            </p>
          </Card>
        ) : (
          data.certificates.map((chaperone) => (
            <Card key={chaperone.participantId} className="bg-white border-[#D1D5DB]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-[#1E3A5F]">
                      {chaperone.participantName}
                    </CardTitle>
                    {chaperone.participantEmail && (
                      <p className="text-sm text-[#6B7280] mt-1">{chaperone.participantEmail}</p>
                    )}
                  </div>
                  {getStatusBadge(chaperone.status)}
                </div>
              </CardHeader>
              <CardContent>
                {/* Existing Certificates */}
                {chaperone.certificates.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#1E3A5F] mb-2">Uploaded Certificates</h4>
                    <div className="space-y-2">
                      {chaperone.certificates.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-[#9C8466]" />
                            <div>
                              <p className="text-sm font-medium text-[#1F2937]">{cert.originalFilename}</p>
                              <p className="text-xs text-[#6B7280]">
                                {cert.programName && `${cert.programName} • `}
                                Uploaded {new Date(cert.uploadedAt).toLocaleDateString()}
                              </p>
                              {cert.expirationDate && (
                                <p className="text-xs text-[#6B7280]">
                                  Expires: {new Date(cert.expirationDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getCertificateStatusBadge(cert.status)}
                            <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Form */}
                {uploadingFor === chaperone.participantId ? (
                  <div className="space-y-4 p-4 bg-gray-50 rounded border border-gray-200">
                    <h4 className="text-sm font-medium text-[#1E3A5F]">Upload New Certificate</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate File (PDF only, max 5MB)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Program Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={uploadFormData.programName}
                        onChange={(e) => setUploadFormData({ ...uploadFormData, programName: e.target.value })}
                        placeholder="e.g., Virtus Training"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Completion Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={uploadFormData.completionDate}
                          onChange={(e) => setUploadFormData({ ...uploadFormData, completionDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiration Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={uploadFormData.expirationDate}
                          onChange={(e) => setUploadFormData({ ...uploadFormData, expirationDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C8466] focus:border-[#9C8466]"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleUpload(chaperone.participantId)}
                        disabled={!selectedFile}
                        className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Certificate
                      </Button>
                      <Button
                        onClick={() => {
                          setUploadingFor(null)
                          setSelectedFile(null)
                          setUploadFormData({ programName: '', completionDate: '', expirationDate: '' })
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setUploadingFor(chaperone.participantId)}
                    variant="outline"
                    size="sm"
                    className="border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {chaperone.certificates.length > 0 ? 'Upload New Certificate' : 'Upload Certificate'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
