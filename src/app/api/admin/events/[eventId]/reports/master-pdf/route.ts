import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { verifyFinancialReportAccess } from '@/lib/api-auth'
import {
  generateMasterEventReportPDF,
  generateAppendixCoverPDF,
  MasterEventReportData,
} from '@/lib/reports/generate-master-report-pdf'
import { generateLiabilityFormPDF } from '@/lib/pdf/generate-liability-form-pdf'
import { loadArchiveSections } from '@/lib/reports/master-report-archive'
import {
  appendAttachments,
  uploadMasterReport,
  type ArchiveAttachment,
} from '@/lib/reports/master-report-attachments'

// Master report is a serious PDF: many DB queries + per-form PDF renders +
// pdf-lib merge. Keep it on the Node runtime, and don't hand it back before
// it's actually ready.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Give the render up to 5 minutes for very large events (hundreds of
// signed liability forms). Vercel Pro tier tops out at 300s.
export const maxDuration = 300

/**
 * Master Event Report PDF endpoint.
 *
 * Fetches every relevant table for a single event (including cancelled
 * registrations, housing, meals, incident reports, surveys, and the
 * original uploaded safe environment certificates / letters / documents)
 * and hands the data blob to generateMasterEventReportPDF. Requires reports.view_financial because
 * the resulting PDF includes payment details, Stripe payment intent IDs,
 * check numbers, and refund amounts.
 *
 * The finished file is usually far larger than a serverless response can
 * carry, so it's stored in R2 and the response is JSON `{ url, filename }`.
 * Without R2 configured (local dev) the PDF binary is returned directly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const startedAt = Date.now()
  // Stop fetching attachments with time to spare for the merge + upload, so
  // a huge event still produces a (clearly marked) report instead of a
  // timeout with nothing.
  const attachmentDeadline = startedAt + 230_000
  try {
    const { eventId } = await params

    const { error, event } = await verifyFinancialReportAccess(
      request,
      eventId,
      '[Master Report PDF]'
    )
    if (error) return error
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch everything in parallel. Ordering isn't important — we just need
    // all of it before we can render. Refunds don't carry eventId so we
    // load them in a second pass, keyed off the registration IDs we found.
    const [
      groupRegs,
      individualRegs,
      participants,
      waitlist,
      vendors,
      staff,
      payments,
      paymentBalances,
      liabilityForms,
      checkInLogs,
      medicalIncidents,
      couponRedemptions,
      emailLogs,
      organizationRow,
    ] = await Promise.all([
      prisma.groupRegistration.findMany({
        where: { eventId },
        include: { participants: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.individualRegistration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.participant.findMany({
        where: { groupRegistration: { eventId } },
        include: {
          groupRegistration: { select: { groupName: true, parishName: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.waitlistEntry.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.vendorRegistration.findMany({
        where: { eventId },
        orderBy: { businessName: 'asc' },
      }),
      prisma.staffRegistration.findMany({
        where: { eventId },
        include: {
          vendorRegistration: { select: { businessName: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.payment.findMany({
        where: { eventId },
        include: {
          processedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentBalance.findMany({
        where: { eventId },
      }),
      prisma.liabilityForm.findMany({
        where: { eventId },
        include: {
          approvedBy: { select: { firstName: true, lastName: true } },
          groupRegistration: { select: { groupName: true } },
          // Hydrate everything generateLiabilityFormPDF needs to render a
          // completed form. Non-completed forms carry the same shape but
          // just won't be rendered into the appendix below.
          event: true,
          organization: true,
          safeEnvironmentCertificates: true,
        },
        orderBy: [
          { participantLastName: 'asc' },
          { participantFirstName: 'asc' },
        ],
      }),
      prisma.checkInLog.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medicalIncident.findMany({
        where: { eventId },
        orderBy: { incidentDate: 'desc' },
      }),
      prisma.couponRedemption.findMany({
        where: { coupon: { eventId } },
        include: {
          coupon: { select: { code: true, name: true } },
        },
        orderBy: { redeemedAt: 'desc' },
      }),
      prisma.emailLog.findMany({
        where: { eventId },
        orderBy: { sentAt: 'desc' },
      }),
      prisma.organization.findUnique({
        where: { id: event.organizationId },
        select: { name: true },
      }),
    ])

    const regIds = [
      ...groupRegs.map((g: any) => g.id),
      ...individualRegs.map((i: any) => i.id),
      ...vendors.map((v: any) => v.id),
      ...staff.map((s: any) => s.id),
    ]
    // Batch-fetch participant names and check-in operator names in one go
    // (CheckInLog has no user relation and Participant is not joined by
    // the initial query, so both would N+1 otherwise).
    const checkInParticipantIds = checkInLogs
      .map((l: any) => l.participantId)
      .filter(Boolean) as string[]
    const checkInUserIds = Array.from(new Set(
      checkInLogs.map((l: any) => l.userId).filter(Boolean) as string[]
    ))

    const [actualRefunds, checkInParticipants, checkInUsers] = await Promise.all([
      prisma.refund.findMany({
        where: { registrationId: { in: regIds } },
        include: {
          processedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { processedAt: 'desc' },
      }),
      checkInParticipantIds.length > 0
        ? prisma.participant.findMany({
            where: { id: { in: checkInParticipantIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([] as any[]),
      checkInUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: checkInUserIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([] as any[]),
    ])

    const checkInParticipantById = new Map(
      checkInParticipants.map((p: any) => [p.id, p])
    )
    const checkInUserById = new Map(
      checkInUsers.map((u: any) => [u.id, u])
    )

    // Lookup helpers so payment / refund / liability rows can render a payer name.
    const groupById = new Map(groupRegs.map((g: any) => [g.id, g]))
    const individualById = new Map(individualRegs.map((i: any) => [i.id, i]))
    const vendorById = new Map(vendors.map((v: any) => [v.id, v]))
    const staffById = new Map(staff.map((s: any) => [s.id, s]))
    const balanceByReg = new Map(
      paymentBalances.map((pb: any) => [`${pb.registrationType}:${pb.registrationId}`, pb])
    )

    const labelFor = (registrationType: string, registrationId: string): string => {
      if (registrationType === 'group') {
        const g: any = groupById.get(registrationId)
        if (!g) return 'Unknown Group'
        return g.cancelledAt ? `${g.groupName} (CANCELLED)` : g.groupName
      }
      if (registrationType === 'individual') {
        const i: any = individualById.get(registrationId)
        if (!i) return 'Unknown Individual'
        const name = `${i.firstName || ''} ${i.lastName || ''}`.trim() || 'Unknown Individual'
        return i.cancelledAt ? `${name} (CANCELLED)` : name
      }
      if (registrationType === 'vendor') {
        const v: any = vendorById.get(registrationId)
        return v?.businessName || 'Unknown Vendor'
      }
      if (registrationType === 'staff') {
        const s: any = staffById.get(registrationId)
        return s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown Staff' : 'Unknown Staff'
      }
      return 'Unknown'
    }

    // Summary totals
    const totalInvoiced = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.totalAmountDue || 0),
      0
    )
    const totalPaid = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.amountPaid || 0),
      0
    )
    const totalBalance = paymentBalances.reduce(
      (sum: number, pb: any) => sum + Number(pb.amountRemaining || 0),
      0
    )
    const totalRefunded = actualRefunds.reduce(
      (sum: number, r: any) => sum + Number(r.refundAmount || 0),
      0
    )
    const checkedInParticipantCount = participants.filter((p: any) => p.checkedIn).length +
      individualRegs.filter((i: any) => i.checkedIn).length
    const liabilityCounts = liabilityForms.reduce(
      (acc: any, f: any) => {
        acc.total += 1
        if (f.formStatus === 'approved') acc.approved += 1
        else if (f.formStatus === 'denied') acc.denied += 1
        else if (f.formStatus === 'needs_revision') acc.needsRevision += 1
        else acc.pending += 1
        return acc
      },
      { total: 0, approved: 0, pending: 0, denied: 0, needsRevision: 0 }
    )

    const archive = await loadArchiveSections({
      eventId,
      groups: groupRegs,
      individuals: individualRegs,
      participants,
      vendors,
      staff,
      liabilityForms,
      paymentBalances,
      refunds: actualRefunds,
    })
    const fullEvent: any = archive.event || event

    const data: MasterEventReportData = {
      event: {
        name: event.name,
        startDate: fullEvent.startDate ?? null,
        endDate: fullEvent.endDate ?? null,
        location: fullEvent.locationName ?? null,
        organizationName: organizationRow?.name ?? null,
        capacity: fullEvent.capacityTotal ?? null,
      },
      summary: {
        groupCount: groupRegs.length,
        individualCount: individualRegs.length,
        participantCount: participants.length,
        waitlistCount: waitlist.length,
        vendorCount: vendors.length,
        staffCount: staff.length,
        totalInvoiced,
        totalPaid,
        totalBalance,
        totalRefunded,
        liabilityFormCounts: liabilityCounts,
        checkedInCount: checkedInParticipantCount,
        incidentCount: medicalIncidents.length,
        emailsSent: emailLogs.length,
      },
      groups: groupRegs.map((g: any) => {
        const bal: any = balanceByReg.get(`group:${g.id}`)
        return {
          accessCode: g.accessCode,
          groupName: g.cancelledAt ? `${g.groupName} (CANCELLED)` : g.groupName,
          parishName: g.parishName,
          dioceseName: g.dioceseName,
          groupLeaderName: g.groupLeaderName,
          groupLeaderEmail: g.groupLeaderEmail,
          groupLeaderPhone: g.groupLeaderPhone,
          housingType: g.housingType,
          registrationStatus: g.registrationStatus,
          participantCount: g.participants?.length ?? 0,
          totalInvoiced: bal ? Number(bal.totalAmountDue) : 0,
          totalPaid: bal ? Number(bal.amountPaid) : 0,
          balance: bal ? Number(bal.amountRemaining) : 0,
          paymentStatus: bal?.paymentStatus ?? 'unpaid',
          createdAt: g.createdAt,
        }
      }),
      individuals: individualRegs.map((i: any) => {
        const bal: any = balanceByReg.get(`individual:${i.id}`)
        return {
          firstName: i.firstName,
          lastName: i.cancelledAt ? `${i.lastName} (CANCELLED)` : i.lastName,
          email: i.email,
          phone: i.phone,
          age: i.age,
          gender: i.gender,
          housingType: i.housingType,
          registrationStatus: i.cancelledAt ? 'cancelled' : i.registrationStatus,
          checkedIn: !!i.checkedIn,
          totalInvoiced: bal ? Number(bal.totalAmountDue) : 0,
          totalPaid: bal ? Number(bal.amountPaid) : 0,
          balance: bal ? Number(bal.amountRemaining) : 0,
          paymentStatus: bal?.paymentStatus ?? 'unpaid',
          createdAt: i.createdAt,
        }
      }),
      participants: participants.map((p: any) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        gender: p.gender,
        participantType: p.participantType,
        tShirtSize: p.tShirtSize,
        groupName: groupById.get(p.groupRegistrationId)?.cancelledAt
          ? `${p.groupRegistration?.groupName} (CANCELLED)`
          : p.groupRegistration?.groupName,
        parishName: p.groupRegistration?.parishName,
        checkedIn: !!p.checkedIn,
        checkedInAt: p.checkedInAt,
      })),
      waitlist: waitlist.map((w: any) => ({
        name: w.name,
        email: w.email,
        phone: w.phone,
        partySize: w.partySize,
        status: w.status,
        notes: w.notes,
        createdAt: w.createdAt,
        notifiedAt: w.notifiedAt,
      })),
      vendors: vendors.map((v: any) => ({
        businessName: v.businessName,
        contactName: `${v.contactFirstName || ''} ${v.contactLastName || ''}`.trim() || null,
        email: v.email,
        phone: v.phone,
        selectedTier: v.selectedTier,
        tierPrice: Number(v.tierPrice || 0),
        invoiceTotal: v.invoiceTotal ? Number(v.invoiceTotal) : 0,
        amountPaid: Number(v.amountPaid || 0),
        status: v.status,
        paymentStatus: v.paymentStatus,
        approvedAt: v.approvedAt,
      })),
      staff: staff.map((s: any) => ({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        role: s.role,
        isVendorStaff: !!s.isVendorStaff,
        vendorBusinessName: s.vendorRegistration?.businessName,
        pricePaid: Number(s.pricePaid || 0),
        paymentStatus: s.paymentStatus,
        checkedIn: !!s.checkedIn,
      })),
      payments: payments.map((p: any) => ({
        processedAt: p.processedAt || p.createdAt,
        payer: labelFor(p.registrationType, p.registrationId),
        registrationType: p.registrationType,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paymentType: p.paymentType,
        paymentStatus: p.paymentStatus,
        stripePaymentIntentId: p.stripePaymentIntentId,
        checkNumber: p.checkNumber,
        processedByName: p.processedBy
          ? `${p.processedBy.firstName || ''} ${p.processedBy.lastName || ''}`.trim()
          : null,
        notes: p.notes,
      })),
      refunds: actualRefunds.map((r: any) => ({
        processedAt: r.processedAt,
        payer: labelFor(r.registrationType, r.registrationId),
        refundAmount: Number(r.refundAmount),
        refundMethod: r.refundMethod,
        refundReason: r.refundReason,
        status: r.status,
        processedByName: r.processedBy
          ? `${r.processedBy.firstName || ''} ${r.processedBy.lastName || ''}`.trim()
          : null,
      })),
      balances: paymentBalances.map((pb: any) => ({
        payer: labelFor(pb.registrationType, pb.registrationId),
        registrationType: pb.registrationType,
        totalAmountDue: Number(pb.totalAmountDue),
        amountPaid: Number(pb.amountPaid),
        amountRemaining: Number(pb.amountRemaining),
        paymentStatus: pb.paymentStatus,
        lastPaymentDate: pb.lastPaymentDate,
      })),
      liabilityForms: liabilityForms.map((f: any) => ({
        participantName: `${f.participantFirstName || ''} ${f.participantLastName || ''}`.trim(),
        formType: f.formType,
        groupName: f.groupRegistrationId ? labelFor('group', f.groupRegistrationId) : f.groupRegistration?.groupName,
        email: f.participantEmail || f.parentEmail,
        formStatus: f.formStatus || 'pending',
        completed: !!f.completed,
        completedAt: f.completedAt,
        approvedByName: f.approvedBy
          ? `${f.approvedBy.firstName || ''} ${f.approvedBy.lastName || ''}`.trim()
          : null,
        approvedAt: f.approvedAt,
        deniedReason: f.deniedReason,
        approvalNotes: f.approvalNotes,
      })),
      checkIns: checkInLogs.map((log: any) => {
        // Resolve person name from whichever ID is set — all lookups are
        // pre-fetched, so this is O(1) per row.
        let personName = 'Unknown'
        let personType = 'Unknown'
        if (log.participantId) {
          const p: any = checkInParticipantById.get(log.participantId)
          personName = p ? `${p.firstName} ${p.lastName}` : 'Unknown Participant'
          personType = 'Participant'
        } else if (log.individualRegistrationId) {
          const i: any = individualById.get(log.individualRegistrationId)
          personName = i ? `${i.firstName} ${i.lastName}` : 'Unknown Individual'
          personType = 'Individual'
        } else if (log.groupRegistrationId) {
          const g: any = groupById.get(log.groupRegistrationId)
          personName = g?.groupName || 'Unknown Group'
          personType = 'Group'
        }
        const performer: any = log.userId ? checkInUserById.get(log.userId) : null
        return {
          createdAt: log.createdAt,
          personName,
          personType,
          action: log.action,
          station: log.station,
          performedByName: performer
            ? `${performer.firstName || ''} ${performer.lastName || ''}`.trim()
            : null,
        }
      }),
      medicalIncidents: medicalIncidents.map((i: any) => ({
        incidentDate: i.incidentDate,
        participantName: i.participantName || 'Unknown',
        incidentType: i.incidentType,
        severity: i.severity,
        location: i.location,
        status: i.status,
        resolvedAt: i.resolvedAt,
      })),
      couponRedemptions: couponRedemptions.map((r: any) => ({
        redeemedAt: r.redeemedAt,
        couponCode: r.coupon?.code || '',
        couponName: r.coupon?.name,
        payer: labelFor(r.registrationType, r.registrationId),
        registrationType: r.registrationType,
        discountApplied: Number(r.discountApplied),
      })),
      emailHistory: emailLogs.map((e: any) => ({
        sentAt: e.sentAt,
        recipientEmail: e.recipientEmail,
        recipientName: e.recipientName,
        emailType: e.emailType,
        subject: e.subject,
        sentStatus: e.sentStatus,
        errorMessage: e.errorMessage,
      })),
      extraSections: [
        ...archive.registrationSections.map(s => ({ ...s, placement: 'registrations' as const })),
        ...archive.endSections.map(s => ({ ...s, placement: 'end' as const })),
      ],
    }

    const masterBuffer = await generateMasterEventReportPDF(data, event.name)

    // Appendices: the actual signed liability forms and every uploaded
    // file (certificates, letters, event documents) so this file is a
    // legally-usable archive on its own, not just a set of status tables.
    // Only completed forms are rendered — draft / abandoned forms have empty
    // signature blocks and would just add blank pages. Cancelled
    // registrations' forms are kept on purpose.
    const completedForms = liabilityForms.filter((f: any) => f.completed)
    const merged = await PDFDocument.load(masterBuffer)

    const addCover = async (label: string, title: string, description: string, note?: string) => {
      const coverDoc = await PDFDocument.load(await generateAppendixCoverPDF(label, title, description, note))
      const pages = await merged.copyPages(coverDoc, coverDoc.getPageIndices())
      pages.forEach(p => merged.addPage(p))
    }
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
    const timeoutNotice = (items: string[]) => addCover(
      'NOT INCLUDED',
      'Report time limit reached',
      `${plural(items.length, 'item')} could not be added before the report hit its time limit. ` +
        'Download them individually from the event, or generate this report again.',
      items.slice(0, 40).join(' · ') + (items.length > 40 ? ` · and ${items.length - 40} more` : '')
    )

    let appendixIndex = 0
    const nextAppendix = () => `APPENDIX ${String.fromCharCode(65 + appendixIndex++)}`

    if (completedForms.length > 0) {
      await addCover(
        nextAppendix(),
        'Signed Liability Forms',
        `${plural(completedForms.length, 'completed liability form')} from ${event.name}`,
        'Each form follows in participant order, including forms from cancelled registrations. Retain this section per your organization\'s record-keeping policy.'
      )
      // Sequential render — generateLiabilityFormPDF shares a PDFKit
      // reconciler that throws when called in parallel (see the existing
      // print-all/groups endpoint for the same constraint). Fail one form,
      // log and continue, so a single broken form doesn't kill the archive.
      const skipped: string[] = []
      for (const form of completedForms) {
        const who = `${form.participantFirstName} ${form.participantLastName}`
        if (Date.now() > attachmentDeadline) {
          skipped.push(who)
          continue
        }
        try {
          const formBuffer = await generateLiabilityFormPDF(form as any)
          const formDoc = await PDFDocument.load(formBuffer)
          const pages = await merged.copyPages(formDoc, formDoc.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        } catch (formErr: any) {
          console.error(
            `[Master Report PDF] Skipping form ${form.id} for ${who}:`,
            formErr?.message || formErr
          )
        }
      }
      if (skipped.length > 0) await timeoutNotice(skipped)
    }

    const fileAppendices: Array<{ title: string; noun: string; items: ArchiveAttachment[] }> = [
      { title: 'Safe Environment Certificates', noun: 'certificate', items: archive.certificateFiles },
      { title: 'Letters of Good Standing', noun: 'letter', items: archive.letterFiles },
      { title: 'Event Documents', noun: 'document', items: archive.eventDocuments },
    ]
    for (const appendix of fileAppendices) {
      if (appendix.items.length === 0) continue
      await addCover(
        nextAppendix(),
        appendix.title,
        `${plural(appendix.items.length, appendix.noun)} from ${event.name}`,
        'The original uploaded files follow. Each page is labeled with the person or document it belongs to.'
      )
      const { skipped } = await appendAttachments(merged, appendix.items, attachmentDeadline)
      if (skipped.length > 0) await timeoutNotice(skipped.map(i => i.label))
    }

    const combinedBuffer = Buffer.from(await merged.save())
    const filename = `${event.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_master_report.pdf`

    const url = await uploadMasterReport(combinedBuffer, event.organizationId, eventId, filename)
    console.log(
      `[Master Report PDF] ${event.name}: ${merged.getPageCount()} pages, ` +
      `${(combinedBuffer.length / 1024 / 1024).toFixed(1)} MB in ${Math.round((Date.now() - startedAt) / 1000)}s`
    )
    if (url) {
      return NextResponse.json({ url, filename, pageCount: merged.getPageCount(), sizeBytes: combinedBuffer.length })
    }

    return new NextResponse(new Uint8Array(combinedBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[Master Report PDF] Failed:', error?.message || error)
    return NextResponse.json(
      { error: 'Master report generation failed: ' + String(error?.message || error) },
      { status: 500 }
    )
  }
}
