// Badge / Name Tag renderer
// Single source of truth for all badge HTML generation. Used by the admin batch
// pre-print flow, the coordinator portal on-demand flow, and the admin check-in
// success modal. Import generateBadgesHTML for SSR-safe string generation or
// openBadgePrintWindow for in-browser printing.

export interface BadgeTemplate {
  size: 'small' | 'standard' | 'large' | 'badge_4x6' | 'business_card' | 'thermal_4x12'
  showName: boolean
  showGroup: boolean
  showParticipantType: boolean
  showHousing: boolean
  showDiocese: boolean
  showMealColor: boolean
  showQrCode: boolean
  showConferenceHeader: boolean
  conferenceHeaderText: string
  showLogo: boolean
  logoUrl: string
  showHeaderBanner: boolean
  headerBannerUrl: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  // Phase 2 — thermal & schedule
  thermalMode?: boolean
  showBackPanel?: boolean
  backPanelColorMode?: 'color' | 'bw'
}

export interface NameTagData {
  participantId: string
  firstName: string
  lastName: string
  fullName: string
  groupName: string
  diocese: string | null
  participantType: string
  isChaperone: boolean
  isClergy: boolean
  housing: {
    building: string
    room: string
    bed: string | null
    fullLocation: string
  } | null
  mealColor: {
    name: string
    hex: string
  } | null
  qrCode?: string | null
}

export interface ScheduleEntry {
  id: string
  day: string
  dayDate?: string | null
  startTime: string
  endTime?: string | null
  title: string
  location?: string | null
  description?: string | null
  order: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fontFamilyCSS(fontFamily: string): string {
  if (fontFamily === 'serif') return 'Georgia, "Times New Roman", serif'
  if (fontFamily === 'monospace') return '"Courier New", Courier, monospace'
  return 'Arial, Helvetica, sans-serif'
}

function participantLabel(tag: NameTagData): string {
  if (tag.isClergy) return 'Clergy'
  if (tag.isChaperone) return 'Chaperone'
  return 'Youth'
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Effective colours — respects thermal mode (all black/white)
function effectiveColors(t: BadgeTemplate) {
  if (t.thermalMode) {
    return { bg: '#FFFFFF', text: '#000000', accent: '#000000' }
  }
  return { bg: t.backgroundColor, text: t.textColor, accent: t.accentColor }
}

// ---------------------------------------------------------------------------
// Standard small/medium/large layout  (multiple per US-Letter page)
// ---------------------------------------------------------------------------

function renderStandardBadge(tag: NameTagData, t: BadgeTemplate, header: string): string {
  const { bg, text, accent } = effectiveColors(t)
  const fonts: Record<string, { name: string; details: string }> = {
    small: { name: '16px', details: '10px' },
    medium: { name: '20px', details: '12px' },
    large: { name: '24px', details: '14px' },
  }
  const f = fonts[t.fontSize] || fonts.medium

  const labelStyle = t.thermalMode
    ? `display:inline-block;border:1px solid #000;color:#000;background:none;padding:2px 8px;border-radius:4px;font-size:10px;margin-top:4px;`
    : `display:inline-block;background-color:${accent};color:white;padding:2px 8px;border-radius:4px;font-size:10px;margin-top:4px;`

  const mealSection = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      return `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:9px;font-weight:600;padding:2px 0;border-top:1px solid #ccc;">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
    }
    return `<div style="position:absolute;bottom:0;left:0;right:0;height:8px;border-radius:0 0 7px 7px;background-color:${tag.mealColor.hex};"></div>`
  })()

  return `
    <div style="
      width:${sizeCSS(t.size).width};height:${sizeCSS(t.size).height};
      border:1px solid #ccc;border-radius:8px;padding:12px;
      box-sizing:border-box;display:flex;flex-direction:column;
      background-color:${bg};color:${text};
      page-break-inside:avoid;position:relative;overflow:hidden;
    ">
      ${t.showConferenceHeader && header ? `
        <div style="
          text-align:center;font-size:10px;font-weight:600;padding:4px;
          background-color:${t.thermalMode ? '#eee' : accent};
          color:${t.thermalMode ? '#000' : 'white'};
          margin:-12px -12px 8px -12px;border-radius:7px 7px 0 0;
        ">${escapeHtml(header)}</div>
      ` : ''}
      ${t.showLogo && t.logoUrl ? `
        <div style="text-align:center;padding:4px 0;">
          <img src="${t.logoUrl}" style="max-height:30px;max-width:100%;" alt="" />
        </div>
      ` : ''}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        ${t.showName ? `<div style="font-size:${f.name};font-weight:bold;color:${text};">${escapeHtml(tag.firstName)} ${escapeHtml(tag.lastName)}</div>` : ''}
        ${t.showGroup ? `<div style="font-size:${f.details};color:#666;margin-top:4px;">${escapeHtml(tag.groupName)}</div>` : ''}
        ${t.showDiocese && tag.diocese ? `<div style="font-size:10px;color:#888;">${escapeHtml(tag.diocese)}</div>` : ''}
        ${t.showParticipantType ? `<div style="${labelStyle}">${participantLabel(tag)}</div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:8px;">
        ${t.showHousing && tag.housing ? `
          <div style="font-size:10px;text-align:left;flex:1;">
            <strong>Housing:</strong> ${escapeHtml(tag.housing.fullLocation)}
          </div>
        ` : '<div></div>'}
        ${t.showQrCode && tag.qrCode ? `
          <img src="${tag.qrCode}" style="width:40px;height:40px;flex-shrink:0;" alt="" />
        ` : ''}
      </div>
      ${mealSection}
    </div>`
}

// ---------------------------------------------------------------------------
// 4×6 badge layout  (one per page)
// ---------------------------------------------------------------------------

function render4x6Badge(tag: NameTagData, t: BadgeTemplate, header: string): string {
  const { bg, text, accent } = effectiveColors(t)
  const has4x6Banner = t.showHeaderBanner && !!t.headerBannerUrl

  const headerSection = has4x6Banner
    ? `<div style="width:4in;height:2.5in;flex-shrink:0;">
         <img src="${t.headerBannerUrl}" style="width:100%;height:100%;object-fit:cover;" alt="" />
       </div>`
    : `<div style="
         height:2.5in;flex-shrink:0;display:flex;flex-direction:column;
         justify-content:center;align-items:center;
         background:${t.thermalMode ? '#eee' : `linear-gradient(135deg,${accent} 0%,${text} 100%)`};
         color:${t.thermalMode ? '#000' : 'white'};
       ">
         ${t.showLogo && t.logoUrl ? `<img src="${t.logoUrl}" style="max-height:80px;max-width:80%;margin-bottom:12px;" alt="" />` : ''}
         ${t.showConferenceHeader && header ? `<div style="font-size:28px;font-weight:bold;text-align:center;padding:0 20px;">${escapeHtml(header)}</div>` : ''}
       </div>`

  const labelStyle = t.thermalMode
    ? `display:inline-block;border:2px solid #000;color:#000;background:none;padding:8px 20px;border-radius:6px;font-size:16px;font-weight:600;margin-top:8px;`
    : `display:inline-block;background-color:${accent};color:white;padding:8px 20px;border-radius:6px;font-size:16px;font-weight:600;margin-top:8px;`

  const mealSection = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      return `<div style="text-align:center;font-size:14px;font-weight:600;padding:4px 0;border-top:1px solid #ccc;margin-top:4px;">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
    }
    return `<div style="position:absolute;bottom:0;left:0;right:0;height:12px;background-color:${tag.mealColor.hex};"></div>`
  })()

  return `
    <div style="
      width:4in;height:6in;background-color:${bg};color:${text};
      page-break-after:always;position:relative;overflow:hidden;
      display:flex;flex-direction:column;
    ">
      ${headerSection}
      <div style="flex:1;display:flex;flex-direction:column;padding:16px 20px;text-align:center;">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">
          ${t.showName ? `
            <div style="font-size:48px;font-weight:bold;line-height:1.1;margin-bottom:4px;">${escapeHtml(tag.firstName)}</div>
            <div style="font-size:40px;font-weight:bold;line-height:1.1;margin-bottom:12px;">${escapeHtml(tag.lastName)}</div>
          ` : ''}
          ${t.showGroup ? `<div style="font-size:20px;color:#555;margin-bottom:4px;">${escapeHtml(tag.groupName)}</div>` : ''}
          ${t.showDiocese && tag.diocese ? `<div style="font-size:16px;color:#777;margin-bottom:8px;">${escapeHtml(tag.diocese)}</div>` : ''}
          ${t.showParticipantType ? `<div style="${labelStyle}">${participantLabel(tag)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:12px 20px 16px;flex-shrink:0;">
        ${t.showHousing && tag.housing ? `
          <div style="font-size:16px;text-align:left;flex:1;line-height:1.3;">
            <strong style="display:block;margin-bottom:2px;">Housing:</strong>
            ${escapeHtml(tag.housing.fullLocation)}
          </div>
        ` : '<div></div>'}
        ${t.showQrCode && tag.qrCode ? `
          <img src="${tag.qrCode}" style="width:70px;height:70px;flex-shrink:0;margin-left:12px;" alt="" />
        ` : ''}
      </div>
      ${mealSection}
    </div>`
}

// ---------------------------------------------------------------------------
// Business card layout  (2×5 grid on US Letter)
// ---------------------------------------------------------------------------

function renderBusinessCard(tag: NameTagData, t: BadgeTemplate): string {
  const { bg, text, accent } = effectiveColors(t)

  return `
    <div style="
      width:3.5in;height:2in;background-color:${bg};color:${text};
      border:1px solid #ccc;padding:10px;box-sizing:border-box;
      display:flex;flex-direction:column;justify-content:center;align-items:center;
      text-align:center;position:relative;overflow:hidden;page-break-inside:avoid;
    ">
      ${t.showName ? `
        <div style="font-size:18px;font-weight:bold;line-height:1.2;">${escapeHtml(tag.firstName)} ${escapeHtml(tag.lastName)}</div>
      ` : ''}
      ${t.showGroup ? `
        <div style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(tag.groupName)}</div>
      ` : ''}
      ${t.showParticipantType ? `
        <div style="
          margin-top:4px;font-size:9px;
          display:inline-block;padding:1px 6px;border-radius:3px;
          ${t.thermalMode ? 'border:1px solid #000;' : `background-color:${accent};color:white;`}
        ">${participantLabel(tag)}</div>
      ` : ''}
      ${t.showQrCode && tag.qrCode ? `
        <img src="${tag.qrCode}" style="width:36px;height:36px;margin-top:6px;" alt="" />
      ` : ''}
    </div>`
}

// ---------------------------------------------------------------------------
// Thermal 4×12 layout  (front on top 6", back upside-down on bottom 6")
// ---------------------------------------------------------------------------

function renderScheduleBack(schedule: ScheduleEntry[], t: BadgeTemplate): string {
  const { text, accent } = effectiveColors(t)
  const useColor = !t.thermalMode && t.backPanelColorMode !== 'bw'
  const headerColor = useColor ? accent : '#333333'

  // Group entries by day
  const days = new Map<string, ScheduleEntry[]>()
  for (const entry of schedule) {
    if (!days.has(entry.day)) days.set(entry.day, [])
    days.get(entry.day)!.push(entry)
  }

  const dayBlocks = Array.from(days.entries()).map(([day, entries]) => {
    const rows = entries.map((e) => {
      const timeRange = e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime
      const loc = e.location ? ` <span style="color:#888;font-size:9px;">(${escapeHtml(e.location)})</span>` : ''
      return `<div style="display:flex;gap:6px;margin-bottom:3px;align-items:baseline;">
        <span style="font-size:9px;white-space:nowrap;min-width:80px;color:#555;">${escapeHtml(timeRange)}</span>
        <span style="font-size:10px;flex:1;">${escapeHtml(e.title)}${loc}</span>
      </div>`
    }).join('')

    return `<div style="margin-bottom:10px;">
      <div style="
        font-size:11px;font-weight:700;text-transform:uppercase;
        border-bottom:1px solid ${headerColor};margin-bottom:4px;padding-bottom:2px;
        color:${headerColor};
      ">${escapeHtml(day)}</div>
      ${rows}
    </div>`
  }).join('')

  return `<div style="
    width:4in;height:6in;background:#fff;color:${text};
    padding:16px 18px;box-sizing:border-box;overflow:hidden;
    font-family:Arial,Helvetica,sans-serif;
  ">
    ${dayBlocks || '<div style="color:#aaa;text-align:center;margin-top:2in;font-size:12px;">No schedule available</div>'}
  </div>`
}

function renderThermal4x12Badge(
  tag: NameTagData,
  t: BadgeTemplate,
  header: string,
  schedule: ScheduleEntry[]
): string {
  const { bg } = effectiveColors(t)
  const frontPanel = render4x6Badge(tag, t, header)
    .replace(/page-break-after:\s*always;/, '')

  const backContent = t.showBackPanel !== false
    ? renderScheduleBack(schedule, t)
    : `<div style="width:4in;height:6in;background:#fff;"></div>`

  return `
    <div style="
      width:4in;height:12in;background-color:${bg};
      page-break-after:always;position:relative;overflow:hidden;
    ">
      <!-- Front panel (top 6 inches) -->
      <div style="width:4in;height:6in;overflow:hidden;">
        ${frontPanel}
      </div>
      <!-- Dashed fold indicator -->
      <div style="
        position:absolute;top:6in;left:0;right:0;
        border-top:1px dashed #bbb;z-index:10;pointer-events:none;
      ">
        <span style="
          position:absolute;left:50%;transform:translateX(-50%) translateY(-50%);
          background:#fff;padding:0 6px;font-size:7px;color:#bbb;white-space:nowrap;
        ">FOLD HERE</span>
      </div>
      <!-- Back panel (bottom 6 inches) — rotated 180° so it reads correctly when folded -->
      <div style="
        width:4in;height:6in;overflow:hidden;
        transform:rotate(180deg);transform-origin:center center;
      ">
        ${backContent}
      </div>
    </div>`
}

// ---------------------------------------------------------------------------
// Size dimension helper
// ---------------------------------------------------------------------------

function sizeCSS(size: BadgeTemplate['size']): { width: string; height: string } {
  switch (size) {
    case 'small': return { width: '2.5in', height: '1.5in' }
    case 'large': return { width: '4in', height: '3in' }
    case 'business_card': return { width: '3.5in', height: '2in' }
    default: return { width: '3.5in', height: '2.25in' } // 'standard'
  }
}

// ---------------------------------------------------------------------------
// Main export: generate complete printable HTML document
// ---------------------------------------------------------------------------

export function generateBadgesHTML(
  nameTags: NameTagData[],
  template: BadgeTemplate,
  eventName = '',
  schedule: ScheduleEntry[] = [],
  options: { cropMarks?: boolean } = {}
): string {
  const ff = fontFamilyCSS(template.fontFamily)
  const header = template.conferenceHeaderText || eventName

  if (template.size === 'badge_4x6') {
    const badges = nameTags.map((tag) => render4x6Badge(tag, template, header)).join('\n')
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags — 4×6 Badges</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
    .badge:last-child { page-break-after: auto !important; }
  </style>
</head>
<body>${badges}</body>
</html>`
  }

  if (template.size === 'thermal_4x12') {
    const badges = nameTags.map((tag) => renderThermal4x12Badge(tag, template, header, schedule)).join('\n')
    const cropCSS = options.cropMarks
      ? `@page { size: 4in 12in; margin: 0; marks: crop cross; }`
      : `@page { size: 4in 12in; margin: 0; }`
    const cropBorderCSS = options.cropMarks
      ? `.thermal-badge-wrapper { outline: 0.5px dashed #ccc; }`
      : ''
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags — 4×12 Thermal Roll</title>
  <style>
    ${cropCSS}
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
    ${cropBorderCSS}
  </style>
</head>
<body>${badges}</body>
</html>`
  }

  if (template.size === 'business_card') {
    const cards = nameTags.map((tag) => renderBusinessCard(tag, template)).join('\n')
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags — Business Cards</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
    .cards-grid {
      display: grid;
      grid-template-columns: 3.5in 3.5in;
      grid-auto-rows: 2in;
      gap: 0;
    }
  </style>
</head>
<body>
  <div class="cards-grid">${cards}</div>
</body>
</html>`
  }

  // small / standard / large — multiple per letter page
  const tags = nameTags.map((tag) => renderStandardBadge(tag, template, header)).join('\n')
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
    .name-tags-container { display: flex; flex-wrap: wrap; gap: 0.25in; }
  </style>
</head>
<body>
  <div class="name-tags-container">${tags}</div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Browser utility — open a print window with the generated HTML
// Only safe to call in browser event handlers (not during SSR).
// ---------------------------------------------------------------------------

export function openBadgePrintWindow(
  nameTags: NameTagData[],
  template: BadgeTemplate,
  eventName = '',
  schedule: ScheduleEntry[] = [],
  options: { cropMarks?: boolean } = {}
): void {
  const html = generateBadgesHTML(nameTags, template, eventName, schedule, options)
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 500)
}
