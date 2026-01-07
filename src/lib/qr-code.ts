import QRCode from 'qrcode'

/**
 * Generate a QR code data URL for a participant
 * The QR code contains just the participant's UUID for easy scanning
 * @param participantId - The participant's UUID
 * @returns Base64 data URL of the QR code image
 */
export async function generateParticipantQRCode(participantId: string): Promise<string> {
  // QR code contains just the participant UUID for quick lookup
  // This keeps the QR code simple and fast to scan
  const qrCodeDataUrl = await QRCode.toDataURL(participantId, {
    errorCorrectionLevel: 'H', // High error correction for reliable scanning
    margin: 1,
    width: 200,
    color: {
      dark: '#1E3A5F', // Navy color to match branding
      light: '#FFFFFF',
    },
  })

  return qrCodeDataUrl
}

/**
 * Generate a QR code data URL for an individual registration
 * Contains registration data as JSON for compatibility
 * @param registrationId - The registration's UUID
 * @param eventId - The event's UUID
 * @param name - Participant name for display
 * @returns Base64 data URL of the QR code image
 */
export async function generateIndividualRegistrationQRCode(
  registrationId: string,
  eventId: string,
  name: string
): Promise<string> {
  const qrData = JSON.stringify({
    registration_id: registrationId,
    event_id: eventId,
    type: 'individual',
    name: name,
  })

  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300,
  })

  return qrCodeDataUrl
}

/**
 * Generate a QR code data URL for a group (access code)
 * Contains the access code for group-level lookup
 * @param accessCode - The group's access code
 * @returns Base64 data URL of the QR code image
 */
export async function generateGroupQRCode(accessCode: string): Promise<string> {
  const qrCodeDataUrl = await QRCode.toDataURL(accessCode, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 200,
    color: {
      dark: '#1E3A5F',
      light: '#FFFFFF',
    },
  })

  return qrCodeDataUrl
}

/**
 * Parse QR code data to determine its type
 * @param qrData - The scanned QR code data
 * @returns Object with type and relevant IDs
 */
export function parseQRCodeData(qrData: string): {
  type: 'participant' | 'individual' | 'group' | 'unknown'
  participantId?: string
  registrationId?: string
  eventId?: string
  accessCode?: string
} {
  // Try to parse as JSON first (individual registration format)
  try {
    const parsed = JSON.parse(qrData)
    if (parsed.type === 'individual' && parsed.registration_id) {
      return {
        type: 'individual',
        registrationId: parsed.registration_id,
        eventId: parsed.event_id,
      }
    }
  } catch {
    // Not JSON, continue with other checks
  }

  // Check if it's a UUID (participant ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(qrData)) {
    return {
      type: 'participant',
      participantId: qrData,
    }
  }

  // Check if it looks like an access code (alphanumeric, 6-8 chars)
  const accessCodeRegex = /^[A-Z0-9]{6,8}$/i
  if (accessCodeRegex.test(qrData)) {
    return {
      type: 'group',
      accessCode: qrData.toUpperCase(),
    }
  }

  // Extract from URL if present
  if (qrData.includes('/')) {
    const parts = qrData.split('/')
    const lastPart = parts[parts.length - 1].split('?')[0]

    if (uuidRegex.test(lastPart)) {
      return {
        type: 'participant',
        participantId: lastPart,
      }
    }

    if (accessCodeRegex.test(lastPart)) {
      return {
        type: 'group',
        accessCode: lastPart.toUpperCase(),
      }
    }
  }

  return { type: 'unknown' }
}
