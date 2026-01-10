'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LinkAccessCodePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId } = useAuth()
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoLinking, setAutoLinking] = useState(false)
  const hasAutoLinked = useRef(false)

  // Check for pending access code from sessionStorage or URL
  useEffect(() => {
    if (hasAutoLinked.current) return

    // Check URL parameter first
    const codeFromUrl = searchParams.get('code')
    // Then check sessionStorage (saved from sign-in page)
    const codeFromStorage = typeof window !== 'undefined'
      ? sessionStorage.getItem('pendingAccessCode')
      : null

    const pendingCode = codeFromUrl || codeFromStorage

    if (pendingCode) {
      // Clear from sessionStorage so it doesn't persist
      if (codeFromStorage) {
        sessionStorage.removeItem('pendingAccessCode')
      }

      // Auto-fill and auto-submit
      setAccessCode(pendingCode.toUpperCase())
      setAutoLinking(true)
      hasAutoLinked.current = true

      // Auto-submit the code
      handleAutoLink(pendingCode.toUpperCase())
    }
  }, [searchParams])

  const handleAutoLink = async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/group-leader/link-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode: code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link access code')
      }

      // Successfully linked - redirect to dashboard
      router.push('/dashboard/group-leader')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setAutoLinking(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/group-leader/link-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link access code')
      }

      // Successfully linked - redirect to dashboard
      router.push('/dashboard/group-leader')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Show auto-linking state
  if (autoLinking && loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white border-[#D1D5DB]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#9C8466] border-t-transparent mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
              Linking Your Registration
            </h1>
            <p className="text-[#6B7280]">
              Access code: <span className="font-mono font-bold">{accessCode}</span>
            </p>
            <p className="text-sm text-[#6B7280] mt-2">
              Please wait while we connect your account...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white border-[#D1D5DB]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
            Link Your Registration
          </h1>
          <p className="text-[#6B7280]">
            Enter your group&apos;s access code to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="accessCode"
              className="block text-sm font-medium text-[#1F2937] mb-2"
            >
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="M2K2026-STMARYS-ABC1"
              className="w-full px-4 py-2 border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#9C8466] focus:border-transparent bg-[#F9FAFB]"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#9C8466] hover:bg-[#8B7355] text-white"
            disabled={loading}
          >
            {loading ? 'Linking...' : 'Link Registration'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#6B7280]">
            Don&apos;t have an access code?
          </p>
          <p className="text-sm text-[#6B7280] mt-1">
            You&apos;ll receive it via email after registering your group.
          </p>
        </div>
      </Card>
    </div>
  )
}
