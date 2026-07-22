// DEMO: canned report data. All numbers made-up, mutually consistent.

export const REPORT_EVENTS: Record<string, { name: string; startDate: string; endDate: string }> = {
  'evt-summer-retreat': { name: 'Summer Youth Retreat 2026', startDate: '2026-07-15', endDate: '2026-07-18' },
  'evt-diocesan-conference': { name: 'Diocesan Youth Conference', startDate: '2026-10-03', endDate: '2026-10-05' },
  'evt-mens-retreat': { name: "Men's Silent Retreat", startDate: '2026-09-11', endDate: '2026-09-13' },
  'evt-summer-2025': { name: 'Summer Youth Retreat 2025', startDate: '2025-07-15', endDate: '2025-07-18' },
}

// Financial report
export const FINANCIAL_REPORT = [
  { group: "St. Mary's Youth Group", participants: 10, totalAmount: 2850, amountPaid: 855, balance: 1995, status: 'partial', lastPayment: '2026-05-28' },
  { group: 'St. John Paul II Parish', participants: 4, totalAmount: 1140, amountPaid: 1140, balance: 0, status: 'paid_full', lastPayment: '2026-06-14' },
  { group: 'Holy Family Community', participants: 8, totalAmount: 1560, amountPaid: 780, balance: 780, status: 'partial', lastPayment: '2026-06-22' },
  { group: 'St. Andrew Youth', participants: 12, totalAmount: 3420, amountPaid: 3420, balance: 0, status: 'paid_full', lastPayment: '2026-06-30' },
  { group: 'Our Lady of Guadalupe', participants: 15, totalAmount: 4275, amountPaid: 2280, balance: 1995, status: 'partial', lastPayment: '2026-07-01' },
  { group: 'Sacred Heart Parish', participants: 7, totalAmount: 1995, amountPaid: 570, balance: 1425, status: 'partial', lastPayment: '2026-06-18' },
]

// Registration report
export const REGISTRATIONS_REPORT = [
  { name: 'Ana Garcia', age: 16, gender: 'F', role: 'participant', group: "St. Mary's Youth Group", email: 'ana.g@example.com', phone: '555-0101', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'Isabella Martinez', age: 15, gender: 'F', role: 'participant', group: "St. Mary's Youth Group", email: 'isa.m@example.com', phone: '555-0102', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'Sofia Nguyen', age: 17, gender: 'F', role: 'participant', group: "St. Mary's Youth Group", email: 'sofia@example.com', phone: '555-0103', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'Ben Smith', age: 15, gender: 'M', role: 'participant', group: "St. Mary's Youth Group", email: 'ben@example.com', phone: '555-0104', registered: '2026-05-12', paid: true, waiver: false },
  { name: 'Chris Lee', age: 17, gender: 'M', role: 'participant', group: "St. Mary's Youth Group", email: 'chris@example.com', phone: '555-0105', registered: '2026-05-12', paid: true, waiver: true },
  { name: "David O'Connor", age: 16, gender: 'M', role: 'participant', group: "St. Mary's Youth Group", email: 'david@example.com', phone: '555-0106', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'Ethan Patel', age: 14, gender: 'M', role: 'participant', group: "St. Mary's Youth Group", email: 'ethan@example.com', phone: '555-0107', registered: '2026-05-12', paid: true, waiver: false },
  { name: 'Maria Thompson', age: 42, gender: 'F', role: 'chaperone', group: "St. Mary's Youth Group", email: 'mthompson@stmarys.org', phone: '555-0142', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'James Rodriguez', age: 38, gender: 'M', role: 'chaperone', group: "St. Mary's Youth Group", email: 'jrod@stmarys.org', phone: '555-0138', registered: '2026-05-12', paid: true, waiver: true },
  { name: 'Grace Kim', age: 16, gender: 'F', role: 'participant', group: 'St. John Paul II Parish', email: 'grace@example.com', phone: '555-0221', registered: '2026-04-28', paid: true, waiver: true },
  { name: 'Luke Anderson', age: 17, gender: 'M', role: 'participant', group: 'St. John Paul II Parish', email: 'luke@example.com', phone: '555-0224', registered: '2026-04-28', paid: true, waiver: true },
  { name: 'Emma Reyes', age: 15, gender: 'F', role: 'participant', group: 'St. John Paul II Parish', email: 'emma@example.com', phone: '555-0225', registered: '2026-04-28', paid: true, waiver: true },
  { name: 'Fr. Michael Kowalski', age: 45, gender: 'M', role: 'chaperone', group: 'St. John Paul II Parish', email: 'frmichael@sjp2.org', phone: '555-0220', registered: '2026-04-28', paid: true, waiver: true },
]

// Forms status report
export const FORMS_REPORT = REGISTRATIONS_REPORT.map((r) => ({
  name: r.name,
  group: r.group,
  role: r.role,
  formType: r.role === 'chaperone' ? 'Chaperone (Adult)' : r.age < 18 ? 'Youth Under 18' : 'Adult (Self)',
  status: r.waiver ? 'Signed' : 'Pending',
  signedAt: r.waiver ? '2026-06-01' : null,
}))

// Housing report
export const HOUSING_REPORT = [
  { building: 'Franciscan Hall', room: '101', gender: 'F', capacity: 4, occupants: ['Ana Garcia', 'Isabella Martinez', 'Sofia Nguyen'], group: "St. Mary's Youth Group" },
  { building: 'Franciscan Hall', room: '102', gender: 'F', capacity: 4, occupants: ['Grace Kim', 'Emma Reyes'], group: 'St. John Paul II Parish' },
  { building: 'Franciscan Hall', room: '201', gender: 'M', capacity: 4, occupants: ['Ben Smith', 'Chris Lee', "David O'Connor"], group: "St. Mary's Youth Group" },
  { building: 'Franciscan Hall', room: '202', gender: 'M', capacity: 4, occupants: ['Ethan Patel', 'Luke Anderson'], group: 'Mixed' },
  { building: 'Chaperone Wing', room: 'C-1', gender: 'F', capacity: 2, occupants: ['Maria Thompson'], group: "St. Mary's Youth Group" },
  { building: 'Chaperone Wing', room: 'C-2', gender: 'M', capacity: 2, occupants: ['James Rodriguez', 'Fr. Michael Kowalski'], group: 'Mixed' },
]

// Medical report
export const MEDICAL_REPORT = [
  { name: 'Ana Garcia', group: "St. Mary's Youth Group", allergies: 'Peanuts (severe)', medications: 'EpiPen', dietary: 'None', notes: 'EpiPen on file with nurse.' },
  { name: 'Sofia Nguyen', group: "St. Mary's Youth Group", allergies: 'None', medications: 'Albuterol inhaler (asthma)', dietary: 'None', notes: 'Prone to asthma flares with exertion.' },
  { name: 'Ben Smith', group: "St. Mary's Youth Group", allergies: 'Shellfish', medications: 'None', dietary: 'None', notes: '' },
  { name: 'Grace Kim', group: 'St. John Paul II Parish', allergies: 'None', medications: 'None', dietary: 'Vegetarian', notes: '' },
  { name: 'Luke Anderson', group: 'St. John Paul II Parish', allergies: 'Bee stings', medications: 'EpiPen', dietary: 'None', notes: 'EpiPen on file.' },
  { name: 'Emma Reyes', group: 'St. John Paul II Parish', allergies: 'None', medications: 'None', dietary: 'Gluten-free', notes: 'Requires gluten-free host at Mass.' },
]

// Safe Environment certificates
export const CERTIFICATES_REPORT = [
  { chaperone: 'Maria Thompson', group: "St. Mary's Youth Group", status: 'Verified', uploaded: '2026-04-15', expires: '2027-04-15' },
  { chaperone: 'James Rodriguez', group: "St. Mary's Youth Group", status: 'Awaiting verification', uploaded: '2026-06-10', expires: null },
  { chaperone: 'Fr. Michael Kowalski', group: 'St. John Paul II Parish', status: 'Verified', uploaded: '2026-04-28', expires: '2027-04-28' },
  { chaperone: 'Sarah Martinez', group: 'Holy Family Community', status: 'Verified', uploaded: '2026-05-01', expires: '2027-05-01' },
]

// Chaperone summary
export const CHAPERONES_REPORT = [
  { group: "St. Mary's Youth Group", youthCount: 7, chaperoneCount: 2, ratio: '3.5:1', target: '5:1', ok: true },
  { group: 'St. John Paul II Parish', youthCount: 3, chaperoneCount: 1, ratio: '3:1', target: '5:1', ok: true },
  { group: 'Holy Family Community', youthCount: 8, chaperoneCount: 1, ratio: '8:1', target: '5:1', ok: false },
  { group: 'St. Andrew Youth', youthCount: 12, chaperoneCount: 3, ratio: '4:1', target: '5:1', ok: true },
  { group: 'Our Lady of Guadalupe', youthCount: 15, chaperoneCount: 3, ratio: '5:1', target: '5:1', ok: true },
  { group: 'Sacred Heart Parish', youthCount: 7, chaperoneCount: 2, ratio: '3.5:1', target: '5:1', ok: true },
]
