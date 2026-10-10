import { prisma } from '@/lib/prisma'
import { deleteSubmissionFiles } from '@/lib/lux/documents'
import { luxAudit } from '@/lib/lux/access'

const DAY = 24 * 60 * 60 * 1000

/**
 * Daily housekeeping for Lux:
 *  - deletes uploaded documents older than their program's retention
 *    setting ("keep for N days after upload"; programs without one keep
 *    files until staff delete them),
 *  - clears out expired family links and sessions, and old link-request
 *    rate-limit entries.
 */
export async function runLuxRetention(now = new Date()) {
  const programs = await prisma.luxProgram.findMany({
    where: { documentRetentionDays: { not: null } },
    select: { id: true, organizationId: true, documentRetentionDays: true },
  })

  let filesDeleted = 0
  for (const program of programs) {
    const cutoff = new Date(now.getTime() - program.documentRetentionDays! * DAY)
    const due = await prisma.luxDocumentSubmission.findMany({
      where: { requirement: { programId: program.id }, storageRef: { not: null }, uploadedAt: { lt: cutoff } },
      select: { id: true },
      take: 500,
    })
    if (due.length === 0) continue
    const count = await deleteSubmissionFiles(due.map(d => d.id), program.organizationId, {
      keepApproved: true,
      note: `File deleted after ${program.documentRetentionDays} days (your retention setting)`,
    })
    filesDeleted += count
    await luxAudit({
      organizationId: program.organizationId,
      action: 'documents.retention_deleted',
      targetType: 'lux_program',
      targetId: program.id,
      metadata: { files: count, retentionDays: program.documentRetentionDays },
    })
  }

  const dayAgo = new Date(now.getTime() - DAY)
  const [links, sessions, rateLimitRows] = await Promise.all([
    prisma.luxMagicLink.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.luxFamilySession.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.luxAuditLog.deleteMany({ where: { action: 'family_link.requested', createdAt: { lt: new Date(now.getTime() - 30 * DAY) } } }),
  ])

  return { filesDeleted, expiredLinks: links.count, expiredSessions: sessions.count, rateLimitRows: rateLimitRows.count }
}
