'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Settings,
  ArrowLeft,
  Loader2,
  User
} from 'lucide-react'
import { LiabilityFormsTab } from '@/components/admin/poros-liability/LiabilityFormsTab'
import { IndividualFormsTab } from '@/components/admin/poros-liability/IndividualFormsTab'
import { SafeEnvironmentTab } from '@/components/admin/poros-liability/SafeEnvironmentTab'
import { TemplatesTab } from '@/components/admin/poros-liability/TemplatesTab'

interface PorosLiabilityClientProps {
  eventId: string
  eventName: string
  organizationId: string
}

interface Stats {
  totalForms: number
  approvedForms: number
  pendingForms: number
  deniedForms: number
  totalCertificates: number
  verifiedCertificates: number
  pendingCertificates: number
}

export default function PorosLiabilityClient({
  eventId,
  eventName,
  organizationId
}: PorosLiabilityClientProps) {
  const { getToken } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [eventId])

  async function fetchStats() {
    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/events/${eventId}/poros-liability/stats`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(type: 'all' | 'medical' | 'certificates') {
    window.open(`/api/admin/events/${eventId}/poros-liability/export?type=${type}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <a href="/dashboard/admin" className="hover:text-[#1E3A5F]">Dashboard</a>
          <span>/</span>
          <a href="/dashboard/admin/events" className="hover:text-[#1E3A5F]">Events</a>
          <span>/</span>
          <a href={`/dashboard/admin/events/${eventId}`} className="hover:text-[#1E3A5F]">{eventName}</a>
          <span>/</span>
          <span className="text-[#1E3A5F] font-medium">Poros Liability Platform</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">Poros Liability Platform</h1>
            <p className="text-muted-foreground mt-1">
              Manage liability forms, Safe Environment certificates, and consent wording
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = `/dashboard/admin/events/${eventId}/poros`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Poros Portal
            </Button>
            <div className="relative group">
              <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('all')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg"
                >
                  Export All Data
                </button>
                <button
                  onClick={() => handleExport('medical')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Export Medical Info
                </button>
                <button
                  onClick={() => handleExport('certificates')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 last:rounded-b-lg"
                >
                  Export Certificates
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Forms</div>
              <div className="text-2xl font-bold text-[#1E3A5F]">{stats?.totalForms || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Approved</div>
              <div className="text-2xl font-bold text-green-600">{stats?.approvedForms || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Pending Review</div>
              <div className="text-2xl font-bold text-yellow-600">{stats?.pendingForms || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Safe Env. Certs</div>
              <div className="text-2xl font-bold text-purple-600">{stats?.totalCertificates || 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="forms" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto">
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Group Forms
          </TabsTrigger>
          <TabsTrigger value="individuals" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Individual Forms
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safe Environment Certificates
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Waiver Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms">
          <LiabilityFormsTab eventId={eventId} onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="individuals">
          <IndividualFormsTab eventId={eventId} onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="certificates">
          <SafeEnvironmentTab eventId={eventId} onUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab eventId={eventId} organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
