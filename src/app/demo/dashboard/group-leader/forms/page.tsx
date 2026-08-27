'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, AlertCircle, Mail, Download } from 'lucide-react'

interface FormEntry {
  id: string
  participant: string
  age: number
  role: 'participant' | 'chaperone' | 'leader'
  formType: string
  status: 'signed' | 'pending' | 'sent'
  signedAt?: string
}

const INITIAL: FormEntry[] = [
  { id: 'f1', participant: 'Ana Garcia', age: 16, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'signed', signedAt: '2026-06-01' },
  { id: 'f2', participant: 'Isabella Martinez', age: 15, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'signed', signedAt: '2026-06-02' },
  { id: 'f3', participant: 'Sofia Nguyen', age: 17, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'signed', signedAt: '2026-06-05' },
  { id: 'f4', participant: 'Ben Smith', age: 15, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'sent' },
  { id: 'f5', participant: 'Chris Lee', age: 17, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'signed', signedAt: '2026-06-10' },
  { id: 'f6', participant: "David O'Connor", age: 16, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'signed', signedAt: '2026-06-12' },
  { id: 'f7', participant: 'Ethan Patel', age: 14, role: 'participant', formType: 'Youth Under 18 (Parent signature)', status: 'pending' },
  { id: 'f8', participant: 'Maria Thompson', age: 42, role: 'chaperone', formType: 'Chaperone (Adult)', status: 'signed', signedAt: '2026-05-28' },
  { id: 'f9', participant: 'James Rodriguez', age: 38, role: 'chaperone', formType: 'Chaperone (Adult)', status: 'signed', signedAt: '2026-05-30' },
  { id: 'f10', participant: 'Sample Leader', age: 35, role: 'leader', formType: 'Adult (Self signature)', status: 'pending' },
]

const statusColors: Record<string, string> = {
  signed: 'bg-emerald-100 text-emerald-800',
  sent: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormEntry[]>(INITIAL)

  const signed = forms.filter((f) => f.status === 'signed').length
  const pct = forms.length > 0 ? Math.round((signed / forms.length) * 100) : 0

  const remind = (id: string) => {
    setForms((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'sent' as const } : f)))
    alert('Demo: Would send a reminder email.')
  }

  const remindAll = () => {
    const pending = forms.filter((f) => f.status !== 'signed').length
    setForms((prev) => prev.map((f) => (f.status !== 'signed' ? { ...f, status: 'sent' as const } : f)))
    alert(`Demo: Would send ${pending} reminder emails.`)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-1">Liability Forms</h1>
          <p className="text-[#6B7280]">
            Track waivers for every participant. Under-18 forms require a parent signature.
          </p>
        </div>
        <Button onClick={remindAll} className="bg-[#9C8466] hover:bg-[#8B7355] text-white">
          <Mail className="w-4 h-4 mr-2" />
          Remind Pending
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#1E3A5F]">Progress</CardTitle>
            <span className="text-sm text-muted-foreground">
              {signed} of {forms.length} signed
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-[#1E3A5F] to-[#9C8466] h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{signed} signed</span>
            <span>{pct}%</span>
            <span>{forms.length - signed} pending</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {forms.map((f) => (
              <div key={f.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-[#9C8466] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1E3A5F]">{f.participant}</h3>
                      <Badge className={`${statusColors[f.status]} text-xs`}>
                        {f.status === 'signed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {f.status !== 'signed' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {f.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Age {f.age} · {f.role} · {f.formType}
                    </p>
                    {f.signedAt && (
                      <p className="text-xs text-muted-foreground">Signed {f.signedAt}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {f.status === 'signed' ? (
                    <Button
                      onClick={() => alert(`Demo: Would download signed waiver PDF for ${f.participant}.`)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  ) : (
                    <Button
                      onClick={() => remind(f.id)}
                      variant="outline"
                      size="sm"
                      className="border-[#9C8466] text-[#9C8466] hover:bg-[#9C8466] hover:text-white"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Remind
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
