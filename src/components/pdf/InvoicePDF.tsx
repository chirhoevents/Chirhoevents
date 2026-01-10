import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  logoSubtext: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  statusPaid: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBlock: {
    width: '45%',
  },
  infoLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#333',
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableCell: {
    fontSize: 10,
  },
  tableCellDescription: {
    flex: 3,
  },
  tableCellAmount: {
    flex: 1,
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    marginTop: 4,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 9,
    color: '#666',
    marginTop: 8,
  },
  paymentInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
})

interface InvoiceData {
  invoiceNumber: number
  invoiceType: string
  amount: number
  description: string
  lineItems: Array<{ description: string; amount: number }> | null
  dueDate: string
  status: string
  paidAt: string | null
  createdAt: string
  periodStart: string | null
  periodEnd: string | null
  organization: {
    name: string
    legalName: string
    contactName: string
    contactEmail: string
    contactPhone: string
    address: { street?: string; city?: string; state?: string; zip?: string } | null
    tier: string
  }
}

interface InvoicePDFProps {
  invoice: InvoiceData
}

const formatDate = (dateInput: unknown): string => {
  try {
    if (!dateInput) return 'N/A'
    const dateStr = String(dateInput)
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'N/A'
  }
}

const formatCurrency = (amount: unknown): string => {
  try {
    const num = Number(amount) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  } catch {
    return '$0.00'
  }
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'paid':
      return styles.statusPaid
    case 'overdue':
      return styles.statusOverdue
    default:
      return styles.statusPending
  }
}

export const InvoicePDF = ({ invoice }: InvoicePDFProps) => {
  // Safely extract ALL data as primitives upfront
  // This prevents any objects from being rendered as React children

  const safeInvoice = invoice || {} as InvoiceData
  const safeOrg = (safeInvoice.organization || {}) as InvoiceData['organization']

  // Organization data - all converted to strings
  const orgName = String(safeOrg.legalName || safeOrg.name || 'Organization')
  const orgContactName = safeOrg.contactName ? String(safeOrg.contactName) : ''
  const orgContactEmail = safeOrg.contactEmail ? String(safeOrg.contactEmail) : ''
  const orgContactPhone = safeOrg.contactPhone ? String(safeOrg.contactPhone) : ''
  const orgTier = String(safeOrg.tier || 'Standard')

  // Build address string safely
  let addressString = ''
  const addr = safeOrg.address
  if (addr && typeof addr === 'object' && !Array.isArray(addr)) {
    const parts: string[] = []
    if (addr.street) parts.push(String(addr.street))
    if (addr.city) parts.push(String(addr.city))
    if (addr.state) parts.push(String(addr.state))
    if (addr.zip) parts.push(String(addr.zip))
    addressString = parts.join(', ')
  }

  // Invoice data - all converted to safe primitives
  const invoiceNumber = String(safeInvoice.invoiceNumber || '')
  const invoiceStatus = String(safeInvoice.status || 'pending').toLowerCase()
  const invoiceAmount = Number(safeInvoice.amount) || 0
  const invoiceDescription = String(safeInvoice.description || safeInvoice.invoiceType || 'Service')

  // Date fields - convert to strings for formatDate
  const createdAtStr = safeInvoice.createdAt ? String(safeInvoice.createdAt) : ''
  const dueDateStr = safeInvoice.dueDate ? String(safeInvoice.dueDate) : ''
  const paidAtStr = safeInvoice.paidAt ? String(safeInvoice.paidAt) : ''
  const periodStartStr = safeInvoice.periodStart ? String(safeInvoice.periodStart) : ''
  const periodEndStr = safeInvoice.periodEnd ? String(safeInvoice.periodEnd) : ''

  // Boolean flags for conditional rendering
  const hasContactName = orgContactName.length > 0
  const hasAddress = addressString.length > 0
  const hasContactEmail = orgContactEmail.length > 0
  const hasContactPhone = orgContactPhone.length > 0
  const hasPaidAt = paidAtStr.length > 0
  const hasPeriod = periodStartStr.length > 0 && periodEndStr.length > 0

  // Create a single line item from invoice data (skip database lineItems to avoid issues)
  const lineItemDescription = invoiceDescription
  const lineItemAmount = invoiceAmount

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>ChirhoEvents</Text>
            <Text style={styles.logoSubtext}>Event Management Platform</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
            <View style={[styles.statusBadge, getStatusStyle(invoiceStatus)]}>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                {invoiceStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Billing Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoText}>{orgName}</Text>
            {hasContactName ? (
              <Text style={styles.infoText}>Attn: {orgContactName}</Text>
            ) : null}
            {hasAddress ? <Text style={styles.infoText}>{addressString}</Text> : null}
            {hasContactEmail ? <Text style={styles.infoText}>{orgContactEmail}</Text> : null}
            {hasContactPhone ? (
              <Text style={styles.infoText}>{orgContactPhone}</Text>
            ) : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Invoice Details</Text>
            <Text style={styles.infoText}>Invoice Date: {formatDate(createdAtStr)}</Text>
            <Text style={styles.infoText}>Due Date: {formatDate(dueDateStr)}</Text>
            {hasPaidAt ? (
              <Text style={styles.infoText}>Paid On: {formatDate(paidAtStr)}</Text>
            ) : null}
            <Text style={styles.infoText}>Plan: {orgTier}</Text>
            {hasPeriod ? (
              <Text style={styles.periodText}>
                Service Period: {formatDate(periodStartStr)} - {formatDate(periodEndStr)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCellDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              {lineItemDescription}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
              {formatCurrency(lineItemAmount)}
            </Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoiceAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoiceAmount)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>
            Payment is due by {formatDate(dueDateStr)}.
          </Text>
          <Text style={styles.paymentText}>
            For questions about this invoice, please contact support@chirhoevents.com
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ChirhoEvents - Event Management for Faith Communities
          </Text>
          <Text style={styles.footerText}>
            www.chirhoevents.com | support@chirhoevents.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}
