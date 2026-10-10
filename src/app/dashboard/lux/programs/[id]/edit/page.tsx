'use client'

import { use, useEffect, useState } from 'react'
import ProgramForm, { type ProgramFormValue } from '@/components/lux/ProgramForm'
import { ErrorNote, PageHeader, Spinner } from '@/components/lux/ui'
import { useLuxApi } from '@/contexts/LuxContext'
import { getProgramTemplate } from '@/lib/lux/program-templates'

export default function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const api = useLuxApi()
  const [program, setProgram] = useState<ProgramFormValue | null>(null)
  const [feeSummary, setFeeSummary] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api(`/api/lux/programs/${id}`), api('/api/lux/settings')])
      .then(([p, s]) => {
        const pr = p.program
        setProgram({
          ...pr,
          description: pr.description ?? '',
          confirmationMessage: pr.confirmationMessage ?? '',
          registrationOpensAt: pr.registrationOpensAt,
          registrationClosesAt: pr.registrationClosesAt,
        })
        setFeeSummary(s.feeRulesSummary)
      })
      .catch(e => setError(e.message))
  }, [api, id])

  return (
    <>
      <PageHeader title="Edit program" back={{ href: `/dashboard/lux/programs/${id}`, label: 'Back to program' }} />
      <ErrorNote message={error} />
      {!program && !error && <Spinner />}
      {program && (
        <ProgramForm initial={program} suggestedFees={getProgramTemplate(program.templateKey).defaults.suggestedFees} feeRulesSummary={feeSummary} />
      )}
    </>
  )
}
