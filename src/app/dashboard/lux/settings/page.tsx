'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Copy, ExternalLink, Sun, Building2, Palette, Users, CreditCard, Plug, Bell } from 'lucide-react'
import { useLux, useLuxApi } from '@/contexts/LuxContext'
import { useAdminContext } from '@/contexts/AdminContext'
import { canManageTeam } from '@/lib/permissions'
import { toast } from '@/lib/toast'
import { describeFeeRules, type FeeRules } from '@/lib/lux/family-fees'
import { Button, Card, ErrorNote, Field, PageHeader, Select, Spinner, Tabs, TextArea, TextInput, Toggle } from '@/components/lux/ui'
import OrganizationSettingsTab from '@/components/admin/settings/OrganizationSettingsTab'
import TeamSettingsTab from '@/components/admin/settings/TeamSettingsTab'
import IntegrationsSettingsTab from '@/components/admin/settings/IntegrationsSettingsTab'
import BillingSettingsTab from '@/components/admin/settings/BillingSettingsTab'
import BrandingSettingsTab from '@/components/admin/settings/BrandingSettingsTab'
import NotificationsSettingsTab from '@/components/admin/settings/NotificationsSettingsTab'

type TabKey = 'lux' | 'organization' | 'branding' | 'team' | 'billing' | 'integrations' | 'notifications'

interface LuxSettings {
  feeRules: FeeRules
  officePaymentInstructions: string
  publicSlug: string
  documentStorageReady: boolean
}

function LuxSettingsTab() {
  const api = useLuxApi()
  const { info, refresh } = useLux()
  const [loaded, setLoaded] = useState<LuxSettings | null>(null)
  const [slug, setSlug] = useState('')
  const [rules, setRules] = useState<FeeRules | null>(null)
  const [thirdDifferent, setThirdDifferent] = useState(false)
  const [office, setOffice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<LuxSettings>('/api/lux/settings').then(s => {
      setLoaded(s)
      setSlug(s.publicSlug)
      setRules(s.feeRules)
      setThirdDifferent(s.feeRules.siblingDiscount.thirdPlusValue !== null)
      setOffice(s.officePaymentInstructions)
    }).catch(e => setError(e.message))
  }, [api])

  const effectiveRules = useMemo<FeeRules | null>(() => rules && ({
    ...rules,
    siblingDiscount: { ...rules.siblingDiscount, thirdPlusValue: thirdDifferent ? rules.siblingDiscount.thirdPlusValue ?? rules.siblingDiscount.value : null },
  }), [rules, thirdDifferent])

  if (error && !loaded) return <ErrorNote message={error} />
  if (!loaded || !rules || !effectiveRules) return <Spinner />

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sd = rules.siblingDiscount
  const setSd = (patch: Partial<FeeRules['siblingDiscount']>) => setRules({ ...rules, siblingDiscount: { ...sd, ...patch } })
  const unit = sd.type === 'percent' ? '%' : '$'

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api('/api/lux/settings', {
        method: 'PUT',
        json: { publicSlug: slug.trim().toLowerCase(), feeRules: effectiveRules, officePaymentInstructions: office },
      })
      toast.success('Settings saved')
      setLoaded({ ...loaded, publicSlug: slug.trim().toLowerCase(), feeRules: effectiveRules, officePaymentInstructions: office })
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const disabled = !info.canManage

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      {!loaded.documentStorageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Document uploads aren’t available yet.</strong> Secure storage for certificates is still being set up for your account. Contact ChiRho Events support with questions.
        </div>
      )}

      <Card title="Your parish page" description="One link for families to register for programs and events. Put it in the bulletin and on your website.">
        <Field label="Address" hint="Lowercase letters, numbers and dashes. Changing it breaks links you’ve already shared.">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#C8A24A]/50">
              <span className="pl-3 text-sm text-gray-500 whitespace-nowrap">{origin.replace(/^https?:\/\//, '')}/lux/</span>
              <input className="flex-1 min-w-0 px-1 py-2 text-sm outline-none" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} disabled={disabled} />
            </div>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(`${origin}/lux/${loaded.publicSlug}`); toast.success('Link copied') }}><Copy className="h-4 w-4" /> Copy</Button>
            <Button variant="ghost" href={`/lux/${loaded.publicSlug}`}><ExternalLink className="h-4 w-4" /> Open</Button>
          </div>
        </Field>
      </Card>

      <Card title="Sibling discount & family maximum" description="Applied automatically when a family registers more than one child. Each program can opt out.">
        <div className="space-y-5">
          <Field label="Sibling discount">
            <Select value={sd.type} onChange={e => setSd({ type: e.target.value as FeeRules['siblingDiscount']['type'] })} disabled={disabled} className="sm:w-72">
              <option value="none">No sibling discount</option>
              <option value="amount">A dollar amount off each additional child</option>
              <option value="percent">A percent off each additional child</option>
            </Select>
          </Field>
          {sd.type !== 'none' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={`Off the second child (${unit})`}>
                <TextInput type="number" min="0" step={sd.type === 'percent' ? '1' : '0.01'} max={sd.type === 'percent' ? 100 : undefined}
                  value={sd.value} onChange={e => setSd({ value: Math.max(0, Number(e.target.value) || 0) })} disabled={disabled} />
              </Field>
              <div className="space-y-2">
                <Toggle checked={thirdDifferent} onChange={setThirdDifferent} disabled={disabled} label="Different amount from the third child on" />
                {thirdDifferent && (
                  <TextInput type="number" min="0" step={sd.type === 'percent' ? '1' : '0.01'} max={sd.type === 'percent' ? 100 : undefined}
                    value={sd.thirdPlusValue ?? sd.value} onChange={e => setSd({ thirdPlusValue: Math.max(0, Number(e.target.value) || 0) })} disabled={disabled} />
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">The most expensive child pays full price; the discount comes off the others. It applies to tuition and to extra fees you mark as discountable.</p>
          <Field label="Family maximum per year ($)" hint="The most one family pays for all their children in a school year. Leave blank for no maximum.">
            <TextInput type="number" min="0" step="0.01" className="sm:w-48" disabled={disabled}
              value={rules.familyCap ?? ''} onChange={e => setRules({ ...rules, familyCap: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
          <div className="rounded-lg bg-[#FAF8F3] px-4 py-3 text-sm text-[#1E3A5F]">
            <span className="text-gray-500">Families will see: </span>{describeFeeRules(effectiveRules)}
          </div>
        </div>
      </Card>

      <Card title="Paying at the office" description="Shown to families who choose to pay in person, and in their confirmation email.">
        <TextArea rows={3} value={office} onChange={e => setOffice(e.target.value)} disabled={disabled}
          placeholder="Bring cash or a check made out to St. Mary Parish to the parish office, Monday–Thursday 9am–4pm." />
      </Card>

      {info.canManage && (
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save settings</Button>
        </div>
      )}
    </div>
  )
}

function SettingsInner() {
  const router = useRouter()
  const search = useSearchParams()
  const { userRole } = useAdminContext()
  const canAccessIntegrations = userRole === 'org_admin' || userRole === 'master_admin'
  const canAccessTeam = userRole ? canManageTeam(userRole) : false

  const tabs: Array<{ value: TabKey; label: React.ReactNode; show: boolean }> = [
    { value: 'lux', label: <span className="flex items-center gap-1.5"><Sun className="h-4 w-4" /> Lux</span>, show: true },
    { value: 'organization', label: <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Parish</span>, show: true },
    { value: 'branding', label: <span className="flex items-center gap-1.5"><Palette className="h-4 w-4" /> Logo &amp; colors</span>, show: true },
    { value: 'team', label: <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Team</span>, show: canAccessTeam },
    { value: 'integrations', label: <span className="flex items-center gap-1.5"><Plug className="h-4 w-4" /> Card payments</span>, show: canAccessIntegrations },
    { value: 'billing', label: <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Plan &amp; billing</span>, show: canAccessIntegrations },
    { value: 'notifications', label: <span className="flex items-center gap-1.5"><Bell className="h-4 w-4" /> Notifications</span>, show: true },
  ]
  const visible = tabs.filter(t => t.show)
  const requested = search.get('tab') as TabKey | null
  const tab: TabKey = visible.some(t => t.value === requested) ? requested! : 'lux'

  const setTab = (value: TabKey) => {
    const params = new URLSearchParams(search.toString())
    if (value === 'lux') params.delete('tab')
    else params.set('tab', value)
    const qs = params.toString()
    router.replace(`/dashboard/lux/settings${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Tabs value={tab} onChange={setTab} tabs={visible.map(({ value, label }) => ({ value, label }))} />
      {tab === 'lux' && <LuxSettingsTab />}
      {tab === 'organization' && <OrganizationSettingsTab />}
      {tab === 'branding' && <BrandingSettingsTab />}
      {tab === 'team' && <TeamSettingsTab />}
      {tab === 'integrations' && <IntegrationsSettingsTab />}
      {tab === 'billing' && <BillingSettingsTab />}
      {tab === 'notifications' && <NotificationsSettingsTab />}
    </div>
  )
}

export default function LuxSettingsPage() {
  return <Suspense fallback={<Spinner />}><SettingsInner /></Suspense>
}
