'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

const VALID_CODES = ['STMARY-2026', 'SJP2-EARLY', 'HOLYFAM-2026', 'DEMO-2026']

export default function LinkAccessCodePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLinking(true)
    setTimeout(() => {
      if (VALID_CODES.includes(code.trim().toUpperCase())) {
        setLinking(false)
        router.push('/demo/dashboard/group-leader')
      } else {
        setLinking(false)
        setError('That code doesn\'t match any registration in our demo. Try STMARY-2026, SJP2-EARLY, or DEMO-2026.')
      }
    }, 600)
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy/10 mb-4">
          <Key className="w-8 h-8 text-navy" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">Link Access Code</h1>
        <p className="text-muted-foreground">
          Enter the access code your organization emailed you to unlock your group&apos;s dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Enter your code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Access code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="STMARY-2026"
                className="mt-1 font-mono text-lg"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!code.trim() || linking}
              className="w-full bg-navy hover:bg-navy/90 text-white"
            >
              {linking ? 'Linking…' : 'Link Code'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 p-3 bg-[#F5F1E8] border border-[#E1D5BA] rounded text-xs text-slate-700">
            <p className="font-medium mb-1 flex items-center gap-1 text-navy">
              <CheckCircle className="w-3 h-3" />
              Demo codes that work
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="font-mono">STMARY-2026</code></li>
              <li><code className="font-mono">SJP2-EARLY</code></li>
              <li><code className="font-mono">HOLYFAM-2026</code></li>
              <li><code className="font-mono">DEMO-2026</code></li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Don&apos;t have a code?{' '}
            <Link href="/demo/events" className="text-navy hover:underline">
              Register a group first
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
