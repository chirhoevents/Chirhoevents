/**
 * Lux wordmark. A placeholder sun mark until the final Lux logo is ready:
 * swap the image in here and everywhere in the dashboard updates.
 */
export default function LuxLogo({ size = 'md', subtitle = true }: { size?: 'sm' | 'md' | 'lg'; subtitle?: boolean }) {
  const mark = size === 'lg' ? 40 : size === 'sm' ? 24 : 32
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={mark} height={mark} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="8" fill="#C8A24A" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI) / 6
          const x1 = 20 + Math.cos(angle) * 12
          const y1 = 20 + Math.sin(angle) * 12
          const x2 = 20 + Math.cos(angle) * (i % 2 === 0 ? 18 : 15.5)
          const y2 = 20 + Math.sin(angle) * (i % 2 === 0 ? 18 : 15.5)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8A24A" strokeWidth="2" strokeLinecap="round" />
        })}
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`${text} font-semibold tracking-wide text-[#1E3A5F]`} style={{ fontFamily: 'Georgia, serif' }}>
          Lux
        </span>
        {subtitle && <span className="text-[10px] uppercase tracking-[0.18em] text-[#9C8466] mt-1">by ChiRho Events</span>}
      </span>
    </span>
  )
}
