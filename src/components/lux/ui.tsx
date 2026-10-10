'use client'

/**
 * Small building blocks for Lux screens: calm, roomy, and consistent.
 */

import { ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-[#9C8466] hover:text-[#1E3A5F] mb-2 inline-block">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E3A5F]" style={{ fontFamily: 'Georgia, serif' }}>{title}</h1>
          {description && <p className="text-gray-600 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Card({ children, className, title, description, actions }: {
  children: ReactNode
  className?: string
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className={cx('bg-white rounded-xl border border-[#E8E2D4] shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h2 className="text-base font-semibold text-[#1E3A5F]">{title}</h2>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function StatCard({ label, value, hint, href, tone = 'default' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  href?: string
  tone?: 'default' | 'warn' | 'good'
}) {
  const inner = (
    <div className={cx(
      'bg-white rounded-xl border p-4 h-full transition-shadow',
      tone === 'warn' ? 'border-amber-200' : tone === 'good' ? 'border-green-200' : 'border-[#E8E2D4]',
      href && 'hover:shadow-md'
    )}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={cx('text-2xl font-semibold mt-1', tone === 'warn' ? 'text-amber-700' : 'text-[#1E3A5F]')}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[#1E3A5F] text-white hover:bg-[#162C48] disabled:bg-gray-300',
  secondary: 'bg-white text-[#1E3A5F] border border-[#D9D2C2] hover:bg-[#F5F1E8] disabled:text-gray-400',
  gold: 'bg-[#C8A24A] text-white hover:bg-[#B8923A] disabled:bg-gray-300',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:text-gray-400',
  ghost: 'text-[#1E3A5F] hover:bg-[#F5F1E8] disabled:text-gray-400',
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  className,
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; href?: string }) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed',
    BUTTON_STYLES[variant],
    className
  )
  if (href) {
    return <Link href={href} className={classes}>{children}</Link>
  }
  return (
    <button type="button" className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Field({ label, hint, error, required, children, className }: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm font-medium text-gray-800 mb-1">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-[#D9D2C2] bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] disabled:bg-gray-50'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, props.className)} />
}

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-800',
  navy: 'bg-[#1E3A5F]/10 text-[#1E3A5F]',
  gold: 'bg-[#C8A24A]/15 text-[#7A5E1E]',
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', BADGE_TONES[tone])}>{children}</span>
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#F5F1E8] flex items-center justify-center text-[#9C8466]">{icon}</div>}
      <p className="font-medium text-[#1E3A5F]">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cx('relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D4]">
          <h3 className="font-semibold text-[#1E3A5F]">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[#E8E2D4] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: {
  value: T
  onChange: (value: T) => void
  tabs: Array<{ value: T; label: ReactNode }>
}) {
  return (
    <div className="flex gap-1 border-b border-[#E8E2D4] mb-5 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cx(
            'px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
            value === tab.value ? 'border-[#C8A24A] text-[#1E3A5F] font-medium' : 'border-transparent text-gray-500 hover:text-[#1E3A5F]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
