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
export default function LuxLogo({ size = 'md', variant = 'color', subtitle = false, center = false, brand: given, className }: {
  size?: keyof typeof HEIGHTS
  variant?: 'color' | 'white' | 'mark'
  subtitle?: boolean
  // Center the subtitle under the logo instead of lining it up on the left
  center?: boolean
  brand?: LuxBrand | null
  className?: string
}) {
  const brand = useLuxBrand(given)
  const src = variant === 'white' ? brand.logoWhite : variant === 'mark' ? brand.mark : brand.logo
  const height = HEIGHTS[size]
  return (
    <span className={`inline-flex flex-col ${center ? 'items-center' : 'items-start'} leading-none ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- can be an uploaded URL */}
      <img src={src} alt="Lux" style={{ height }} className="w-auto" />
      {subtitle && <span className="text-[10px] uppercase tracking-[0.18em] text-[#9C8466] mt-1.5">by ChiRho Events</span>}
    </span>
  )
}

/** The Lux arch on its own, sized like an icon (h-4 w-4 by default) */
export function LuxMark({ className = 'h-4 w-4', brand: given }: { className?: string; brand?: LuxBrand | null }) {
  const brand = useLuxBrand(given)
  // eslint-disable-next-line @next/next/no-img-element -- can be an uploaded URL
  return <img src={brand.mark} alt="" className={`object-contain ${className}`} />
}
