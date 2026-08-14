'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Settings, CreditCard, Zap, Shield, DollarSign, Save } from 'lucide-react'

export default function PlatformSettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">Platform Settings</h1>
        <p className="text-muted-foreground">Configure ChiRho platform behavior</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Pricing Tiers
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Stripe
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Platform Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Platform name</Label>
                <Input defaultValue="ChiRho Events" className="mt-1" />
              </div>
              <div>
                <Label>Support email</Label>
                <Input type="email" defaultValue="support@chirhoevents.com" className="mt-1" />
              </div>
              <div>
                <Label>Marketing site URL</Label>
                <Input defaultValue="https://chirhoevents.com" className="mt-1" />
              </div>
              <Button onClick={handleSave} className="bg-navy hover:bg-navy/90 text-white">
                <Save className="w-4 h-4 mr-1" />
                {saved ? 'Saved' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Pricing Tiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Trial', price: 0, events: 1, regs: 50 },
                { name: 'Starter', price: 49, events: 5, regs: 250 },
                { name: 'Professional', price: 149, events: 25, regs: 2000 },
                { name: 'Enterprise', price: 349, events: 100, regs: 10000 },
              ].map((t) => (
                <div key={t.name} className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-navy">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.events} events/year · {t.regs.toLocaleString()} registrations/year
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-navy">${t.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => alert('Demo: Would open the pricing editor to add or modify tiers.')}
                variant="outline"
                className="mt-3"
              >
                Edit Tiers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Stripe Connect (Platform)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div>
                  <p className="font-medium text-emerald-900">Live Mode — Connected</p>
                  <p className="text-sm text-emerald-800">acct_1AbC…d3F8</p>
                </div>
              </div>
              <div>
                <Label>Platform application fee (per transaction)</Label>
                <div className="relative mt-1 max-w-xs">
                  <Input defaultValue="2.9" className="pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <Button onClick={handleSave} className="bg-navy hover:bg-navy/90 text-white">
                <Save className="w-4 h-4 mr-1" />
                {saved ? 'Saved' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Waitlist beta', enabled: true },
                { name: 'Custom report builder', enabled: true },
                { name: 'Vendor portal', enabled: true },
                { name: 'Bulk SMS reminders (beta)', enabled: false },
                { name: 'Kids under 6 group discount', enabled: false },
                { name: 'Multi-currency support', enabled: false },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="font-medium">{f.name}</span>
                  <Badge className={f.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
                    {f.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-navy">Security & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SecurityRow label="Require 2FA for master admins" enabled />
              <SecurityRow label="Session timeout after 8 hours" enabled />
              <SecurityRow label="Audit log for privileged actions" enabled />
              <SecurityRow label="HIPAA-mode for Rapha portal" enabled />
              <SecurityRow label="Enforce strong passwords across all orgs" enabled />
              <SecurityRow label="Impersonation notifications" enabled />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SecurityRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <span>{label}</span>
      <Badge className={enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
        {enabled ? 'On' : 'Off'}
      </Badge>
    </div>
  )
}
