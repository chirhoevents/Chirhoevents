'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_LUX_BRAND, type LuxBrand } from '@/lib/lux/brand-shared'

// Loaded once per page, so an uploaded logo replaces the default everywhere
let brandPromise: Promise<LuxBrand> | null = null
function loadBrand(): Promise<LuxBrand> {
  brandPromise ??= fetch('/api/lux/brand')
    .then(r => (r.ok ? r.json() : DEFAULT_LUX_BRAND))
    .catch(() => DEFAULT_LUX_BRAND)
  return brandPromise
}

export function useLuxBrand(initial?: LuxBrand | null): LuxBrand {
  const [brand, setBrand] = useState<LuxBrand>(initial ?? DEFAULT_LUX_BRAND)
  useEffect(() => {
    if (initial) return
    let alive = true
    loadBrand().then(b => { if (alive) setBrand(b) })
    return () => { alive = false }
  }, [initial])
  return brand
}

const HEIGHTS = { sm: 24, md: 34, lg: 52, xl: 72 } as const

/** The Lux logo. variant "white" is for navy backgrounds; "mark" is the arch alone. */
export default function LuxLogo({ size = 'md', variant = 'color', subtitle = false, brand: given, className }: {
  size?: keyof typeof HEIGHTS
  variant?: 'color' | 'white' | 'mark'
  subtitle?: boolean
  brand?: LuxBrand | null
  className?: string
}) {
  const brand = useLuxBrand(given)
  const src = variant === 'white' ? brand.logoWhite : variant === 'mark' ? brand.mark : brand.logo
  const height = HEIGHTS[size]
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- can be an uploaded URL */}
      <img src={src} alt="Lux" style={{ height }} className="w-auto" />
      {subtitle && <span className="text-[10px] uppercase tracking-[0.18em] text-[#9C8466] mt-1.5">by ChiRho Events</span>}
    </span>
  )
}
