'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, RefreshCw, Mail, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console (in production, send to monitoring service)
    console.error('Application Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image with Navy Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/ChiRho Event Logos/ChiRho events BG.png"
          alt="ChiRho Events Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-navy/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <Image
            src="/logo-horizontal.png"
            alt="ChiRho Events"
            width={200}
            height={60}
            className="mx-auto"
          />
        </Link>

        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-red-500/20 p-4 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Something Went Wrong
        </h1>

        {/* Message */}
        <p className="text-xl text-gray-300 mb-8">
          We&apos;re sorry, but something unexpected happened.
          Our team has been notified and is working to fix the issue.
        </p>

        {/* Action Buttons */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-gray-300 mb-4">Try one of these options:</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-600 text-navy font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-navy font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
          </div>
        </div>

        {/* Error Details (for debugging - only in development) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-8 text-left">
            <p className="text-red-300 text-sm font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-red-400/60 text-xs mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Contact Support */}
        <p className="text-gray-400">
          If this problem persists,{' '}
          <a
            href="mailto:support@chirhoevents.com"
            className="inline-flex items-center gap-1 text-gold hover:underline"
          >
            <Mail className="w-4 h-4" />
            contact our support team
          </a>
        </p>
      </div>
    </div>
  )
}
