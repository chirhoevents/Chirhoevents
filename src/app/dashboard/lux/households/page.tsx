'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Users, Download } from 'lucide-react'
import { useLuxApi } from '@/contexts/LuxContext'
import { downloadFromApi } from '@/lib/lux/download'
import { useAuth } from '@clerk/nextjs'
import { toast } from '@/lib/toast'
import { formatMoney } from '@/lib/lux/format'
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, Select, Spinner, TextInput } from '@/components/lux/ui'

interface HouseholdRow {
  id: string
  name: string
  secondGuardian: string | null
  email: string
  phone: string
  children: string[]
  activeRegistrations: number
  owed: number
  missingDocuments: number
  assistanceRequested: boolean
}

export default function HouseholdsPage() {
  const api = useLuxApi()
  const { getToken } = useAuth()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [rows, setRows] = useState<HouseholdRow[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ filter, ...(q.trim() ? { q: q.trim() } : {}) })
      api<{ households: HouseholdRow[]; truncated: boolean }>(`/api/lux/households?${params}`)
        .then(d => { setRows(d.households); setTruncated(d.truncated) })
        .catch(e => setError(e.message))
    }, q ? 250 : 0)
    return () => clearTimeout(handle)
  }, [api, q, filter])

  const exportAll = async () => {
    try {
      await downloadFromApi(getToken, '/api/lux/exports/households', 'households.csv')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Households"
        description="Every family on file. Their information carries over from year to year."
        actions={<Button variant="secondary" onClick={exportAll}><Download className="h-4 w-4" /> Export</Button>}
      />
      <Card>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search by parent, child, email or phone" className="pl-9" />
          </div>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="sm:w-56">
            <option value="all">All families</option>
            <option value="owes">Owe money</option>
            <option value="documents">Missing documents</option>
            <option value="assistance">Asked for fee assistance</option>
          </Select>
        </div>
        <ErrorNote message={error} />
        {!rows ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title={q || filter !== 'all' ? 'No matching families' : 'No families yet'}
            description={q || filter !== 'all' ? undefined : 'Families appear here when they register their children for a program.'} />
        ) : (
          <>
            <div className="divide-y divide-[#F0EBDF] -mx-5">
              {rows.map(h => (
                <Link key={h.id} href={`/dashboard/lux/households/${h.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#FAF8F3]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1E3A5F] truncate">{h.name}{h.secondGuardian && <span className="font-normal text-gray-500"> & {h.secondGuardian}</span>}</p>
                    <p className="text-xs text-gray-500 truncate">{h.children.length ? h.children.join(', ') : 'No children'} · {h.email}</p>
                  </div>
                  <div className="hidden md:flex flex-wrap justify-end gap-1 w-64">
                    {h.assistanceRequested && <Badge tone="blue">Fee assistance</Badge>}
                    {h.missingDocuments > 0 && <Badge tone="amber">{h.missingDocuments} doc{h.missingDocuments === 1 ? '' : 's'} missing</Badge>}
                    {h.owed > 0 && <Badge tone="amber">Owes {formatMoney(h.owed)}</Badge>}
                    {h.activeRegistrations === 0 && <Badge>Not registered this year</Badge>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
            {truncated && <p className="text-xs text-gray-500 mt-3">Showing the first 1,000. Search to narrow it down.</p>}
          </>
        )}
      </Card>
    </div>
  )
}
