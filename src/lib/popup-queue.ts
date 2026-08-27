const POPUP_SLOT_KEY = 'activePopup'
const POPUP_RELEASED_EVENT = 'popup-slot-released'

interface PopupSlot {
  name: string
  priority: number
}

export const POPUP_PRIORITY = {
  OVERDUE_INVOICES: 100,
  REGISTRATION_LIMIT: 50,
} as const

function readSlot(): PopupSlot | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(POPUP_SLOT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PopupSlot
  } catch {
    return null
  }
}

// Try to claim the popup slot. Returns true if granted, false if a same-or-higher
// priority popup is currently holding the slot.
export function claimPopupSlot(name: string, priority: number): boolean {
  if (typeof window === 'undefined') return false

  const existing = readSlot()
  if (existing && existing.priority >= priority && existing.name !== name) {
    return false
  }

  sessionStorage.setItem(
    POPUP_SLOT_KEY,
    JSON.stringify({ name, priority })
  )
  return true
}

// Release the popup slot (only if this popup currently holds it).
export function releasePopupSlot(name: string): void {
  if (typeof window === 'undefined') return

  const existing = readSlot()
  if (existing && existing.name !== name) return

  sessionStorage.removeItem(POPUP_SLOT_KEY)
  window.dispatchEvent(new CustomEvent(POPUP_RELEASED_EVENT))
}

// Subscribe to slot release events so a deferred popup can retry.
export function onPopupSlotReleased(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(POPUP_RELEASED_EVENT, callback)
  return () => window.removeEventListener(POPUP_RELEASED_EVENT, callback)
}
