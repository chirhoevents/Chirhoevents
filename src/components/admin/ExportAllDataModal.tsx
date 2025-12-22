'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface ExportAllDataModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportAllDataModal({
  isOpen,
  onClose,
}: ExportAllDataModalProps) {
  const [exporting, setExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setExportComplete(false)

    try {
      const response = await fetch('/api/admin/exports/all-data', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate export')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'complete-data.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportComplete(true)
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleClose = () => {
    setExportComplete(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#1E3A5F] flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export All Data
          </DialogTitle>
          <DialogDescription>
            Download a comprehensive CSV file with all your organization data.
          </DialogDescription>
        </DialogHeader>

        {exportComplete ? (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Export Complete
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Your data has been exported and the download should start automatically.
            </p>
            <Button onClick={handleClose} className="bg-[#1E3A5F] hover:bg-[#2A4A6F]">
              Close
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Export Failed
            </h3>
            <p className="text-red-600 text-center mb-6">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F]"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                This export includes:
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9C8466]" />
                  All registrations (group and individual)
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9C8466]" />
                  All participants with details
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9C8466]" />
                  Payment information and balances
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9C8466]" />
                  Form completion status
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9C8466]" />
                  Medical and dietary information
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={exporting}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
