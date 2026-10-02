'use client'

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'

/**
 * useState that is mirrored to sessionStorage, so a half-filled form survives
 * navigating away (e.g. Next → review page → Back) within the same tab.
 *
 * The saved value is restored after mount (not during render) to avoid a
 * hydration mismatch, and it is merged over `initial` so fields added to the
 * form later still get their defaults. sessionStorage is per-tab and is
 * cleared when the tab closes; callers should also remove the key once the
 * registration is submitted.
 */
export function useSessionDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          setValue(prev => ({ ...prev, ...saved }))
        }
      }
    } catch {
      // Storage unavailable or corrupt — start from the blank form
    }
    setRestored(true)
  }, [key])

  // Only save after restoring, otherwise the blank initial state would
  // overwrite the saved draft on mount.
  useEffect(() => {
    if (!restored) return
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Non-fatal: the form still works, it just won't survive navigation
    }
  }, [key, value, restored])

  return [value, setValue]
}
