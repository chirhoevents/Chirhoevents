import { NextRequest, NextResponse } from 'next/server'
import { verifyReportAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { generateCSV } from '@/lib/reports/generate-csv'
import { deflateRawSync } from 'zlib'

// FIX 4.16: ZIP bundle export — generates all reports and returns a ZIP file
// Medical export requires rapha.access; omitted with a note if user lacks it.
//
// Minimal RFC 4.3.2 ZIP builder (no external library needed)
function buildZip(files: Array<{ name: string; content: Buffer }>): Buffer {
  const parts: Buffer[] = []
  const centralDir: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, 'utf8')
    const compressed = deflateRawSync(file.content, { level: 6 })
    const crc = crc32(file.content)
    const now = new Date()
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length)
    localHeader.writeUInt32LE(0x04034b50, 0)  // signature
    localHeader.writeUInt16LE(20, 4)           // version needed
    localHeader.writeUInt16LE(0, 6)            // flags
    localHeader.writeUInt16LE(8, 8)            // compression: deflate
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc >>> 0, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(file.content.length, 22)
    localHeader.writeUInt16LE(nameBytes.length, 26)
    localHeader.writeUInt16LE(0, 28)
    nameBytes.copy(localHeader, 30)

    parts.push(localHeader)
    parts.push(compressed)

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBytes.length)
    cdEntry.writeUInt32LE(0x02014b50, 0)  // signature
    cdEntry.writeUInt16LE(20, 4)          // version made by
    cdEntry.writeUInt16LE(20, 6)          // version needed
    cdEntry.writeUInt16LE(0, 8)           // flags
    cdEntry.writeUInt16LE(8, 10)          // compression
    cdEntry.writeUInt16LE(dosTime, 12)
    cdEntry.writeUInt16LE(dosDate, 14)
    cdEntry.writeUInt32LE(crc >>> 0, 16)
    cdEntry.writeUInt32LE(compressed.length, 20)
    cdEntry.writeUInt32LE(file.content.length, 24)
    cdEntry.writeUInt16LE(nameBytes.length, 28)
    cdEntry.writeUInt16LE(0, 30)
    cdEntry.writeUInt16LE(0, 32)
    cdEntry.writeUInt16LE(0, 34)
    cdEntry.writeUInt16LE(0, 36)
    cdEntry.writeUInt32LE(0, 38)
    cdEntry.writeUInt32LE(offset, 42)
    nameBytes.copy(cdEntry, 46)
    centralDir.push(cdEntry)

    offset += localHeader.length + compressed.length
  }

  const cdBuffer = Buffer.concat(centralDir)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(cdBuffer.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...parts, cdBuffer, eocd])
}

// CRC-32 table
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const { error, user, event, effectiveOrgId } = await verifyReportAccess(request, eventId, '[Bundle Export]')
    if (error) return error

    const eventName = event?.name?.replace(/\s+/g, '_') || eventId
    const hasRaphaAccess = hasPermission(user!.role, 'rapha.access')

    const zipFiles: Array<{ name: string; content: Buffer }> = []
    const omittedFiles: string[] = []

    // ---- 1. Registration export ----
    const [groupRegs, individualRegs, paymentBalances] = await Promise.all([
      prisma.groupRegistration.findMany({
        where: { eventId },
        include: { participants: true },
      }),
      prisma.individualRegistration.findMany({ where: { eventId } }),
      prisma.paymentBalance.findMany({ where: { eventId } }),
    ])

    const regRows: any[] = []
    for (const g of groupRegs) {
      const pb = paymentBalances.find((b: any) => b.registrationId === g.id)
      regRows.push({
        'Type': 'Group',
        'Group Name': g.groupName,
        'Leader': g.groupLeaderName,
        'Email': g.groupLeaderEmail,
        'Participants': g.participants.length,
        'Total': pb ? `$${Number(pb.totalAmountDue).toFixed(2)}` : '$0.00',
        'Paid': pb ? `$${Number(pb.amountPaid).toFixed(2)}` : '$0.00',
        'Balance': pb ? `$${Number(pb.amountRemaining).toFixed(2)}` : '$0.00',
        'Status': g.registrationStatus,
      })
    }
    for (const ind of individualRegs) {
      const pb = paymentBalances.find((b: any) => b.registrationId === ind.id)
      regRows.push({
        'Type': 'Individual',
        'Group Name': '',
        'Leader': `${ind.firstName} ${ind.lastName}`,
        'Email': ind.email,
        'Participants': 1,
        'Total': pb ? `$${Number(pb.totalAmountDue).toFixed(2)}` : '$0.00',
        'Paid': pb ? `$${Number(pb.amountPaid).toFixed(2)}` : '$0.00',
        'Balance': pb ? `$${Number(pb.amountRemaining).toFixed(2)}` : '$0.00',
        'Status': ind.registrationStatus,
      })
    }
    zipFiles.push({
      name: `registrations_${eventName}.csv`,
      content: Buffer.from(generateCSV(regRows, ['Type','Group Name','Leader','Email','Participants','Total','Paid','Balance','Status'])),
    })

    // ---- 2. Financial export (reuse paymentBalances) ----
    const finRows: any[] = []
    for (const pb of paymentBalances) {
      finRows.push({
        'Registration ID': pb.registrationId,
        'Type': pb.registrationType,
        'Total Due': `$${Number(pb.totalAmountDue).toFixed(2)}`,
        'Paid': `$${Number(pb.amountPaid).toFixed(2)}`,
        'Remaining': `$${Number(pb.amountRemaining).toFixed(2)}`,
        'Status': pb.paymentStatus,
      })
    }
    zipFiles.push({
      name: `financial_${eventName}.csv`,
      content: Buffer.from(generateCSV(finRows, ['Registration ID','Type','Total Due','Paid','Remaining','Status'])),
    })

    // ---- 3. Housing export ----
    const housingRows: any[] = []
    for (const g of groupRegs) {
      housingRows.push({
        'Type': 'Group',
        'Name': g.groupName,
        'Housing Type': g.housingType || '',
        'On-Campus Youth': g.onCampusYouth || 0,
        'On-Campus Chaperones': g.onCampusChaperones || 0,
        'Off-Campus Youth': g.offCampusYouth || 0,
        'Off-Campus Chaperones': g.offCampusChaperones || 0,
      })
    }
    for (const ind of individualRegs) {
      housingRows.push({
        'Type': 'Individual',
        'Name': `${ind.firstName} ${ind.lastName}`,
        'Housing Type': ind.housingType || '',
        'On-Campus Youth': '',
        'On-Campus Chaperones': '',
        'Off-Campus Youth': '',
        'Off-Campus Chaperones': '',
      })
    }
    zipFiles.push({
      name: `housing_${eventName}.csv`,
      content: Buffer.from(generateCSV(housingRows, ['Type','Name','Housing Type','On-Campus Youth','On-Campus Chaperones','Off-Campus Youth','Off-Campus Chaperones'])),
    })

    // ---- 4. Check-in export ----
    const [checkedInParticipants, checkedInIndividuals] = await Promise.all([
      prisma.participant.findMany({
        where: { groupRegistration: { eventId }, checkedIn: true },
        select: {
          firstName: true, lastName: true, checkedInAt: true, checkInStation: true,
          groupRegistration: { select: { groupName: true } },
        },
      }),
      prisma.individualRegistration.findMany({
        where: { eventId, checkedIn: true },
        select: { firstName: true, lastName: true, checkedInAt: true, checkInStation: true },
      }),
    ])

    const checkInRows: any[] = [
      ...checkedInParticipants.map((p: any) => ({
        'Name': `${p.firstName} ${p.lastName}`,
        'Type': 'Group Participant',
        'Group': p.groupRegistration?.groupName || '',
        'Check-In Time': p.checkedInAt ? new Date(p.checkedInAt).toISOString() : '',
        'Station': p.checkInStation || '',
      })),
      ...checkedInIndividuals.map((ind: any) => ({
        'Name': `${ind.firstName} ${ind.lastName}`,
        'Type': 'Individual',
        'Group': '',
        'Check-In Time': ind.checkedInAt ? new Date(ind.checkedInAt).toISOString() : '',
        'Station': ind.checkInStation || '',
      })),
    ]
    zipFiles.push({
      name: `check_in_${eventName}.csv`,
      content: Buffer.from(generateCSV(checkInRows, ['Name','Type','Group','Check-In Time','Station'])),
    })

    // ---- 5. Medical export (rapha.access required) ----
    if (hasRaphaAccess) {
      const medForms = await prisma.liabilityForm.findMany({
        where: { eventId },
        select: {
          participantFirstName: true, participantLastName: true,
          allergies: true, medications: true, medicalConditions: true,
          dietaryRestrictions: true, adaAccommodations: true,
          groupRegistration: { select: { groupName: true } },
        },
      })
      const medRows = medForms.map((f: any) => ({
        'Name': `${f.participantFirstName} ${f.participantLastName}`,
        'Group': f.groupRegistration?.groupName || '',
        'Allergies': f.allergies || '',
        'Medications': f.medications || '',
        'Medical Conditions': f.medicalConditions || '',
        'Dietary Restrictions': f.dietaryRestrictions || '',
        'ADA Accommodations': f.adaAccommodations || '',
      }))
      zipFiles.push({
        name: `CONFIDENTIAL_medical_${eventName}.csv`,
        content: Buffer.from(generateCSV(medRows, ['Name','Group','Allergies','Medications','Medical Conditions','Dietary Restrictions','ADA Accommodations'])),
      })
    } else {
      omittedFiles.push('CONFIDENTIAL_medical_*.csv (requires rapha.access permission)')
    }

    // ---- Build README ----
    const readmeLines = [
      `ChiRho Events — Export Bundle`,
      `Event: ${event?.name || eventId}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Files included:',
      ...zipFiles.map((f) => `  - ${f.name}`),
    ]
    if (omittedFiles.length > 0) {
      readmeLines.push('', 'Files omitted (insufficient permissions):', ...omittedFiles.map((f) => `  - ${f}`))
    }
    zipFiles.unshift({
      name: 'README.txt',
      content: Buffer.from(readmeLines.join('\n')),
    })

    const zipBuffer = buildZip(zipFiles)

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="export_bundle_${eventName}.zip"`,
      },
    })
  } catch (error) {
    console.error('[Bundle Export] Error:', error)
    return NextResponse.json({ error: 'Bundle export failed' }, { status: 500 })
  }
}
