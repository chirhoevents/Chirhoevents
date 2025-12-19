// Access Code Generation Utility
// Format: M2K2026-GROUPNAME-ABC1

export function generateAccessCode(eventName: string, groupName: string): string {
  // Extract event code (first letters + year)
  const eventParts = eventName.split(' ')
  const eventCode = eventParts
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('')

  const year = eventName.match(/\d{4}/)?.[0] || new Date().getFullYear().toString()

  // Clean and shorten group name
  const cleanGroupName = groupName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8)

  // Generate random suffix (4 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')

  return `${eventCode}${year}-${cleanGroupName}-${suffix}`
}

// Individual Confirmation Code Generation Utility
// Format: IND-YYYY-XXXXXX (simpler format for searching and payments)
// Example: IND-2026-A7B9C2

export function generateIndividualConfirmationCode(eventYear?: string): string {
  // Use provided year or extract from current date
  const year = eventYear || new Date().getFullYear().toString()

  // Generate random 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const code = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')

  return `IND-${year}-${code}`
}
