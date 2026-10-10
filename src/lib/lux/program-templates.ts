/**
 * Starting points for faith formation programs. Picking one copies these
 * into the new program; parishes can change all of it.
 */

export interface TemplateRequirement {
  key: string
  label: string
  description: string
  required: boolean
  allowParishLookup: boolean
}

export interface ProgramQuestion {
  id: string
  label: string
  type: 'text' | 'yes_no' | 'dropdown' | 'multiple_choice' | 'multi_select'
  options: string[]
  required: boolean
}

export type ProgramAudience = 'children' | 'adults' | 'families'
export type ProgramFeeType = 'per_person' | 'per_family'

/** A class time or group families choose from (Sunday 9am, Wednesday 6:30pm...) */
export interface ProgramSession {
  id: string
  name: string
  schedule: string
  grades: string[] | null
  capacity: number | null
}

export interface ProgramTemplate {
  key: 'faith_formation' | 'family_faith_formation' | 'first_communion' | 'confirmation' | 'baptism_prep' | 'ocia' | 'custom'
  name: string
  summary: string
  defaults: {
    name: string
    description: string
    audience: ProgramAudience
    feeType: ProgramFeeType
    grades: string[] | null
    collectSponsor: boolean
    collectServiceHours: boolean
    serviceHoursRequired: number | null
    requirements: TemplateRequirement[]
    questions: ProgramQuestion[]
    suggestedFees: string[]
    confirmationMessage: string
  }
}

const BAPTISMAL_CERTIFICATE: TemplateRequirement = {
  key: 'baptismal_certificate',
  label: 'Baptismal certificate',
  description: 'A copy of your child’s baptismal certificate. If they were baptized here, you can ask us to look it up instead.',
  required: true,
  allowParishLookup: true,
}

const PHOTO_PERMISSION: ProgramQuestion = {
  id: 'photo_permission',
  label: 'May we include your child in photos used in parish communications?',
  type: 'yes_no',
  options: [],
  required: true,
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    key: 'faith_formation',
    name: 'Faith Formation',
    summary: 'Weekly religious education by grade.',
    defaults: {
      name: 'Faith Formation',
      description: 'Weekly religious education classes for children, grouped by grade.',
      audience: 'children',
      feeType: 'per_person',
      grades: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [{ ...BAPTISMAL_CERTIFICATE, required: false }],
      questions: [
        PHOTO_PERMISSION,
        { id: 'pickup', label: 'Who else may pick up your child?', type: 'text', options: [], required: false },
      ],
      suggestedFees: ['Books'],
      confirmationMessage: 'Classes begin in the fall. We’ll send the schedule and classroom assignments before the first class.',
    },
  },
  {
    key: 'first_communion',
    name: 'First Communion',
    summary: 'Preparation for First Reconciliation and First Holy Communion.',
    defaults: {
      name: 'First Communion Preparation',
      description: 'Preparation for the sacraments of First Reconciliation and First Holy Communion.',
      audience: 'children',
      feeType: 'per_person',
      grades: ['2'],
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [BAPTISMAL_CERTIFICATE],
      questions: [
        { id: 'prior_formation', label: 'Did your child attend faith formation or Catholic school last year?', type: 'yes_no', options: [], required: true },
        PHOTO_PERMISSION,
      ],
      suggestedFees: ['Books', 'Sacrament fee'],
      confirmationMessage: 'We’ll be in touch with parent meeting dates and the First Communion schedule.',
    },
  },
  {
    key: 'confirmation',
    name: 'Confirmation',
    summary: 'Adds sponsor information, the sponsor’s letter and service hours.',
    defaults: {
      name: 'Confirmation Preparation',
      description: 'Preparation for the sacrament of Confirmation, including retreat, service and sponsor requirements.',
      audience: 'children',
      feeType: 'per_person',
      grades: ['8', '9', '10'],
      collectSponsor: true,
      collectServiceHours: true,
      serviceHoursRequired: 20,
      requirements: [
        BAPTISMAL_CERTIFICATE,
        {
          key: 'sponsor_eligibility_letter',
          label: 'Sponsor’s letter of good standing',
          description: 'A letter from your sponsor’s parish confirming they are a practicing Catholic eligible to be a sponsor.',
          required: true,
          allowParishLookup: false,
        },
        {
          key: 'first_communion_certificate',
          label: 'First Communion certificate',
          description: 'Only needed if your child received First Communion at another parish.',
          required: false,
          allowParishLookup: true,
        },
      ],
      questions: [
        { id: 'confirmation_name', label: 'Chosen Confirmation saint name (if decided)', type: 'text', options: [], required: false },
        PHOTO_PERMISSION,
      ],
      suggestedFees: ['Retreat', 'Sacrament fee'],
      confirmationMessage: 'Watch for the retreat date and the service hours log. Your sponsor’s letter can be uploaded any time from your family page.',
    },
  },
  {
    key: 'family_faith_formation',
    name: 'Family Faith Formation',
    summary: 'Whole families learn together. One fee per family.',
    defaults: {
      name: 'Family Faith Formation',
      description: 'Parents and children gather together for faith formation. One registration and one fee per family.',
      audience: 'families',
      feeType: 'per_family',
      grades: null,
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [{ ...BAPTISMAL_CERTIFICATE, required: false }],
      questions: [
        { id: 'parents_attending', label: 'Which parents or guardians will attend with the children?', type: 'text', options: [], required: false },
        PHOTO_PERMISSION,
      ],
      suggestedFees: ['Materials'],
      confirmationMessage: 'We look forward to praying and learning with your family. We’ll send the session schedule before the first gathering.',
    },
  },
  {
    key: 'baptism_prep',
    name: 'Baptism Preparation',
    summary: 'Class for parents and godparents before a child’s baptism.',
    defaults: {
      name: 'Baptism Preparation Class',
      description: 'For parents preparing to have their child baptized. Godparents are welcome too. Choose the class date that works for you.',
      audience: 'children',
      feeType: 'per_person',
      grades: null,
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [
        {
          key: 'birth_certificate',
          label: 'Child’s birth certificate',
          description: 'A copy of your child’s birth certificate, so names and dates are recorded correctly in the baptismal register.',
          required: true,
          allowParishLookup: false,
        },
        {
          key: 'godfather_letter',
          label: 'Godfather’s letter of good standing',
          description: 'If the godfather belongs to another parish, a letter from that parish confirming he is a practicing Catholic.',
          required: false,
          allowParishLookup: false,
        },
        {
          key: 'godmother_letter',
          label: 'Godmother’s letter of good standing',
          description: 'If the godmother belongs to another parish, a letter from that parish confirming she is a practicing Catholic.',
          required: false,
          allowParishLookup: false,
        },
      ],
      questions: [
        { id: 'godfather', label: 'Godfather’s name and parish', type: 'text', options: [], required: false },
        { id: 'godmother', label: 'Godmother’s name and parish', type: 'text', options: [], required: false },
        { id: 'preferred_baptism_date', label: 'Preferred baptism date (if you have one)', type: 'text', options: [], required: false },
      ],
      suggestedFees: ['Class materials'],
      confirmationMessage: 'Thank you! After the class, the parish office will contact you to schedule the baptism.',
    },
  },
  {
    key: 'ocia',
    name: 'OCIA',
    summary: 'Adults becoming Catholic or completing their sacraments.',
    defaults: {
      name: 'OCIA (Order of Christian Initiation of Adults)',
      description: 'For adults who want to become Catholic, or who were baptized but haven’t received First Communion or Confirmation.',
      audience: 'adults',
      feeType: 'per_person',
      grades: null,
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [{
        key: 'baptismal_certificate',
        label: 'Baptismal certificate',
        description: 'If you were baptized in any Christian church, a copy of your baptismal certificate. If you’re not sure, leave it for now and we’ll help.',
        required: false,
        allowParishLookup: true,
      }],
      questions: [
        {
          id: 'baptism_background',
          label: 'Have you been baptized?',
          type: 'multiple_choice',
          options: ['Yes, in the Catholic Church', 'Yes, in another Christian church', 'No', 'I’m not sure'],
          required: true,
        },
        {
          id: 'sacraments_received',
          label: 'Which sacraments have you already received?',
          type: 'multi_select',
          options: ['First Communion', 'Confirmation'],
          required: false,
        },
        { id: 'ocia_note', label: 'Is there anything you’d like the OCIA team to know?', type: 'text', options: [], required: false },
      ],
      suggestedFees: ['Materials'],
      confirmationMessage: 'Welcome! Someone from our OCIA team will reach out to set up a time to meet and answer your questions.',
    },
  },
  {
    key: 'custom',
    name: 'Custom',
    summary: 'Start from a blank program (youth group, VBS, Bible study...).',
    defaults: {
      name: '',
      description: '',
      audience: 'children',
      feeType: 'per_person',
      grades: null,
      collectSponsor: false,
      collectServiceHours: false,
      serviceHoursRequired: null,
      requirements: [],
      questions: [],
      suggestedFees: [],
      confirmationMessage: '',
    },
  },
]

export function getProgramTemplate(key: string): ProgramTemplate {
  return PROGRAM_TEMPLATES.find(t => t.key === key) ?? PROGRAM_TEMPLATES[PROGRAM_TEMPLATES.length - 1]
}

/**
 * Default school year for a new program: from February on, parishes are
 * signing families up for the year that starts in August; in January (and
 * August–December) it's the year already under way.
 */
export function defaultTerm(now: Date = new Date()): string {
  const month = now.getMonth()
  const start = month >= 1 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}–${start + 1}`
}

export function parseSessions(raw: unknown): ProgramSession[] {
  return (Array.isArray(raw) ? raw : []).filter(
    (x): x is ProgramSession => !!x && typeof x === 'object' && typeof (x as ProgramSession).id === 'string' && typeof (x as ProgramSession).name === 'string'
  ).map(x => ({ id: x.id, name: x.name, schedule: x.schedule ?? '', grades: Array.isArray(x.grades) && x.grades.length ? x.grades : null, capacity: x.capacity ?? null }))
}
