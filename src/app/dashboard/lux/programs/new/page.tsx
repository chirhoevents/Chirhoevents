'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Cross, Flame, Sparkles, ArrowRight, Users, Droplets, Church, type LucideIcon } from 'lucide-react'
import ProgramForm, { programValueFromTemplate } from '@/components/lux/ProgramForm'
import { PageHeader, Spinner } from '@/components/lux/ui'
import { useLuxApi } from '@/contexts/LuxContext'
import { PROGRAM_TEMPLATES, defaultTerm, getProgramTemplate, type ProgramTemplate } from '@/lib/lux/program-templates'

// Keyed by every template key, so adding a template without an icon fails the type check
const ICONS: Record<ProgramTemplate['key'], LucideIcon> = {
  faith_formation: BookOpen,
  family_faith_formation: Users,
  first_communion: Cross,
  confirmation: Flame,
  baptism_prep: Droplets,
  ocia: Church,
  custom: Sparkles,
}

export default function NewProgramPage() {
  return <Suspense fallback={<Spinner />}><NewProgram /></Suspense>
}

function NewProgram() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const api = useLuxApi()
  const templateKey = searchParams.get('template')
  const [feeSummary, setFeeSummary] = useState<string | null>(null)

  useEffect(() => {
    if (templateKey) api('/api/lux/settings').then(s => setFeeSummary(s.feeRulesSummary)).catch(() => setFeeSummary(''))
  }, [api, templateKey])

  if (!templateKey) {
    return (
      <div className="max-w-4xl">
        <PageHeader title="Which kind of program?" description="Each one starts with sensible fields and documents. You can change everything." back={{ href: '/dashboard/lux/new', label: 'Back' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROGRAM_TEMPLATES.map(t => {
            const Icon = ICONS[t.key] ?? Sparkles
            return (
              <button key={t.key} type="button" onClick={() => router.push(`/dashboard/lux/programs/new?template=${t.key}`)}
                className="group text-left bg-white rounded-2xl border border-[#E8E2D4] p-5 hover:shadow-lg hover:border-[#C8A24A] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#F5F1E8] flex items-center justify-center"><Icon className="h-5 w-5 text-[#C8A24A]" /></div>
                  <h2 className="font-semibold text-[#1E3A5F]">{t.name}</h2>
                </div>
                <p className="text-sm text-gray-600 mt-2">{t.summary}</p>
                {t.defaults.requirements.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">Collects: {t.defaults.requirements.map(r => r.label.toLowerCase()).join(', ')}</p>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-[#1E3A5F] font-medium mt-3 group-hover:gap-2 transition-all">Use this <ArrowRight className="h-4 w-4" /></span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const template = getProgramTemplate(templateKey)
  if (feeSummary === null) return <Spinner />
  return (
    <>
      <PageHeader title={`New ${template.name === 'Custom' ? 'program' : template.name + ' program'}`} back={{ href: '/dashboard/lux/programs/new', label: 'Choose a different kind' }} />
      <ProgramForm initial={programValueFromTemplate(template, defaultTerm())} suggestedFees={template.defaults.suggestedFees} feeRulesSummary={feeSummary} />
    </>
  )
}
