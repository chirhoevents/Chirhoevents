'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console (in production, send to monitoring service)
    console.error('Global Application Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1E3A5F 0%, #0f1f33 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              maxWidth: '600px',
            }}
          >
            {/* Logo */}
            <div style={{ marginBottom: '2rem' }}>
              <svg
                width="60"
                height="60"
                viewBox="0 0 100 100"
                fill="none"
                style={{ margin: '0 auto' }}
              >
                <circle cx="50" cy="50" r="45" fill="#9C8466" fillOpacity="0.2" />
                <text
                  x="50"
                  y="60"
                  textAnchor="middle"
                  fill="#9C8466"
                  fontSize="40"
                  fontWeight="bold"
                >
                  XP
                </text>
              </svg>
            </div>

            {/* Error Badge */}
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
              }}
            >
              Critical Error
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '1rem',
              }}
            >
              Application Error
            </h1>

            {/* Message */}
            <p
              style={{
                fontSize: '1.125rem',
                color: '#d1d5db',
                marginBottom: '2rem',
                lineHeight: '1.6',
              }}
            >
              We&apos;re experiencing a critical error. Our team has been notified
              and is working to resolve this issue as quickly as possible.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '2rem',
              }}
            >
              <button
                onClick={() => reset()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#9C8466',
                  color: '#1E3A5F',
                  fontWeight: '600',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'white',
                  color: '#1E3A5F',
                  fontWeight: '600',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '1rem',
                }}
              >
                Go Home
              </a>
            </div>

            {/* Contact */}
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Need immediate assistance?{' '}
              <a
                href="mailto:support@chirhoevents.com"
                style={{ color: '#9C8466', textDecoration: 'underline' }}
              >
                Contact support
              </a>
            </p>

            {/* Error ID */}
            {error.digest && (
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '0.75rem',
                  marginTop: '1rem',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
