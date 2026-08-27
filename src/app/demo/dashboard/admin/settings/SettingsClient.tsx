'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Plug, CreditCard, Palette, Bell, Check, Trash2, Mail } from 'lucide-react'

interface SettingsClientProps {
  organizationName?: string
}

export default function SettingsClient({ organizationName = 'your organization' }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('organization')
  const displayOrgName = organizationName

  const notImplemented = (what: string) => () =>
    alert(`Demo: ${what} — this would save to the real database in the live product.`)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Organization Settings
        </h1>
        <p className="text-[#6B7280]">
          Manage settings for {displayOrgName}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="organization" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E3A5F]">Organization Details</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Organization name</Label>
                  <Input defaultValue={displayOrgName} className="mt-1" />
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input defaultValue="admin@steubenvilleministries.org" type="email" className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input defaultValue="555-0100" className="mt-1" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input defaultValue="https://steubenvilleministries.org" className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input defaultValue="1235 University Blvd, Steubenville, OH 43952" className="mt-1" />
                </div>
              </div>
              <Button onClick={notImplemented('Save organization details')} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E3A5F]">Branding</CardTitle>
              <CardDescription>Customize colors and logo shown across your portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Primary color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-10 h-10 rounded border border-gray-300" style={{ backgroundColor: '#1E3A5F' }} />
                    <Input defaultValue="#1E3A5F" className="font-mono" />
                  </div>
                </div>
                <div>
                  <Label>Secondary color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-10 h-10 rounded border border-gray-300" style={{ backgroundColor: '#9C8466' }} />
                    <Input defaultValue="#9C8466" className="font-mono" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Organization logo</Label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Palette className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Drag & drop a logo, or click to upload</p>
                </div>
              </div>
              <Button onClick={notImplemented('Save branding')} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#1E3A5F]">Team Members</CardTitle>
                  <CardDescription>Invite and manage users in your organization</CardDescription>
                </div>
                <Button onClick={notImplemented('Invite team member')} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                {[
                  { name: 'Demo Admin', email: 'admin@steubenvilleministries.org', role: 'Org Admin' },
                  { name: 'Sarah Martinez', email: 'sarah@steubenvilleministries.org', role: 'Event Manager' },
                  { name: 'Michael Chen', email: 'mchen@steubenvilleministries.org', role: 'Finance Manager' },
                  { name: 'Rebecca Johnson', email: 'rjohnson@steubenvilleministries.org', role: 'Salve Coordinator' },
                ].map((m) => (
                  <div key={m.email} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#9C8466] text-white flex items-center justify-center font-semibold">
                        {m.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E3A5F]">{m.name}</div>
                        <div className="text-sm text-gray-500">{m.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{m.role}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={notImplemented(`Remove ${m.name}`)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E3A5F]">Current Plan</CardTitle>
              <CardDescription>Your subscription tier and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-[#1E3A5F] text-white rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">Current tier</p>
                    <p className="text-2xl font-bold">Professional</p>
                    <p className="text-sm text-white/70">$149 / month</p>
                  </div>
                  <Button variant="secondary" onClick={notImplemented('View plan details')}>
                    Change Plan
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Events this year</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">
                    5 <span className="text-sm text-gray-500 font-normal">/ 25</span>
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Registrations this year</p>
                  <p className="text-2xl font-bold text-[#1E3A5F]">
                    247 <span className="text-sm text-gray-500 font-normal">/ 2000</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E3A5F]">Payment Processing</CardTitle>
              <CardDescription>Connect your Stripe account to accept payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-900">Stripe Connected</p>
                    <p className="text-sm text-emerald-700">Payouts arrive in 2 business days</p>
                  </div>
                </div>
                <Button variant="outline" onClick={notImplemented('Disconnect Stripe')}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1E3A5F]">Notification Preferences</CardTitle>
              <CardDescription>Choose what emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'New registration confirmations',
                'Daily registration digest',
                'Payment failures and refunds',
                'Vendor applications',
                'Support ticket replies',
                'Weekly financial summary',
              ].map((label) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm">{label}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#1E3A5F]" />
                </div>
              ))}
              <Button onClick={notImplemented('Save notification preferences')} className="bg-[#1E3A5F] hover:bg-[#2A4A6F] text-white mt-4">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
