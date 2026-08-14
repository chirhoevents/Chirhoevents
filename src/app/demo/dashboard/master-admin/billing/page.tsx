'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface Invoice {
  id: string
  orgName: string
  amount: number
  issued: string
  due: string
  status: 'paid' | 'pending' | 'overdue' | 'sent'
}

const INVOICES: Invoice[] = [
  { id: 'INV-1042', orgName: 'Steubenville Ministries', amount: 149, issued: '2026-07-01', due: '2026-07-15', status: 'paid' },
  { id: 'INV-1041', orgName: 'Archdiocese of Denver Youth', amount: 349, issued: '2026-07-01', due: '2026-07-15', status: 'paid' },
  { id: 'INV-1040', orgName: 'St. Ignatius Retreat Center', amount: 149, issued: '2026-07-01', due: '2026-07-15', status: 'paid' },
  { id: 'INV-1039', orgName: 'Franciscan University Events', amount: 349, issued: '2026-07-01', due: '2026-07-15', status: 'sent' },
  { id: 'INV-1038', orgName: 'Diocese of Peoria Youth', amount: 149, issued: '2026-07-01', due: '2026-07-15', status: 'pending' },
  { id: 'INV-1037', orgName: 'Diocese of Sacramento', amount: 49, issued: '2026-06-01', due: '2026-06-15', status: 'overdue' },
  { id: 'INV-1036', orgName: 'Malvern Retreat House', amount: 49, issued: '2026-07-01', due: '2026-07-15', status: 'paid' },
]

const statusInfo: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

export default function BillingPage() {
  const totalCollected = INVOICES.filter((i) => i.status === 'paid').reduce((n, i) => n + i.amount, 0)
  const totalOutstanding = INVOICES.filter((i) => i.status !== 'paid').reduce((n, i) => n + i.amount, 0)
  const overdue = INVOICES.filter((i) => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy mb-1">Platform Billing</h1>
          <p className="text-muted-foreground">
            Invoices sent to organizations for their subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => alert('Demo: Would trigger monthly billing run — generate invoices for every active org.')}
            variant="outline"
          >
            Run Monthly Billing
          </Button>
          <Button
            onClick={() => alert('Demo: Would export invoices to CSV.')}
            className="bg-navy hover:bg-navy/90 text-white"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Collected (July)</p>
            <p className="text-2xl font-bold text-emerald-700">${totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-amber-700">${totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-700">{overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoices this cycle</p>
            <p className="text-2xl font-bold text-navy">{INVOICES.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Due</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy uppercase tracking-wide">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {INVOICES.map((i) => {
                const info = statusInfo[i.status]
                const Icon = info.icon
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{i.id}</td>
                    <td className="px-4 py-3 font-medium text-navy">{i.orgName}</td>
                    <td className="px-4 py-3">${i.amount}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{i.issued}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{i.due}</td>
                    <td className="px-4 py-3">
                      <Badge className={info.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {info.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => alert(`Demo: Would download PDF for invoice ${i.id}.`)}
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
