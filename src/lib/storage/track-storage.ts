import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

const BYTES_PER_GB = 1024 * 1024 * 1024

/**
 * Convert bytes to gigabytes with 2 decimal precision
 */
export function bytesToGb(bytes: number | bigint): number {
  const bytesNum = typeof bytes === 'bigint' ? Number(bytes) : bytes
  return Math.round((bytesNum / BYTES_PER_GB) * 100) / 100
}

/**
 * Increment an organization's storage usage
 * @param organizationId - The organization ID
 * @param bytes - Number of bytes to add (can be number or bigint)
 */
export async function incrementOrgStorage(
  organizationId: string,
  bytes: number | bigint
): Promise<void> {
  const gbToAdd = bytesToGb(bytes)

  if (gbToAdd <= 0) return

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      storageUsedGb: {
        increment: new Decimal(gbToAdd),
      },
    },
  })
}

/**
 * Decrement an organization's storage usage
 * @param organizationId - The organization ID
 * @param bytes - Number of bytes to subtract (can be number or bigint)
 */
export async function decrementOrgStorage(
  organizationId: string,
  bytes: number | bigint
): Promise<void> {
  const gbToSubtract = bytesToGb(bytes)

  if (gbToSubtract <= 0) return

  // Get current storage to ensure we don't go below 0
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { storageUsedGb: true },
  })

  if (!org) return

  const currentGb = Number(org.storageUsedGb)
  const newGb = Math.max(0, currentGb - gbToSubtract)

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      storageUsedGb: new Decimal(newGb),
    },
  })
}

/**
 * Recalculate total storage for an organization from all stored files
 * Useful for initial migration or correcting drift
 */
export async function recalculateOrgStorage(
  organizationId: string
): Promise<{ totalBytes: bigint; totalGb: number }> {
  // Get all certificates with file sizes
  const certificates = await prisma.safeEnvironmentCertificate.findMany({
    where: { organizationId },
    select: { fileSizeBytes: true },
  })

  // Get all liability forms with file sizes (if tracked)
  const liabilityForms = await prisma.liabilityForm.findMany({
    where: { organizationId },
    select: { fileSizeBytes: true },
  })

  // Get all event IDs for this organization
  const orgEvents = await prisma.event.findMany({
    where: { organizationId },
    select: { id: true },
  })
  const eventIds = orgEvents.map(e => e.id)

  // Get all welcome packet inserts with file sizes (if tracked)
  const inserts = await prisma.welcomePacketInsert.findMany({
    where: {
      eventId: { in: eventIds },
    },
    select: { fileSizeBytes: true },
  })

  // Sum all file sizes
  let totalBytes = BigInt(0)

  for (const cert of certificates) {
    if (cert.fileSizeBytes) {
      totalBytes += cert.fileSizeBytes
    }
  }

  for (const form of liabilityForms) {
    if (form.fileSizeBytes) {
      totalBytes += form.fileSizeBytes
    }
  }

  for (const insert of inserts) {
    if (insert.fileSizeBytes) {
      totalBytes += insert.fileSizeBytes
    }
  }

  const totalGb = bytesToGb(totalBytes)

  // Update the organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      storageUsedGb: new Decimal(totalGb),
    },
  })

  return { totalBytes, totalGb }
}

/**
 * Get storage usage info for an organization
 */
export async function getOrgStorageInfo(organizationId: string): Promise<{
  usedGb: number
  limitGb: number
  usedPercent: number
  isOverLimit: boolean
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      storageUsedGb: true,
      storageLimitGb: true,
    },
  })

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`)
  }

  const usedGb = Number(org.storageUsedGb)
  const limitGb = org.storageLimitGb
  const usedPercent = limitGb > 0 ? (usedGb / limitGb) * 100 : 0

  return {
    usedGb,
    limitGb,
    usedPercent,
    isOverLimit: usedGb > limitGb,
  }
}
