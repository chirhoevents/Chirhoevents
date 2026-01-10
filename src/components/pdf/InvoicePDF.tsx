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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
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
  // Safely extract organization data with string fallbacks
  const org = invoice.organization || {}
  const orgName = String(org.legalName || org.name || 'Organization')
  const orgContactName = org.contactName ? String(org.contactName) : ''
  const orgContactEmail = String(org.contactEmail || '')
  const orgContactPhone = org.contactPhone ? String(org.contactPhone) : ''
  const orgTier = String(org.tier || 'Standard')

  // Safely build address string
  const address = org.address
  let addressString = ''
  if (address && typeof address === 'object') {
    addressString = [address.street, address.city, address.state, address.zip]
      .filter(Boolean)
      .map(s => String(s))
      .join(', ')
  }

  // Safely extract invoice data
  const invoiceNumber = String(invoice.invoiceNumber || '')
  const invoiceStatus = String(invoice.status || 'pending')

  // Safely parse line items - ensure they're valid primitives
  let lineItems: Array<{ description: string; amount: number }> = []
  try {
    if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
      lineItems = invoice.lineItems.map(item => ({
        description: String(item.description || ''),
        amount: Number(item.amount) || 0,
      }))
    }
  } catch {
    // Fall back to default
  }

  // If no valid line items, create a default one
  if (lineItems.length === 0) {
    lineItems = [
      {
        description: String(invoice.description || invoice.invoiceType || 'Service'),
        amount: Number(invoice.amount) || 0
      },
    ]
  }

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
            {orgContactName && (
              <Text style={styles.infoText}>Attn: {orgContactName}</Text>
            )}
            {addressString && <Text style={styles.infoText}>{addressString}</Text>}
            {orgContactEmail && <Text style={styles.infoText}>{orgContactEmail}</Text>}
            {orgContactPhone && (
              <Text style={styles.infoText}>{orgContactPhone}</Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Invoice Details</Text>
            <Text style={styles.infoText}>Invoice Date: {formatDate(invoice.createdAt)}</Text>
            <Text style={styles.infoText}>Due Date: {formatDate(invoice.dueDate)}</Text>
            {invoice.paidAt && (
              <Text style={styles.infoText}>Paid On: {formatDate(invoice.paidAt)}</Text>
            )}
            <Text style={styles.infoText}>Plan: {orgTier}</Text>
            {invoice.periodStart && invoice.periodEnd && (
              <Text style={styles.periodText}>
                Service Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCellDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.tableCellAmount]}>Amount</Text>
          </View>
          {lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellDescription]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.amount)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>
            Payment is due by {formatDate(invoice.dueDate)}.
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
