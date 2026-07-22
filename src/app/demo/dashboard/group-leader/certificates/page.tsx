'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Upload, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Cert {
  id: string
  chaperone: string
  status: 'verified' | 'uploaded' | 'missing'
  uploadedAt?: string
  expiresAt?: string
}

const INITIAL_CERTS: Cert[] = [
  { id: 'c1', chaperone: 'Maria Thompson', status: 'verified', uploadedAt: '2026-04-15', expiresAt: '2027-04-15' },
  { id: 'c2', chaperone: 'James Rodriguez', status: 'uploaded', uploadedAt: '2026-06-10' },
]

const statusInfo: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  uploaded: { label: 'Uploaded — awaiting verification', color: 'bg-amber-100 text-amber-800', icon: Clock },
  missing: { label: 'Not uploaded', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>(INITIAL_CERTS)

  const upload = (id: string) => {
    setCerts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'uploaded' as const, uploadedAt: new Date().toISOString().slice(0, 10) } : c)),
    )
    alert('Demo: Would upload a PDF/photo of the Safe Environment certificate.')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Safe Environment Certificates</h1>
        <p className="text-[#6B7280]">
          Every chaperone must have a current Safe Environment certificate on file before the event
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Diocesan requirement:</strong> All chaperones working with youth must complete
              Safe Environment training and upload a valid certificate. Certificates expire annually.
              The event admin reviews and verifies each upload.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Chaperone Certificates ({certs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {certs.map((c) => {
              const info = statusInfo[c.status]
              const Icon = info.icon
              return (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#9C8466]/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-[#9C8466]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1E3A5F]">{c.chaperone}</h3>
                        <Badge className={info.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {info.label}
                        </Badge>
                      </div>
                      {c.uploadedAt && (
                        <p className="text-xs text-muted-foreground">Uploaded {c.uploadedAt}</p>
                      )}
                      {c.expiresAt && (
                        <p className="text-xs text-muted-foreground">Expires {c.expiresAt}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'missing' && (
                      <Button
                        onClick={() => upload(c.id)}
                        size="sm"
                        className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    )}
                    {c.status !== 'missing' && (
                      <>
                        <Button
                          onClick={() => alert(`Demo: Would open the uploaded certificate for ${c.chaperone}.`)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          onClick={() => upload(c.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Certificates of Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            After the event, download printable completion certificates for every participant.
          </p>
          <Button
            onClick={() => alert('Demo: Would generate a printable PDF with completion certificates for every participant.')}
            className="bg-[#9C8466] hover:bg-[#8B7355] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download All Completion Certificates
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
