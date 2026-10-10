import type { OpenProgram } from '@/lib/lux/family-registration'

/** What families see about a program (nothing internal) */
export function publicProgram(p: OpenProgram) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    term: p.term,
    templateKey: p.templateKey,
    description: p.description,
    grades: p.gradesList,
    tuitionPerChild: Number(p.tuitionPerChild),
    feeItems: p.feeItemsList.map(f => ({ name: f.name, amount: Number(f.amount) })),
    onlinePaymentEnabled: p.onlinePaymentEnabled,
    payAtOfficeEnabled: p.payAtOfficeEnabled,
    feeAssistanceEnabled: p.feeAssistanceEnabled,
    collectSponsor: p.collectSponsor,
    questions: p.questionsList,
    requirements: p.requirements.map(r => ({
      key: r.key, label: r.label, description: r.description, required: r.required, allowParishLookup: r.allowParishLookup,
    })),
    spotsLeft: p.spotsLeft,
    registrationClosesAt: p.registrationClosesAt?.toISOString() ?? null,
    audience: p.audience as 'children' | 'adults' | 'families',
    perFamily: p.perFamily,
    language: p.language,
    sessions: p.sessionsList.map(sess => ({ id: sess.id, name: sess.name, schedule: sess.schedule, grades: sess.grades, spotsLeft: sess.spotsLeft })),
  }
}
export type PublicProgram = ReturnType<typeof publicProgram>
