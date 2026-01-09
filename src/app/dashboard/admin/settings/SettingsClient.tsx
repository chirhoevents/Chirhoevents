'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Users, Plug, Loader2, CreditCard, Palette } from 'lucide-react'
import OrganizationSettingsTab from '@/components/admin/settings/OrganizationSettingsTab'
import TeamSettingsTab from '@/components/admin/settings/TeamSettingsTab'
import IntegrationsSettingsTab from '@/components/admin/settings/IntegrationsSettingsTab'
import BillingSettingsTab from '@/components/admin/settings/BillingSettingsTab'
import BrandingSettingsTab from '@/components/admin/settings/BrandingSettingsTab'
import { usePermissions } from '@/hooks/usePermissions'

interface SettingsClientProps {
  organizationName?: string
}

export default function SettingsClient({ organizationName = 'your organization' }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('organization')
  const { can, canManageTeam, loading, userRole } = usePermissions()

  // Only org_admin and master_admin can access integrations (Stripe)
  const canAccessIntegrations = userRole === 'org_admin' || userRole === 'master_admin'
  const canAccessTeam = canManageTeam()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Organization Settings
        </h1>
        <p className="text-[#6B7280]">
          Manage settings for {organizationName}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger
            value="organization"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          {canAccessTeam && (
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          {canAccessIntegrations && (
            <TabsTrigger
              value="billing"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
          {canAccessIntegrations && (
            <TabsTrigger
              value="integrations"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Plug className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettingsTab />
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <BrandingSettingsTab />
        </TabsContent>

        {canAccessTeam && (
          <TabsContent value="team" className="mt-6">
            <TeamSettingsTab />
          </TabsContent>
        )}

        {canAccessIntegrations && (
          <TabsContent value="billing" className="mt-6">
            <BillingSettingsTab />
          </TabsContent>
        )}

        {canAccessIntegrations && (
          <TabsContent value="integrations" className="mt-6">
            <IntegrationsSettingsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
