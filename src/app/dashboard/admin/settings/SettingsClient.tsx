'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Users, Plug } from 'lucide-react'
import OrganizationSettingsTab from '@/components/admin/settings/OrganizationSettingsTab'
import TeamSettingsTab from '@/components/admin/settings/TeamSettingsTab'
import IntegrationsSettingsTab from '@/components/admin/settings/IntegrationsSettingsTab'

interface SettingsClientProps {
  organizationName: string
}

export default function SettingsClient({ organizationName }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('organization')

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
            value="team"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettingsTab />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamSettingsTab />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
