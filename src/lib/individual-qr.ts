import QRCode from 'qrcode'

/**
 * Check-in QR code (as a data URL) for an individual registration. Used for
 * both self-registration and admin-added registrations so check-in reads
 * them the same way.
 */
export async function generateIndividualRegistrationQr(registration: {
  id: string
  eventId: string
  firstName: string
  lastName: string
}): Promise<string> {
  const qrData = JSON.stringify({
    registration_id: registration.id,
    event_id: registration.eventId,
    type: 'individual',
    name: `${registration.firstName} ${registration.lastName}`,
  })

  return QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300,
  })
}
