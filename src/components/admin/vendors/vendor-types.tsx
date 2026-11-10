import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

export interface CustomAnswer {
  questionText: string
  answerText: string | null
}

export interface InvoiceLineItem {
  description: string
  amount: number
}

export interface VendorRegistration {
  id: string
  businessName: string
  contactFirstName: string
  contactLastName: string
  email: string
  phone: string
  boothDescription: string
  selectedTier: string
  tierPrice: number | string
  additionalNeeds: string | null
  logoUrl: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  rejectionReason: string | null
  approvedAt: string | null
  invoiceLineItems: InvoiceLineItem[] | null
  invoiceTotal: number | string | null
  invoiceNotes: string | null
  paymentStatus: 'unpaid' | 'partial' | 'paid' | string
  amountPaid: number | string
  paidAt?: string | null
  vendorCode: string
  accessCode: string
  porosAccessCode: string | null
  liabilityFormId: string | null
  liabilityForm?: { completed: boolean } | null
  safeEnvironmentCertUrl: string | null
  safeEnvironmentCertUploadedAt: string | null
  createdAt: string
  _count?: { boothStaff: number; leads?: number }
  customAnswers?: CustomAnswer[]
}

export interface VendorTierOption {
  id: string
  name: string
  price: number
  active: boolean
}

export type GetToken = () => Promise<string | null>

/** fetch wrapper for the admin vendor API that surfaces the server's error text. */
export async function vendorApi<T = Record<string, unknown>>(
  getToken: GetToken,
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const token = await getToken()
    const res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || data.message || res.statusText }
    return { ok: true, data: data as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export const money = (n: number | string | null | undefined) => `$${Number(n || 0).toFixed(2)}`

export function vendorBalance(v: Pick<VendorRegistration, 'invoiceTotal' | 'amountPaid'>): number {
  return Math.round((Number(v.invoiceTotal || 0) - Number(v.amountPaid || 0)) * 100) / 100
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    case 'approved':
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    case 'rejected':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function PaymentBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-500">Paid</Badge>
    case 'partial':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          Partial
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          Unpaid
        </Badge>
      )
  }
}
