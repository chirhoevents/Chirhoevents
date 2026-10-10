import { prisma } from '@/lib/prisma'
import type { FamilyDocItem } from '@/components/lux/public/DocumentUploadList'

/** Documents for a family page, optionally only one order's */
export async function familyDocuments(householdId: string, orderId?: string): Promise<FamilyDocItem[]> {
  const submissions = await prisma.luxDocumentSubmission.findMany({
    where: {
      householdId,
      programRegistration: { cancelledAt: null, ...(orderId ? { orderId } : {}), program: { status: { not: 'archived' } } },
    },
    include: {
      requirement: { select: { label: true, description: true, required: true, displayOrder: true } },
      child: { select: { firstName: true } },
      programRegistration: { select: { program: { select: { name: true } } } },
    },
    orderBy: [{ createdAt: 'asc' }],
  })
  return submissions
    .sort((a, b) => a.child.firstName.localeCompare(b.child.firstName) || a.requirement.displayOrder - b.requirement.displayOrder)
    .map(s => ({
      submissionId: s.id,
      label: s.requirement.label,
      description: s.requirement.description,
      childName: s.child.firstName,
      programName: s.programRegistration.program.name,
      required: s.requirement.required,
      status: s.status,
      reviewerNote: s.reviewerNote,
      fileName: s.fileName,
    }))
}
