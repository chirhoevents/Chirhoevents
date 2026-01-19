/**
 * Shared Welcome Packet Print Template
 * Used by both pre-print (welcome-packets page) and check-in print (SALVE page)
 * to ensure consistent formatting across all welcome packets.
 */

export interface PacketData {
  event: {
    name: string
    organizationName?: string
    logoUrl?: string | null
    startDate?: Date | string
    endDate?: Date | string
    location?: string
  }
  group: {
    id: string
    name: string
    diocese?: string | null
    accessCode: string
    contactEmail?: string
    contactPhone?: string
  }
  mealColor?: {
    name: string
    colorHex: string
    saturdayBreakfast?: string | null
    saturdayLunch?: string | null
    saturdayDinner?: string | null
    sundayBreakfast?: string | null
  } | null
  smallGroup?: {
    sgl?: string | null
    religious?: string | null
    meetingRoom?: string | null
  } | null
  participants: {
    total: number
    youth: number
    chaperones: number
    clergy: number
    list: Array<{
      name: string
      participantType?: string
      isChaperone?: boolean
      isClergy?: boolean
      gender?: string
      housing?: {
        building: string
        room: string
        bed?: string | null
      } | null
    }>
  }
  housing: {
    totalRooms: number
    summary: Array<{
      building: string
      roomNumber: string
      floor?: number | string
      capacity: number
      gender?: string
      occupants: Array<{
        name: string
        bedLetter?: string | null
        participantType?: string
      }>
    }>
  }
  resources?: {
    schedule?: Array<{
      day: string
      startTime: string
      endTime?: string
      title: string
      location?: string
      description?: string
    }>
    mealTimes?: Array<{
      day: string
      meal: string
      time: string
      color?: string
    }>
  }
  inserts?: Array<{
    name: string
    fileUrl?: string
    imageUrls?: string[] | null
  }>
}

export interface PrintSettings {
  includeSchedule?: boolean
  includeMap?: boolean
  includeRoster?: boolean
  includeHousingAssignments?: boolean
  includeHousingColumn?: boolean
  includeEmergencyContacts?: boolean
}

/**
 * Generate printable HTML for a single welcome packet
 */
export function generateWelcomePacketHTML(packet: PacketData, settings: PrintSettings = {}): string {
  const {
    includeRoster = true,
    includeHousingAssignments = true,
    includeHousingColumn = true,
  } = settings

  // Participant rows for roster table
  const participantRows = packet.participants?.list?.map((p, i) => `
    <tr style="${i % 2 === 0 ? 'background: #fafafa;' : ''}">
      <td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e5e5e5;">${p.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: center; border-bottom: 1px solid #e5e5e5;">${p.participantType === 'chaperone' || p.isChaperone ? 'Chaperone' : p.participantType === 'priest' || p.isClergy ? 'Clergy' : 'Youth'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: center; border-bottom: 1px solid #e5e5e5;">${p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : '-'}</td>
      ${includeHousingColumn ? `<td style="padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e5e5e5;">${p.housing ? `${p.housing.building} ${p.housing.room}${p.housing.bed ? '-' + p.housing.bed : ''}` : 'TBD'}</td>` : ''}
    </tr>
  `).join('') || ''

  // Meal color section
  const mealColorSection = packet.mealColor ? `
    <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: ${packet.mealColor.colorHex}15; border-left: 4px solid ${packet.mealColor.colorHex};">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 20px; height: 20px; border-radius: 50%; background: ${packet.mealColor.colorHex};"></div>
        <span style="font-size: 13px; font-weight: 600; color: ${packet.mealColor.colorHex};">Meal Color: ${packet.mealColor.name}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
        <div>
          <strong style="font-size: 11px;">Saturday</strong>
          ${packet.mealColor.saturdayBreakfast ? `<div style="margin: 2px 0;">Breakfast: ${packet.mealColor.saturdayBreakfast}</div>` : ''}
          ${packet.mealColor.saturdayLunch ? `<div style="margin: 2px 0;">Lunch: ${packet.mealColor.saturdayLunch}</div>` : ''}
          ${packet.mealColor.saturdayDinner ? `<div style="margin: 2px 0;">Dinner: ${packet.mealColor.saturdayDinner}</div>` : ''}
        </div>
        <div>
          <strong style="font-size: 11px;">Sunday</strong>
          ${packet.mealColor.sundayBreakfast ? `<div style="margin: 2px 0;">Breakfast: ${packet.mealColor.sundayBreakfast}</div>` : ''}
        </div>
      </div>
    </div>
  ` : ''

  // Small group section
  const smallGroupSection = packet.smallGroup && (packet.smallGroup.sgl || packet.smallGroup.religious || packet.smallGroup.meetingRoom) ? `
    <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: #f3e8ff; border-left: 4px solid #9333ea;">
      <div style="font-size: 13px; font-weight: 600; color: #6b21a8; margin-bottom: 8px;">Small Group Information</div>
      <div style="font-size: 11px;">
        ${packet.smallGroup.sgl ? `<div style="margin: 2px 0;"><strong>Small Group Leader:</strong> ${packet.smallGroup.sgl}</div>` : ''}
        ${packet.smallGroup.religious ? `<div style="margin: 2px 0;"><strong>Religious:</strong> ${packet.smallGroup.religious}</div>` : ''}
        ${packet.smallGroup.meetingRoom ? `<div style="margin: 2px 0;"><strong>Meeting Location:</strong> ${packet.smallGroup.meetingRoom}</div>` : ''}
      </div>
    </div>
  ` : ''

  // Housing summary section
  const housingSummarySection = includeHousingAssignments && packet.housing?.summary?.length > 0 ? `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #1a365d; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #c9a227;">Housing Assignments</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        ${packet.housing.summary.map(room => `
          <div style="padding: 8px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e5e5e5;">
            <div style="font-size: 12px; font-weight: 600; color: #1a365d;">${room.building} - ${room.roomNumber}</div>
            <div style="font-size: 10px; color: #666; margin-top: 2px;">${room.gender === 'male' ? 'Male' : room.gender === 'female' ? 'Female' : 'Mixed'} • Capacity: ${room.capacity}</div>
            ${room.occupants?.length > 0 ? `
              <div style="margin-top: 6px; font-size: 10px; color: #555;">
                ${room.occupants.map(o => `<div style="margin: 1px 0;">• ${o.name}${o.bedLetter ? ` (Bed ${o.bedLetter})` : ''}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  // Schedule section
  const scheduleSection = settings.includeSchedule && packet.resources?.schedule && packet.resources.schedule.length > 0 ? `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #1a365d; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #c9a227;">Event Schedule</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #ddd;">Day</th>
            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #ddd;">Time</th>
            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #ddd;">Event</th>
            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #ddd;">Location</th>
          </tr>
        </thead>
        <tbody>
          ${packet.resources.schedule.map((entry, i) => `
            <tr style="${i % 2 === 0 ? 'background: #fafafa;' : ''}">
              <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${entry.day}</td>
              <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${entry.startTime}${entry.endTime ? ` - ${entry.endTime}` : ''}</td>
              <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${entry.title}</td>
              <td style="padding: 4px 6px; border-bottom: 1px solid #eee;">${entry.location || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  return `
    <div style="page-break-after: always; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 8in; margin: 0 auto;">
      <!-- Header with Logos -->
      <div style="text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 3px solid #c9a227;">
        <!-- ChiRho Events Logo - Dark version, centered above org logo -->
        <div style="margin-bottom: 8px;">
          <img src="/logo-dark.png" alt="ChiRho Events" style="height: 28px;" onerror="this.onerror=null; this.src='/logo-horizontal.png'; this.onerror=function(){this.style.display='none'}" />
        </div>

        <!-- Organization Logo - Centered -->
        ${packet.event.logoUrl ? `
          <div style="margin-bottom: 8px;">
            <img src="${packet.event.logoUrl}" alt="${packet.event.organizationName || 'Organization'}" style="max-height: 50px; max-width: 200px;" onerror="this.style.display='none'" />
          </div>
        ` : ''}

        <div style="font-size: 20px; font-weight: 700; color: #1a365d; margin-top: 4px;">${packet.event.name}</div>
        ${packet.event.organizationName ? `<div style="font-size: 12px; color: #666;">${packet.event.organizationName}</div>` : ''}
      </div>

      <!-- Group Salve Banner -->
      <div style="background: linear-gradient(135deg, #1a365d 0%, #2d4a6f 100%); color: white; padding: 14px; border-radius: 8px; text-align: center; margin-bottom: 16px;">
        <div style="font-size: 14px; font-style: italic; letter-spacing: 1px; opacity: 0.9; margin-bottom: 2px;">Salve,</div>
        <div style="font-size: 18px; font-weight: 700;">${packet.group.name}</div>
        ${packet.group.diocese ? `<div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">${packet.group.diocese}</div>` : ''}
        <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">${packet.participants.total} Participants</div>
      </div>

      <!-- Group Info Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #c9a227;">
          <div style="font-size: 11px; font-weight: 600; color: #1a365d; margin-bottom: 6px;">Group Information</div>
          <div style="font-size: 10px;">
            <div style="margin: 2px 0;"><strong>Access Code:</strong> <span style="font-family: monospace; font-weight: 600; letter-spacing: 1px;">${packet.group.accessCode}</span></div>
            <div style="margin: 2px 0;"><strong>Participants:</strong> ${packet.participants.youth} Youth, ${packet.participants.chaperones} Chaperones${packet.participants.clergy > 0 ? `, ${packet.participants.clergy} Clergy` : ''}</div>
          </div>
        </div>
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #c9a227;">
          <div style="font-size: 11px; font-weight: 600; color: #1a365d; margin-bottom: 6px;">Contact Information</div>
          <div style="font-size: 10px;">
            ${packet.group.contactEmail ? `<div style="margin: 2px 0;"><strong>Email:</strong> ${packet.group.contactEmail}</div>` : ''}
            ${packet.group.contactPhone ? `<div style="margin: 2px 0;"><strong>Phone:</strong> ${packet.group.contactPhone}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Meal Color -->
      ${mealColorSection}

      <!-- Small Group -->
      ${smallGroupSection}

      <!-- Schedule -->
      ${scheduleSection}

      <!-- Housing Summary -->
      ${housingSummarySection}

      <!-- Participant Roster -->
      ${includeRoster ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 600; color: #1a365d; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #c9a227;">
            Participant Roster
            <span style="font-size: 10px; font-weight: 400; color: #666; margin-left: 8px;">
              (${packet.participants.total} total)
            </span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; border-bottom: 2px solid #ddd;">Name</th>
                <th style="padding: 6px 8px; text-align: center; font-size: 10px; font-weight: 600; border-bottom: 2px solid #ddd;">Type</th>
                <th style="padding: 6px 8px; text-align: center; font-size: 10px; font-weight: 600; border-bottom: 2px solid #ddd;">Gender</th>
                ${includeHousingColumn ? '<th style="padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; border-bottom: 2px solid #ddd;">Housing</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${participantRows}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="text-align: center; font-size: 9px; color: #999; padding-top: 12px; margin-top: 16px; border-top: 1px solid #eee;">
        <div>Generated on ${new Date().toLocaleString()}</div>
        <div style="margin-top: 2px;">Powered by ChiRho Events</div>
      </div>
    </div>
  `
}

/**
 * Generate printable HTML for multiple welcome packets
 */
export function generateMultiplePacketsHTML(packets: PacketData[], settings: PrintSettings = {}, inserts?: Array<{ name: string; imageUrls?: string[] | null }>): string {
  const activeInserts = inserts?.filter(i => i.imageUrls && i.imageUrls.length > 0) || []

  return `<!DOCTYPE html>
<html>
<head>
  <title>Welcome Packets</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .packet:last-child {
      page-break-after: auto;
    }
    .insert-page {
      page-break-before: always;
    }
    .insert-image {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
    }
    .insert-title {
      color: #1a365d;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #c9a227;
    }
  </style>
</head>
<body>
  ${packets.map((packet, packetIndex) => `
    <div class="packet">
      ${generateWelcomePacketHTML(packet, settings)}
    </div>
    ${/* Add inserts after each packet */
      activeInserts.map((insert) =>
        (insert.imageUrls as string[]).map((imageUrl, imgIndex) => `
          <div class="insert-page">
            ${imgIndex === 0 ? `<div class="insert-title">${insert.name}</div>` : ''}
            <img src="${imageUrl}" alt="${insert.name}" class="insert-image" />
          </div>
        `).join('')
      ).join('')
    }
  `).join('')}
</body>
</html>`
}

/**
 * Open print dialog with generated packets
 */
export function printWelcomePackets(packets: PacketData[], settings: PrintSettings = {}, inserts?: Array<{ name: string; imageUrls?: string[] | null }>): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return false
  }

  const html = generateMultiplePacketsHTML(packets, settings, inserts)
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
  }, 300)

  return true
}
