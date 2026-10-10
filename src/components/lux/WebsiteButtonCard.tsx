'use client'

import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button, Card, cx } from '@/components/lux/ui'

type ButtonText = 'en' | 'es' | 'both'

const LABELS: Record<ButtonText, string> = {
  en: 'Register online',
  es: 'Inscripciones en línea',
  both: 'Register online · Inscripciones',
}

/** Copy-and-paste HTML for a parish's own website (WordPress, Wix, Squarespace...) */
export function websiteButtonHtml(params: { url: string; iconUrl: string; label: string; color: string }) {
  const style = [
    'display:inline-flex', 'align-items:center', 'gap:10px', 'padding:12px 22px', 'border-radius:10px',
    `background:${params.color}`, 'color:#ffffff', "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", 'font-size:17px',
    'font-weight:600', 'text-decoration:none', 'line-height:1',
  ].join(';')
  return `<a href="${params.url}" target="_blank" rel="noopener" style="${style}">` +
    `<img src="${params.iconUrl}" alt="" width="22" height="22" style="display:block;border:0" />` +
    `${params.label}</a>`
}

export default function WebsiteButtonCard({ slug, accentColor }: { slug: string; accentColor: string | null }) {
  const [text, setText] = useState<ButtonText>('en')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chirhoevents.com'
  const url = `${origin}/lux/${slug}${text === 'es' ? '?lang=es' : ''}`
  const color = accentColor ?? '#1E3A5F'
  const html = useMemo(
    () => websiteButtonHtml({ url, iconUrl: `${origin}/lux/lux-mark-white.png`, label: LABELS[text], color }),
    [url, origin, text, color]
  )

  const copy = (value: string, what: string) => {
    navigator.clipboard.writeText(value)
    toast.success(`${what} copied`)
  }

  return (
    <Card title="Add Lux to your parish website" description="Put a registration button on your website so families find it right away.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as ButtonText[]).map(k => (
            <button key={k} type="button" onClick={() => setText(k)}
              className={cx('rounded-full border px-3 py-1 text-sm', text === k ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50')}>
              {k === 'en' ? 'English' : k === 'es' ? 'Español' : 'Both'}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 flex justify-center">
          {/* The same markup they paste, so what they see is what they get */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => copy(html, 'Button code')}><Copy className="h-4 w-4" /> Copy button code</Button>
          <Button variant="secondary" onClick={() => copy(url, 'Link')}><Copy className="h-4 w-4" /> Copy plain link</Button>
        </div>

        <div className="rounded-lg bg-[#FAF8F3] p-4 text-sm text-gray-700 space-y-2">
          <p className="font-medium text-[#1E3A5F]">Adding it to WordPress</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open the page you want it on (your faith formation page, the home page...) and click <strong>Edit</strong>.</li>
            <li>Click <strong>+</strong> to add a block and choose <strong>Custom HTML</strong>.</li>
            <li>Paste the button code and click <strong>Update</strong>.</li>
          </ol>
          <p className="text-gray-500">On Wix, Squarespace and most other website builders, look for an “Embed” or “Code” block. Or use the plain link on any button or menu item you already have.</p>
        </div>
      </div>
    </Card>
  )
}
