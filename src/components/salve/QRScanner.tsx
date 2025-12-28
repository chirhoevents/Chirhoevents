'use client'

import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRScannerProps {
  onScan: (accessCode: string) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

export function QRScanner({ onScan, onError, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    // Check camera permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(() => {
          setHasPermission(true)
        })
        .catch((err) => {
          console.error('Camera permission error:', err)
          setHasPermission(false)
          setError('Camera access denied. Please enable camera permissions.')
        })
    } else {
      setError('Camera not supported on this device')
      setHasPermission(false)
    }
  }, [])

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const scannedText = result[0].rawValue

      // Extract access code from scanned text
      let accessCode = scannedText

      // If it's a URL like "https://chirhoevents.com/check-in/ABC123"
      if (scannedText.includes('/')) {
        const parts = scannedText.split('/')
        accessCode = parts[parts.length - 1]
      }

      // Clean up the code - remove query params if any
      if (accessCode.includes('?')) {
        accessCode = accessCode.split('?')[0]
      }

      accessCode = accessCode.trim()

      // Stop scanning
      setScanning(false)

      // Call parent with access code
      onScan(accessCode)
    }
  }

  const handleError = (err: any) => {
    console.error('QR Scanner Error:', err)
    const errorMessage = err?.message || 'Camera access denied or not available'
    setError(errorMessage)
    if (onError) {
      onError(err)
    }
  }

  const resetScanner = () => {
    setError(null)
    setScanning(true)
  }

  if (hasPermission === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <CameraOff className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Camera Access Required</h3>
        <p className="text-red-600 mb-4">
          {error || 'Please enable camera access in your browser settings to scan QR codes.'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={resetScanner} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="ghost">
              Use Manual Entry
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (hasPermission === null) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4 animate-pulse" />
        <p className="text-gray-600">Requesting camera access...</p>
      </div>
    )
  }

  return (
    <div className="qr-scanner-container">
      {scanning && !error && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="rounded-lg overflow-hidden border-4 border-navy">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{
                facingMode: 'environment',
              }}
              styles={{
                container: {
                  width: '100%',
                  paddingTop: '100%',
                  position: 'relative',
                },
                video: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              }}
            />
          </div>

          {/* Scanning overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-gold w-48 h-48 rounded-lg" />
          </div>

          <p className="text-center mt-4 text-muted-foreground">
            <Camera className="w-4 h-4 inline mr-2" />
            Point camera at QR code
          </p>

          {onClose && (
            <Button onClick={onClose} variant="ghost" className="w-full mt-2">
              Cancel Scanning
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <CameraOff className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Scanner Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={resetScanner} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost">
                Use Manual Entry
              </Button>
            )}
          </div>
        </div>
      )}

      {!scanning && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-700 font-medium">QR Code Scanned Successfully!</p>
          <p className="text-green-600 text-sm mt-1">Looking up group...</p>
        </div>
      )}
    </div>
  )
}
