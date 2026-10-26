// Badge / Name Tag renderer
// Single source of truth for all badge HTML generation. Used by the admin batch
// pre-print flow, the coordinator portal on-demand flow, and the admin check-in
// success modal. Import generateBadgesHTML for SSR-safe string generation or
// openBadgePrintWindow for in-browser printing.

export interface BadgeTemplate {
  size: 'small' | 'standard' | 'large' | 'badge_4x6' | 'business_card' | 'thermal_4x12' | 'duo_4x6' | 'postcard_4up'
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
  // Flag people whose liability form lists an allergy with a purple bar
  showAllergyBar?: boolean
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
  walkUp?: boolean
  customNote?: string | null
  // Prints the purple allergy bar. Set by the server only when the template
  // has showAllergyBar on, or ticked by hand on a walk-up badge.
  hasAllergy?: boolean
  // Replaces the role pill text, e.g. "Speaker" on a custom badge
  badgeLabel?: string | null
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
  if (tag.badgeLabel) return escapeHtml(tag.badgeLabel)
  switch (tag.participantType) {
    case 'youth_u18': return 'Youth'
    case 'youth_o18': return 'Youth (18+)'
    case 'chaperone': return 'Chaperone'
    case 'priest': return 'Priest'
    case 'deacon': return 'Deacon'
    case 'seminarian': return 'Seminarian'
    case 'religious_sister': return 'Sister'
    case 'religious_brother': return 'Brother'
    case 'staff': return 'Staff'
    case 'individual': return 'Individual'
    case 'vendor': return 'Vendor'
  }
  // Fallback for any value not covered above — trust the coarser flags.
  if (tag.isClergy) return 'Clergy'
  if (tag.isChaperone) return 'Chaperone'
  return 'Youth'
}

// A minor (under 18) is the ONLY category that should read as a minor —
// every other participant type (18+ youth, chaperones, clergy, religious,
// staff, individuals) is an adult. This mirrors the org's own liability-form
// grouping, which already buckets "youth_o18" with chaperones as "Adults &
// Chaperones (18+)" rather than with under-18 youth.
function isMinorParticipant(tag: NameTagData): boolean {
  if (tag.participantType === 'youth_u18') return true
  if (tag.participantType) return false // any other known/recognized type is an adult
  return !tag.isClergy && !tag.isChaperone // no participantType at all — fall back to flags
}

// Distinct, high-contrast colors per role so adults and minors — and
// different adult roles — are identifiable at a glance from across a room
// (e.g. checking who's using which restroom), not just by reading small text.
function participantColor(tag: NameTagData): string {
  switch (tag.participantType) {
    case 'youth_u18': return '#2563eb'         // blue — minor
    case 'youth_o18':
    case 'chaperone': return '#dc2626'         // red — adult chaperone
    case 'priest':
    case 'deacon':
    case 'seminarian': return '#7c3aed'        // purple — clergy
    case 'religious_sister':
    case 'religious_brother': return '#0d9488' // teal — religious
    case 'staff': return '#1e3a5f'             // navy — staff
    case 'individual': return '#78716c'        // neutral — individual registrant
    case 'vendor': return '#b45309'            // amber — vendor
    case 'custom': return '#be185d'            // magenta — speaker / guest
  }
  if (tag.isClergy) return '#7c3aed'
  if (tag.isChaperone) return '#dc2626'
  return '#2563eb'
}

// Shared participant-type badge style. In color mode it fills with the
// role's distinct color; in thermal/B&W mode color isn't available, so
// adults get a solid filled black badge and minors get a hollow outline —
// the adult/minor distinction still reads even on a black & white printer.
function labelStyleFor(
  tag: NameTagData,
  t: BadgeTemplate,
  opts: { fontPx: number; padY: number; padX: number; radius: number; marginTop: number; borderPx: number }
): string {
  const { fontPx, padY, padX, radius, marginTop, borderPx } = opts
  const base = `display:inline-block;padding:${padY}px ${padX}px;border-radius:${radius}px;font-size:${fontPx}px;font-weight:700;margin-top:${marginTop}px;`
  if (t.thermalMode) {
    return isMinorParticipant(tag)
      ? `${base}border:${borderPx}px solid #000;color:#000;background:none;`
      : `${base}background:#000;color:#fff;`
  }
  return `${base}background-color:${participantColor(tag)};color:white;`
}

// Scale font size down when text is long so it always fits within its container.
// optimalChars = character count that should get maxPx; longer names shrink linearly to minPx.
function fitFontSize(text: string, maxPx: number, minPx: number, optimalChars: number): string {
  const len = text.length
  if (len <= optimalChars) return `${maxPx}px`
  return `${Math.max(minPx, Math.floor(maxPx * optimalChars / len))}px`
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
// Schedule auto-fit — shrinks (and, as a last resort, trims) the back-panel
// schedule so it always fits its available height instead of getting clipped
// or bleeding past the printable area, no matter how many entries there are.
// ---------------------------------------------------------------------------

interface ScheduleSizing {
  dayHeaderPx: number // estimated vertical cost of one day header block (incl. spacing) at scale 1
  rowPx: number        // estimated vertical cost of one schedule row (incl. spacing) at scale 1
  headerFont: number
  timeFont: number
  titleFont: number
  timeWidth: number
  rowGap: number
  dayGap: number
}

const SCHEDULE_MAX_SCALE = 1.8

// Runs in the print window / preview iframe. For every measured-fit schedule
// (see renderScheduleBody's measuredFit) it binary-searches the largest --s
// scale at which the real rendered content still fits its box, so the whole
// schedule always shows — however many entries, however many of them wrap.
// Re-runs once web fonts finish loading and right before printing, since
// both can change text metrics. Without JS the server-side estimate stands.
const SCHEDULE_FIT_SCRIPT = `<script>
(function () {
  function fit() {
    var boxes = document.querySelectorAll('.sched-fit');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var inner = box.firstElementChild;
      if (!inner) continue;
      // A hair of slack so print-vs-screen text metric differences can't tip it over.
      var avail = box.clientHeight * 0.98;
      var lo = 0.1;
      var hi = parseFloat(box.getAttribute('data-max-scale')) || ${SCHEDULE_MAX_SCALE};
      box.style.setProperty('--s', String(hi));
      if (inner.offsetHeight <= avail) continue;
      for (var step = 0; step < 16; step++) {
        var mid = (lo + hi) / 2;
        box.style.setProperty('--s', String(mid));
        if (inner.offsetHeight <= avail) lo = mid; else hi = mid;
      }
      box.style.setProperty('--s', String(lo));
    }
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.addEventListener('beforeprint', fit);
})();
</script>`

function fitScheduleToHeight(
  schedule: ScheduleEntry[],
  availableHeightPx: number,
  sizing: ScheduleSizing,
  minScale = 0.1,
  maxScale = SCHEDULE_MAX_SCALE
): { scale: number; days: Map<string, ScheduleEntry[]>; hiddenCount: number } {
  const days = new Map<string, ScheduleEntry[]>()
  for (const entry of schedule) {
    if (!days.has(entry.day)) days.set(entry.day, [])
    days.get(entry.day)!.push(entry)
  }
  if (schedule.length === 0) return { scale: 1, days, hiddenCount: 0 }

  // Scales both ways: a packed schedule shrinks to fit (this is a conference —
  // it must fit, so the floor here is a near-zero sanity check, not a "give up
  // and truncate" point), a sparse one grows to fill the available space
  // instead of leaving it small with blank space below.
  const naturalHeight = days.size * sizing.dayHeaderPx + schedule.length * sizing.rowPx
  const rawScale = availableHeightPx / naturalHeight

  // If shrinking alone gets everything to fit, stop here and don't trim —
  // trimming based on unrounded per-row estimates against rounded rendered
  // font sizes can disagree by a hair over dozens of rows and drop an entry
  // that actually would have fit. Only fall through to trimming once even
  // the near-zero floor genuinely isn't enough (a truly pathological count).
  if (rawScale >= minScale) {
    return { scale: Math.min(maxScale, rawScale), days, hiddenCount: 0 }
  }

  const scale = minScale
  const scaledDayHeaderPx = sizing.dayHeaderPx * scale
  const scaledRowPx = sizing.rowPx * scale
  const trimmed = new Map<string, ScheduleEntry[]>()
  let used = 0
  let hiddenCount = 0
  for (const [day, entries] of days) {
    if (used + scaledDayHeaderPx > availableHeightPx) {
      hiddenCount += entries.length
      continue
    }
    used += scaledDayHeaderPx
    const kept: ScheduleEntry[] = []
    for (const entry of entries) {
      if (used + scaledRowPx > availableHeightPx) {
        hiddenCount += entries.length - kept.length
        break
      }
      kept.push(entry)
      used += scaledRowPx
    }
    trimmed.set(day, kept)
  }

  return { scale, days: trimmed, hiddenCount }
}

function renderScheduleBody(
  schedule: ScheduleEntry[],
  availableHeightPx: number,
  sizing: ScheduleSizing,
  colors: { headerColor: string; timeColor: string; locColor: string },
  empty: { message: string; paddingTop: string },
  minScale = 0.1,
  // When true, every size is expressed relative to a --s CSS variable and the
  // body is wrapped in a .sched-fit box that SCHEDULE_FIT_SCRIPT re-scales in
  // the browser by measuring the real rendered height. The estimate above
  // can't know which rows will wrap onto two lines, so on its own it can
  // still overflow (and get clipped) — measuring can't. The container must
  // have a definite height for this to work.
  measuredFit = false
): string {
  const { scale, days, hiddenCount } = fitScheduleToHeight(schedule, availableHeightPx, sizing, minScale)

  if (days.size === 0) {
    return `<div style="color:#aaa;text-align:center;padding-top:${empty.paddingTop};font-size:${sizing.titleFont}px;">${empty.message}</div>`
  }

  // Floors track the same near-zero minScale above (not a higher "still
  // legible" floor) so what's rendered always matches what fitScheduleToHeight
  // budgeted for — a mismatch there is what would actually cause clipping.
  const size = (base: number, floor: number) => measuredFit
    ? `max(${floor}px, calc(var(--s) * ${base}px))`
    : `${Math.max(floor, Math.round(base * scale))}px`
  const headerFont = size(sizing.headerFont, 3)
  const timeFont = size(sizing.timeFont, 3)
  const titleFont = size(sizing.titleFont, 3)
  const timeWidth = size(sizing.timeWidth, 14)
  const rowGap = size(sizing.rowGap, 0)
  const dayGap = size(sizing.dayGap, 1)

  const dayBlocks = Array.from(days.entries()).map(([day, entries]) => {
    const rows = entries.map((e) => {
      const timeRange = e.endTime ? `${e.startTime}–${e.endTime}` : e.startTime
      const loc = e.location ? `<span style="color:${colors.locColor};"> · ${escapeHtml(e.location)}</span>` : ''
      return `<div style="display:flex;gap:4px;margin-bottom:${rowGap};align-items:baseline;line-height:1.25;">
        <span style="font-size:${timeFont};white-space:nowrap;min-width:${timeWidth};color:${colors.timeColor};flex-shrink:0;">${escapeHtml(timeRange)}</span>
        <span style="font-size:${titleFont};flex:1;word-break:break-word;">${escapeHtml(e.title)}${loc}</span>
      </div>`
    }).join('')

    return `<div style="margin-bottom:${dayGap};">
      <div style="font-size:${headerFont};font-weight:700;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid ${colors.headerColor};margin-bottom:2px;padding-bottom:1px;color:${colors.headerColor};">${escapeHtml(day)}</div>
      ${rows}
    </div>`
  }).join('')

  const hiddenNote = hiddenCount > 0
    ? `<div style="font-size:${size(sizing.timeFont, 6)};color:#999;font-style:italic;text-align:center;margin-top:2px;">+ ${hiddenCount} more</div>`
    : ''

  if (!measuredFit) return dayBlocks + hiddenNote
  return `<div class="sched-fit" data-max-scale="${SCHEDULE_MAX_SCALE}" style="height:100%;overflow:hidden;--s:${scale};"><div>${dayBlocks}${hiddenNote}</div></div>`
}

// Scale the "Meal: {name}" text-label so an unusually long meal color name
// (a custom name, not just Blue/Red/etc.) never overflows its strip.
function mealLabelFontPx(name: string, maxPx: number, minPx: number, optimalChars = 10): number {
  return parseInt(fitFontSize(`Meal: ${name}`, maxPx, minPx, optimalChars))
}

// Allergy flag — a solid bar that sits right on top of the meal color so
// whoever is serving food sees it at a glance. It only says that there IS an
// allergy, never what it is. Deep purple with a label (rather than a plain
// color strip) so it can't be mistaken for the "purple" meal color. In
// thermal/B&W mode it prints as a solid black bar with white text, which
// reads differently from the outlined "Meal:" label.
const ALLERGY_COLOR = '#5b21b6'
const ALLERGY_LABEL = 'Allergy'

function allergyBarStyle(t: BadgeTemplate): string {
  return t.thermalMode
    ? 'background:#000;color:#fff;'
    : `background-color:${ALLERGY_COLOR};color:#fff;`
}

// Inline pill version for the small layouts that have no room for a bar.
function allergyPill(tag: NameTagData, t: BadgeTemplate, fontPx: number): string {
  if (!tag.hasAllergy) return ''
  return `<div style="${allergyBarStyle(t)}display:inline-block;padding:1px ${Math.round(fontPx * 0.7)}px;border-radius:3px;font-size:${fontPx}px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;margin-top:3px;">${ALLERGY_LABEL}</div>`
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

  const labelStyle = labelStyleFor(tag, t, { fontPx: 10, padY: 2, padX: 8, radius: 4, marginTop: 4, borderPx: 1 })

  const mealSection = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      const mealPx = mealLabelFontPx(tag.mealColor.name, 9, 6, 10)
      return `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:${mealPx}px;font-weight:600;padding:2px 4px;border-top:1px solid #ccc;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
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
          <img src="${t.logoUrl}" style="max-height:30px;max-width:100%;display:block;margin:0 auto;" alt="" />
        </div>
      ` : ''}
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-width:0;overflow:hidden;">
        ${t.showName ? `<div style="font-size:${fitFontSize(`${tag.firstName} ${tag.lastName}`, parseInt(f.name), 10, 16)};font-weight:bold;color:${text};word-break:break-word;max-width:100%;">${escapeHtml(tag.firstName)} ${escapeHtml(tag.lastName)}</div>` : ''}
        ${t.showGroup ? `<div style="font-size:${fitFontSize(tag.groupName, parseInt(f.details), 8, 20)};color:#666;margin-top:3px;word-break:break-word;max-width:100%;">${escapeHtml(tag.groupName)}</div>` : ''}
        ${t.showDiocese && tag.diocese ? `<div style="font-size:9px;color:#888;word-break:break-word;max-width:100%;">${escapeHtml(tag.diocese)}</div>` : ''}
        ${t.showParticipantType ? `<div style="${labelStyle}">${participantLabel(tag)}</div>` : ''}
        ${allergyPill(tag, t, 8)}
        ${tag.customNote ? `<div style="font-size:8px;font-style:italic;color:#888;margin-top:3px;">${escapeHtml(tag.customNote)}</div>` : ''}
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
      ${tag.walkUp ? `<div style="position:absolute;top:5px;right:5px;font-size:6px;background:#f59e0b;color:white;padding:1px 5px;border-radius:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;opacity:0.9;">Walk-Up</div>` : ''}
      ${mealSection}
    </div>`
}

// ---------------------------------------------------------------------------
// 4×6 badge layout  (one per page)
// ---------------------------------------------------------------------------

const MEAL_STRIP_4X6_PX = 18
const ALLERGY_STRIP_4X6_PX = 22

function render4x6Badge(tag: NameTagData, t: BadgeTemplate, header: string, showBorder = true): string {
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

  const labelStyle = labelStyleFor(tag, t, { fontPx: 16, padY: 8, padX: 20, radius: 6, marginTop: 8, borderPx: 2 })

  const mealSection = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      const mealPx = mealLabelFontPx(tag.mealColor.name, 14, 8, 14)
      return `<div style="text-align:center;font-size:${mealPx}px;font-weight:600;padding:4px 8px;border-top:1px solid #ccc;margin-top:4px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
    }
    const namePx = parseInt(fitFontSize(tag.mealColor.name, 10, 6, 14))
    return `<div style="position:absolute;bottom:0;left:0;right:0;height:${MEAL_STRIP_4X6_PX}px;background-color:${tag.mealColor.hex};display:flex;align-items:center;justify-content:center;padding:0 8px;box-sizing:border-box;overflow:hidden;">
      <span style="font-size:${namePx}px;font-weight:700;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.4);letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tag.mealColor.name)}</span>
    </div>`
  })()

  // Color mode: an absolute strip stacked right on top of the (absolute)
  // meal strip, with the footer padded up so the QR code clears both.
  // Thermal mode: the meal label is in normal flow, so the bar goes just
  // before it in flow too.
  const hasColorMealStrip = !t.thermalMode && t.showMealColor && !!tag.mealColor
  const allergyAbsolute = tag.hasAllergy && !t.thermalMode
  const allergySection = !tag.hasAllergy ? '' : allergyAbsolute
    ? `<div style="${allergyBarStyle(t)}position:absolute;left:0;right:0;bottom:${hasColorMealStrip ? MEAL_STRIP_4X6_PX : 0}px;height:${ALLERGY_STRIP_4X6_PX}px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;border-bottom:${hasColorMealStrip ? '2px solid #fff' : '0'};box-sizing:border-box;">${ALLERGY_LABEL}</div>`
    : `<div style="${allergyBarStyle(t)}text-align:center;font-size:13px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:3px 8px;margin-top:4px;">${ALLERGY_LABEL}</div>`
  // The bar's height comes back out of the name block's padding below, so a
  // badge with every field on still fits.
  const footerBottomPad = 16 + (allergyAbsolute ? ALLERGY_STRIP_4X6_PX : 0)

  return `
    <div style="
      width:4in;height:6in;background-color:${bg};color:${text};
      ${showBorder ? `box-shadow:inset 0 0 0 3px #fff;` : ''}
      page-break-after:always;position:relative;overflow:hidden;
      display:flex;flex-direction:column;
    ">
      ${headerSection}
      <div style="flex:1;display:flex;flex-direction:column;padding:${allergyAbsolute ? 4 : 16}px 20px;text-align:center;">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">
          ${t.showName ? `
            <div style="font-size:${fitFontSize(tag.firstName, 48, 22, 8)};font-weight:bold;line-height:1.1;margin-bottom:${tag.lastName ? 4 : 12}px;word-break:break-word;max-width:100%;">${escapeHtml(tag.firstName)}</div>
            ${tag.lastName ? `<div style="font-size:${fitFontSize(tag.lastName, 40, 20, 9)};font-weight:bold;line-height:1.1;margin-bottom:12px;word-break:break-word;max-width:100%;">${escapeHtml(tag.lastName)}</div>` : ''}
          ` : ''}
          ${t.showGroup ? `<div style="font-size:${fitFontSize(tag.groupName, 20, 12, 22)};color:#555;margin-bottom:4px;word-break:break-word;max-width:100%;">${escapeHtml(tag.groupName)}</div>` : ''}
          ${t.showDiocese && tag.diocese ? `<div style="font-size:${fitFontSize(tag.diocese, 16, 10, 24)};color:#777;margin-bottom:8px;word-break:break-word;max-width:100%;">${escapeHtml(tag.diocese)}</div>` : ''}
          ${t.showParticipantType ? `<div style="${labelStyle}">${participantLabel(tag)}</div>` : ''}
          ${tag.customNote ? `<div style="font-size:12px;font-style:italic;color:#888;margin-top:4px;">${escapeHtml(tag.customNote)}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:12px 20px ${footerBottomPad}px;flex-shrink:0;">
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
      ${tag.walkUp ? `<div style="position:absolute;top:8px;right:8px;font-size:9px;background:#f59e0b;color:white;padding:2px 8px;border-radius:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;opacity:0.9;">Walk-Up</div>` : ''}
      ${allergySection}
      ${mealSection}
    </div>`
}

// ---------------------------------------------------------------------------
// Business card layout  (2×5 grid on US Letter)
// ---------------------------------------------------------------------------

function renderBusinessCard(tag: NameTagData, t: BadgeTemplate): string {
  const { bg, text } = effectiveColors(t)

  const mealSection = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      const mealPx = mealLabelFontPx(tag.mealColor.name, 8, 6, 10)
      return `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:${mealPx}px;font-weight:600;padding:1px 4px;border-top:1px solid #ccc;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
    }
    return `<div style="position:absolute;bottom:0;left:0;right:0;height:7px;background-color:${tag.mealColor.hex};"></div>`
  })()

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
      ${t.showDiocese && tag.diocese ? `<div style="font-size:8px;color:#888;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tag.diocese)}</div>` : ''}
      ${t.showParticipantType ? `<div style="${labelStyleFor(tag, t, { fontPx: 9, padY: 1, padX: 6, radius: 3, marginTop: 4, borderPx: 1 })}">${participantLabel(tag)}</div>` : ''}
      ${allergyPill(tag, t, 7)}
      ${tag.customNote ? `<div style="font-size:7px;font-style:italic;color:#888;margin-top:2px;">${escapeHtml(tag.customNote)}</div>` : ''}
      ${t.showHousing && tag.housing ? `<div style="font-size:8px;margin-top:3px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><strong>Housing:</strong> ${escapeHtml(tag.housing.fullLocation)}</div>` : ''}
      ${t.showQrCode && tag.qrCode ? `
        <img src="${tag.qrCode}" style="width:36px;height:36px;margin-top:4px;" alt="" />
      ` : ''}
      ${tag.walkUp ? `<div style="position:absolute;top:3px;right:3px;font-size:5px;background:#f59e0b;color:white;padding:1px 4px;border-radius:6px;font-weight:700;text-transform:uppercase;">Walk-Up</div>` : ''}
      ${mealSection}
    </div>`
}

// ---------------------------------------------------------------------------
// Thermal 4×12 layout  (front on top 6", back upside-down on bottom 6")
// ---------------------------------------------------------------------------

function renderScheduleBack(schedule: ScheduleEntry[], t: BadgeTemplate): string {
  const { text, accent } = effectiveColors(t)
  const useColor = !t.thermalMode && t.backPanelColorMode !== 'bw'
  const colors = {
    headerColor: useColor ? accent : '#000000',
    timeColor: useColor ? '#666666' : '#333333',
    locColor: useColor ? '#888888' : '#555555',
  }

  // ~6in tall panel minus its own top/bottom padding (10px + 8px)
  const body = renderScheduleBody(
    schedule,
    558,
    { dayHeaderPx: 22, rowPx: 13, headerFont: 8, timeFont: 7, titleFont: 8, timeWidth: 52, rowGap: 2, dayGap: 7 },
    colors,
    { message: 'No schedule available', paddingTop: '40%' }
  )

  return `<div style="
    width:4in;background:#fff;color:${text};
    padding:10px 12px 8px;box-sizing:border-box;
    font-family:Arial,Helvetica,sans-serif;
  ">${body}</div>`
}

// ---------------------------------------------------------------------------
// Duo 4×6 layout — front card + back card as two SEPARATE pages, full color.
// Meant for a fold-over plastic badge holder (front pocket / back pocket)
// printed on a normal color printer, instead of one continuous thermal strip.
// ---------------------------------------------------------------------------

function renderScheduleBackPage(schedule: ScheduleEntry[], t: BadgeTemplate): string {
  const { accent } = effectiveColors(t)
  const useColor = !t.thermalMode && t.backPanelColorMode !== 'bw'
  const colors = {
    headerColor: useColor ? accent : '#000000',
    timeColor: useColor ? '#666666' : '#333333',
    locColor: useColor ? '#888888' : '#555555',
  }

  // ~6in tall page minus its own top/bottom padding (18px each)
  const body = renderScheduleBody(
    schedule,
    540,
    { dayHeaderPx: 30, rowPx: 17, headerFont: 10, timeFont: 9, titleFont: 10, timeWidth: 60, rowGap: 3, dayGap: 10 },
    colors,
    { message: 'No schedule available', paddingTop: '40%' }
  )

  return `<div style="
    width:4in;height:6in;background:#fff;color:#111;
    box-shadow:inset 0 0 0 3px #fff;
    padding:18px 20px;box-sizing:border-box;
    font-family:Arial,Helvetica,sans-serif;
    page-break-after:always;overflow:hidden;
  ">${body}</div>`
}

function renderDuo4x6Badge(
  tag: NameTagData,
  t: BadgeTemplate,
  header: string,
  schedule: ScheduleEntry[]
): string {
  // Always show meal color on the front card when the group has one assigned —
  // the template toggle is for design preview; the operational badge should always include it.
  const frontTemplate = tag.mealColor ? { ...t, showMealColor: true } : t
  const front = render4x6Badge(tag, frontTemplate, header)
  const back = t.showBackPanel !== false
    ? renderScheduleBackPage(schedule, t)
    : `<div style="width:4in;height:6in;background:#fff;page-break-after:always;"></div>`
  return `${front}\n${back}`
}

function renderThermal4x12Badge(
  tag: NameTagData,
  t: BadgeTemplate,
  header: string,
  schedule: ScheduleEntry[]
): string {
  const { bg } = effectiveColors(t)
  // Always show meal color on thermal 4×12 when the group has one assigned —
  // the template toggle is for design preview; the operational badge should always include it.
  const frontTemplate = tag.mealColor ? { ...t, showMealColor: true } : t
  // showBorder=false — the whole strip gets one border below instead of the
  // front panel getting its own (which would draw a line right at the fold).
  const frontPanel = render4x6Badge(tag, frontTemplate, header, false)
    .replace(/page-break-after:\s*always;/, '')

  const backContent = t.showBackPanel !== false
    ? renderScheduleBack(schedule, t)
    : `<div style="width:4in;height:6in;background:#fff;"></div>`

  return `
    <div style="
      width:4in;height:12in;background-color:${bg};
      box-shadow:inset 0 0 0 3px #fff;
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
// Postcard front/back badge — 4.25"×5.5" cards, 2 badges (4 cards) per
// Letter sheet in a 2×2 grid. Front card sits directly above its matching
// back/schedule card in the same column: the sheet is cut in half down the
// middle into two strips, and each strip is folded at the seam between front
// and back (or the four cards are cut apart and glued back-to-back).
// The back is printed rotated 180° — same trick the thermal roll uses —
// so folding it up-and-over behind the front card makes the schedule read
// right-side up.
// ---------------------------------------------------------------------------

// Every card gets the same plain white border on all four sides. Printers
// can't print to the very edge of the sheet (and how much they skip differs
// per side), and the cut/fold lines between cards are never perfectly
// placed, so nothing — not even the banner or meal band — runs to a card's
// edge. That way the page edges, the cut and the fold all end up looking the
// same once the badge is cut and folded.
const POSTCARD_BORDER = '0.25in'
const POSTCARD_BORDER_PX = 24 // 0.25in @ 96px/in

function renderPostcardFrontCard(tag: NameTagData, t: BadgeTemplate, header: string): string {
  const { bg, text, accent } = effectiveColors(t)
  const hasBanner = t.showHeaderBanner && !!t.headerBannerUrl

  const headerSection = hasBanner
    ? `<div style="width:100%;height:1.35in;flex-shrink:0;"><img src="${t.headerBannerUrl}" style="display:block;width:100%;height:100%;object-fit:cover;" alt="" /></div>`
    : `<div style="
         height:1.35in;flex-shrink:0;display:flex;flex-direction:column;
         justify-content:center;align-items:center;
         background:${t.thermalMode ? '#eee' : `linear-gradient(135deg,${accent} 0%,${text} 100%)`};
         color:${t.thermalMode ? '#000' : 'white'};
       ">
         ${t.showLogo && t.logoUrl ? `<img src="${t.logoUrl}" style="max-height:44px;max-width:80%;margin-bottom:8px;" alt="" />` : ''}
         ${t.showConferenceHeader && header ? `<div style="font-size:17px;font-weight:bold;text-align:center;padding:0 16px;">${escapeHtml(header)}</div>` : ''}
       </div>`

  const labelStyle = labelStyleFor(tag, t, { fontPx: 14, padY: 6, padX: 18, radius: 6, marginTop: 10, borderPx: 2 })

  const mealBand = (() => {
    if (!t.showMealColor || !tag.mealColor) return ''
    if (t.thermalMode) {
      const mealPx = mealLabelFontPx(tag.mealColor.name, 16, 10, 12)
      return `<div style="
        text-align:center;font-size:${mealPx}px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;
        border-top:2px solid #000;border-bottom:2px solid #000;padding:8px 14px;
        margin:${tag.hasAllergy ? 3 : 10}px 0 0;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      ">Meal: ${escapeHtml(tag.mealColor.name)}</div>`
    }
    const mealPx = parseInt(fitFontSize(tag.mealColor.name, 24, 14, 10))
    return `<div style="
      background-color:${tag.mealColor.hex};color:#fff;text-align:center;font-weight:800;
      font-size:${mealPx}px;letter-spacing:0.06em;text-transform:uppercase;
      padding:12px 14px;margin:${tag.hasAllergy ? 3 : 12}px 0 0;box-sizing:border-box;
      text-shadow:0 1px 2px rgba(0,0,0,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    ">${escapeHtml(tag.mealColor.name)}</div>`
  })()

  // Sits directly on top of the meal band (3px white gap between the two in
  // color mode so a purple meal color still reads as two separate bars).
  const allergyBand = tag.hasAllergy
    ? `<div style="${allergyBarStyle(t)}
        text-align:center;font-size:15px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
        padding:6px 14px;margin:12px 0 0;box-sizing:border-box;flex-shrink:0;
      ">${ALLERGY_LABEL}</div>`
    : ''

  // Left out entirely when empty so the meal band (or name block) sits right
  // on the bottom border, mirroring the banner on the top border.
  const showHousing = t.showHousing && !!tag.housing
  const showQr = t.showQrCode && !!tag.qrCode
  const footer = showHousing || showQr
    ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;padding:12px 14px;flex-shrink:0;gap:12px;">
          ${showHousing ? `<div style="font-size:13px;text-align:left;flex:1;word-break:break-word;line-height:1.4;"><strong>Housing:</strong> ${escapeHtml(tag.housing!.fullLocation)}</div>` : '<div></div>'}
          ${showQr ? `<img src="${tag.qrCode}" style="width:60px;height:60px;flex-shrink:0;" alt="" />` : ''}
        </div>`
    : (mealBand || allergyBand ? '' : '<div style="height:12px;flex-shrink:0;"></div>')

  return `
    <div style="width:4.25in;height:5.5in;background:#fff;padding:${POSTCARD_BORDER};box-sizing:border-box;">
      <div style="
        width:100%;height:100%;background-color:${bg};color:${text};
        display:flex;flex-direction:column;position:relative;overflow:hidden;
      ">
        ${headerSection}
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px 14px 0;min-width:0;overflow:hidden;">
          ${t.showName ? `<div style="font-size:${fitFontSize(`${tag.firstName} ${tag.lastName}`, 40, 22, 14)};font-weight:bold;line-height:1.15;word-break:break-word;max-width:100%;">${escapeHtml(tag.firstName)} ${escapeHtml(tag.lastName)}</div>` : ''}
          ${t.showGroup ? `<div style="font-size:${fitFontSize(tag.groupName, 20, 13, 20)};color:#666;margin-top:6px;word-break:break-word;max-width:100%;">${escapeHtml(tag.groupName)}</div>` : ''}
          ${t.showDiocese && tag.diocese ? `<div style="font-size:14px;color:#888;margin-top:2px;word-break:break-word;max-width:100%;">${escapeHtml(tag.diocese)}</div>` : ''}
          ${t.showParticipantType ? `<div style="${labelStyle}">${participantLabel(tag)}</div>` : ''}
          ${tag.customNote ? `<div style="font-size:13px;font-style:italic;color:#888;margin-top:6px;word-break:break-word;max-width:100%;">${escapeHtml(tag.customNote)}</div>` : ''}
        </div>
        ${allergyBand}
        ${mealBand}
        ${footer}
        ${tag.walkUp ? `<div style="position:absolute;top:8px;right:8px;font-size:9px;background:#f59e0b;color:white;padding:2px 8px;border-radius:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;opacity:0.9;">Walk-Up</div>` : ''}
      </div>
    </div>`
}

function renderPostcardBackCard(schedule: ScheduleEntry[], t: BadgeTemplate, rotate = false): string {
  const { accent } = effectiveColors(t)
  const useColor = !t.thermalMode && t.backPanelColorMode !== 'bw'
  const colors = {
    headerColor: useColor ? accent : '#000000',
    timeColor: useColor ? '#666666' : '#333333',
    locColor: useColor ? '#888888' : '#555555',
  }

  // 5.5in tall card minus the border on top and bottom. The whole schedule
  // is always shown — measuredFit shrinks it (or grows a short one) in the
  // browser to exactly fill this space.
  const body = renderScheduleBody(
    schedule,
    528 - POSTCARD_BORDER_PX * 2,
    { dayHeaderPx: 27, rowPx: 16, headerFont: 11, timeFont: 10, titleFont: 11, timeWidth: 60, rowGap: 3, dayGap: 9 },
    colors,
    { message: 'No schedule available', paddingTop: '35%' },
    0.1,
    true
  )

  // Rotation is baked directly into this same box (rather than wrapping it
  // in a second overflow:hidden element) since nesting overflow:hidden with
  // a rotate transform is a known source of print-vs-screen rendering
  // mismatches in Chromium's print pipeline. The border is the same on every
  // side, so the rotation doesn't change where it lands.
  return `<div style="
    width:4.25in;height:5.5in;background:#fff;color:#111;
    padding:${POSTCARD_BORDER};box-sizing:border-box;overflow:hidden;
    font-family:Arial,Helvetica,sans-serif;
    ${rotate ? 'transform:rotate(180deg);transform-origin:center center;' : ''}
  ">${body}</div>`
}

function renderPostcardPage(tags: NameTagData[], t: BadgeTemplate, header: string, schedule: ScheduleEntry[]): string {
  const blankCell = '<div style="width:4.25in;height:5.5in;background:#fff;"></div>'
  const frontCells: string[] = []
  const backCells: string[] = []

  tags.slice(0, 2).forEach((tag) => {
    const frontTemplate = tag.mealColor ? { ...t, showMealColor: true } : t
    frontCells.push(renderPostcardFrontCard(tag, frontTemplate, header))

    backCells.push(
      t.showBackPanel !== false
        ? renderPostcardBackCard(schedule, t, true)
        : `<div style="width:4.25in;height:5.5in;background:#fff;transform:rotate(180deg);"></div>`
    )
  })
  while (frontCells.length < 2) frontCells.push(blankCell)
  while (backCells.length < 2) backCells.push(blankCell)

  return `<div style="
    width:8.5in;height:11in;display:grid;
    grid-template-columns:4.25in 4.25in;grid-template-rows:5.5in 5.5in;
    page-break-after:always;
  ">${frontCells.join('')}${backCells.join('')}</div>`
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

  if (template.size === 'duo_4x6') {
    const badges = nameTags.map((tag) => renderDuo4x6Badge(tag, template, header, schedule)).join('\n')
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags — Fold-Over Badges</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
  </style>
</head>
<body>${badges}</body>
</html>`
  }

  if (template.size === 'postcard_4up') {
    const pages: string[] = []
    for (let i = 0; i < nameTags.length; i += 2) {
      pages.push(renderPostcardPage(nameTags.slice(i, i + 2), template, header, schedule))
    }
    const badges = pages.join('\n')
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Name Tags — Postcard Badges</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: ${ff}; }
  </style>
</head>
<body>${badges}${SCHEDULE_FIT_SCRIPT}</body>
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
    @page { size: letter portrait; margin: 0.5in; }
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
    @page { size: letter portrait; margin: 0.5in; }
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
// Single-badge preview HTML — renders exactly one badge/card unit using the
// SAME renderer functions as the real print output (generateBadgesHTML
// above), for display in an iframe. This keeps the on-screen Live Preview
// permanently in sync with what actually prints — no separate mockup to
// drift out of date with meal colors, schedule content, header banners, etc.
// ---------------------------------------------------------------------------

export function generatePreviewHTML(
  tag: NameTagData,
  template: BadgeTemplate,
  eventName = '',
  schedule: ScheduleEntry[] = []
): string {
  const ff = fontFamilyCSS(template.fontFamily)
  const header = template.conferenceHeaderText || eventName

  let inner: string
  switch (template.size) {
    case 'badge_4x6':
      inner = render4x6Badge(tag, template, header)
      break
    case 'duo_4x6':
      inner = renderDuo4x6Badge(tag, template, header, schedule)
      break
    case 'postcard_4up': {
      const frontTemplate = tag.mealColor ? { ...template, showMealColor: true } : template
      const front = renderPostcardFrontCard(tag, frontTemplate, header)
      const back = template.showBackPanel !== false
        ? renderPostcardBackCard(schedule, template, true)
        : `<div style="width:4.25in;height:5.5in;background:#fff;transform:rotate(180deg);"></div>`
      inner = `${front}${back}`
      break
    }
    case 'thermal_4x12':
      inner = renderThermal4x12Badge(tag, template, header, schedule)
      break
    case 'business_card':
      inner = renderBusinessCard(tag, template)
      break
    default:
      inner = renderStandardBadge(tag, template, header)
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: ${ff}; background: transparent; }
    /* Visually separate front/back when they're two independent pages (duo_4x6) */
    body > div + div { margin-top: 10px; border-top: 2px dashed #ccc; padding-top: 10px; }
  </style>
</head>
<body>${inner}${SCHEDULE_FIT_SCRIPT}</body>
</html>`
}

// Natural (unscaled) pixel size of one previewed badge/card at the browser's
// 96px/in reference — used by the preview UI to size and scale the iframe.
export function previewNaturalSize(size: BadgeTemplate['size']): { width: number; height: number } {
  switch (size) {
    case 'small': return { width: 240, height: 144 }
    case 'large': return { width: 384, height: 288 }
    case 'badge_4x6': return { width: 384, height: 576 }
    case 'business_card': return { width: 336, height: 192 }
    case 'thermal_4x12': return { width: 384, height: 1152 }
    case 'duo_4x6': return { width: 384, height: 1174 } // front + divider + back
    case 'postcard_4up': return { width: 408, height: 1078 } // front + divider + back, at 4.25x5.5 each
    default: return { width: 336, height: 216 } // 'standard'
  }
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
