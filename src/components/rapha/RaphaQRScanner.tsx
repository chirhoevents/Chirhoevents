'use client'

import { useState, useEffect } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Camera, CameraOff, RefreshCw, QrCode, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RaphaQRScannerProps {
  onScan: (data: string) => void
  onError?: (error: Error) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RaphaQRScanner({ onScan, onError, open, onOpenChange }: RaphaQRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (open) {
      // Reset state when opening
      setScanning(true)
      setError(null)

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
    }
  }, [open])

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      const scannedText = result[0].rawValue.trim()

      // Stop scanning
      setScanning(false)

      // Pass raw data to parent - let parent handle parsing
      onScan(scannedText)

      // Close dialog after a brief delay
      setTimeout(() => {
        onOpenChange(false)
        setScanning(true)
      }, 500)
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
    setHasPermission(null)

    // Re-check permission
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-red-600" />
            Scan Participant QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasPermission === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <CameraOff className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Camera Access Required</h3>
              <p className="text-red-600 mb-4">
                {error || 'Please enable camera access in your browser settings to scan QR codes.'}
              </p>
              <Button onClick={resetScanner} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {hasPermission === null && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4 animate-pulse" />
              <p className="text-gray-600">Requesting camera access...</p>
            </div>
          )}

          {hasPermission && scanning && !error && (
            <div className="relative w-full">
              <div className="rounded-lg overflow-hidden border-4 border-red-600">
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
                <div className="border-2 border-white w-48 h-48 rounded-lg opacity-50" />
              </div>

              <p className="text-center mt-4 text-muted-foreground">
                <Camera className="w-4 h-4 inline mr-2" />
                Point camera at participant&apos;s name tag QR code
              </p>
            </div>
          )}

          {error && hasPermission && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <CameraOff className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Scanner Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={resetScanner} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {!scanning && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-700 font-medium">QR Code Scanned!</p>
              <p className="text-green-600 text-sm mt-1">Looking up participant...</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Scan the QR code on a participant&apos;s name tag to quickly access their medical information.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
