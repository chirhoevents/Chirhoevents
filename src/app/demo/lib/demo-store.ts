"use client";

// Browser-only demo store. Persists to localStorage.
// No server, no database, no external services.

const KEY = "chirho-demo-state-v2";

export type DemoParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: "M" | "F";
  email?: string;
  phone?: string;
  grade?: string;
  liabilitySigned: boolean;
  liabilitySignedAt?: string;
  medicalNotes?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  role: "participant" | "chaperone" | "leader";
  housingId?: string;
  checkedIn: boolean;
  nametagPrinted: boolean;
};

export type DemoRoom = {
  id: string;
  building: string;
  roomNumber: string;
  capacity: number;
  gender: "M" | "F" | "Any";
};

export type DemoIncident = {
  id: string;
  participantId: string;
  time: string;
  type: "Medical" | "Behavioral" | "Injury" | "Other";
  description: string;
  actionTaken: string;
  resolvedBy: string;
};

export type DemoRegistration = {
  id: string;
  kind: "individual" | "group";
  eventId: string;
  groupName?: string;
  leaderName?: string;
  leaderEmail?: string;
  leaderPhone?: string;
  organization?: string;
  participants: DemoParticipant[];
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
  accessCode?: string;
};

export type DemoEvent = {
  id: string;
  name: string;
  slug: string;
  startsOn: string;
  endsOn: string;
  location: string;
  address: string;
  pricePerPerson: number;
  capacity: number;
  registered: number;
  description: string;
  imageUrl?: string;
};

export type DemoVendor = {
  id: string;
  eventId: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  boothType: string;
  status: "pending" | "approved" | "rejected";
  amountPaid: number;
  description: string;
};

export type DemoEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  category: "confirmation" | "receipt" | "reminder" | "waiver" | "vendor" | "general";
};

export type DemoIncidentReport = DemoIncident;

export type DemoState = {
  events: DemoEvent[];
  registrations: DemoRegistration[];
  vendors: DemoVendor[];
  emails: DemoEmail[];
  rooms: DemoRoom[];
  incidents: DemoIncident[];
  currentEventId: string;
  currentRegistrationId: string;
};

const p = (
  id: string,
  first: string,
  last: string,
  age: number,
  gender: "M" | "F",
  role: DemoParticipant["role"] = "participant",
  extras: Partial<DemoParticipant> = {},
): DemoParticipant => ({
  id,
  firstName: first,
  lastName: last,
  age,
  gender,
  role,
  liabilitySigned: true,
  liabilitySignedAt: "2026-06-15T10:30:00Z",
  checkedIn: false,
  nametagPrinted: false,
  ...extras,
});

const seed = (): DemoState => {
  const rooms: DemoRoom[] = [
    { id: "rm-101", building: "Franciscan Hall", roomNumber: "101", capacity: 4, gender: "F" },
    { id: "rm-102", building: "Franciscan Hall", roomNumber: "102", capacity: 4, gender: "F" },
    { id: "rm-103", building: "Franciscan Hall", roomNumber: "103", capacity: 4, gender: "F" },
    { id: "rm-201", building: "Franciscan Hall", roomNumber: "201", capacity: 4, gender: "M" },
    { id: "rm-202", building: "Franciscan Hall", roomNumber: "202", capacity: 4, gender: "M" },
    { id: "rm-203", building: "Franciscan Hall", roomNumber: "203", capacity: 4, gender: "M" },
    { id: "rm-c1", building: "Chaperone Wing", roomNumber: "C-1", capacity: 2, gender: "F" },
    { id: "rm-c2", building: "Chaperone Wing", roomNumber: "C-2", capacity: 2, gender: "M" },
  ];

  const stMarysParticipants: DemoParticipant[] = [
    p("p-1", "Ana", "Garcia", 16, "F", "participant", { grade: "11th", email: "ana.g@example.com", housingId: "rm-101", allergies: "Peanuts", emergencyContact: "Maria Garcia", emergencyPhone: "555-0101" }),
    p("p-2", "Isabella", "Martinez", 15, "F", "participant", { grade: "10th", email: "isa.m@example.com", housingId: "rm-101" }),
    p("p-3", "Sofia", "Nguyen", 17, "F", "participant", { grade: "12th", housingId: "rm-101", medicalNotes: "Inhaler for asthma" }),
    p("p-4", "Ben", "Smith", 15, "M", "participant", { grade: "10th", housingId: "rm-201", liabilitySigned: false }),
    p("p-5", "Chris", "Lee", 17, "M", "participant", { grade: "12th", housingId: "rm-201" }),
    p("p-6", "David", "OConnor", 16, "M", "participant", { grade: "11th", housingId: "rm-201" }),
    p("p-7", "Ethan", "Patel", 14, "M", "participant", { grade: "9th", housingId: "rm-202" }),
    p("p-8", "Maria", "Thompson", 42, "F", "chaperone", { housingId: "rm-c1", email: "mthompson@stmarys.org", phone: "555-0142" }),
    p("p-9", "James", "Rodriguez", 38, "M", "chaperone", { housingId: "rm-c2", email: "jrod@stmarys.org", phone: "555-0138" }),
    p("p-10", "Sample", "Leader", 35, "F", "leader", { email: "leader@example.com", phone: "555-0100" }),
  ];

  const events: DemoEvent[] = [
    {
      id: "evt-summer-retreat",
      name: "Summer Youth Retreat 2026",
      slug: "summer-retreat-2026",
      startsOn: "2026-07-15",
      endsOn: "2026-07-18",
      location: "Steubenville, OH",
      address: "1235 University Blvd, Steubenville, OH 43952",
      pricePerPerson: 285,
      capacity: 400,
      registered: 247,
      description: "Four days of prayer, worship, and formation for high-school youth. Includes lodging, meals, sacraments, and keynote speakers.",
    },
    {
      id: "evt-diocesan-conference",
      name: "Diocesan Youth Conference",
      slug: "diocesan-conference",
      startsOn: "2026-10-03",
      endsOn: "2026-10-05",
      location: "Denver, CO",
      address: "1300 Colfax Ave, Denver, CO 80204",
      pricePerPerson: 195,
      capacity: 250,
      registered: 89,
      description: "Weekend conference for middle-school and high-school youth across the archdiocese.",
    },
    {
      id: "evt-mens-retreat",
      name: "Men's Silent Retreat",
      slug: "mens-retreat",
      startsOn: "2026-09-11",
      endsOn: "2026-09-13",
      location: "Malvern, PA",
      address: "315 S Warren Ave, Malvern, PA 19355",
      pricePerPerson: 320,
      capacity: 120,
      registered: 42,
      description: "A traditional Ignatian silent weekend for men. Includes all meals, private room, spiritual direction available.",
    },
  ];

  const registrations: DemoRegistration[] = [
    {
      id: "reg-stmarys",
      kind: "group",
      eventId: "evt-summer-retreat",
      groupName: "St. Mary's Youth Group",
      leaderName: "Sample Leader",
      leaderEmail: "leader@example.com",
      leaderPhone: "555-0100",
      organization: "St. Mary's Catholic Church",
      participants: stMarysParticipants,
      amountPaid: 855,
      balanceDue: 1995,
      createdAt: "2026-05-12T14:22:00Z",
      accessCode: "DEMO-GROUP-2026",
    },
    {
      id: "reg-stjohn",
      kind: "group",
      eventId: "evt-summer-retreat",
      groupName: "St. John Paul II Parish",
      leaderName: "Fr. Michael Kowalski",
      leaderEmail: "frmichael@sjp2.org",
      leaderPhone: "555-0220",
      organization: "St. John Paul II Parish",
      participants: [
        p("p-jp1", "Grace", "Kim", 16, "F"),
        p("p-jp2", "Hannah", "Reyes", 15, "F"),
        p("p-jp3", "Luke", "Anderson", 17, "M"),
        p("p-jp4", "Fr. Michael", "Kowalski", 45, "M", "leader"),
      ],
      amountPaid: 1140,
      balanceDue: 0,
      createdAt: "2026-04-28T09:15:00Z",
    },
    {
      id: "reg-solo-1",
      kind: "individual",
      eventId: "evt-mens-retreat",
      participants: [p("p-solo-1", "Thomas", "Wright", 34, "M", "participant", { email: "twright@example.com", phone: "555-0301" })],
      amountPaid: 320,
      balanceDue: 0,
      createdAt: "2026-06-01T18:44:00Z",
    },
  ];

  const vendors: DemoVendor[] = [
    {
      id: "vnd-1",
      eventId: "evt-summer-retreat",
      businessName: "Sacred Heart Rosary Co.",
      contactName: "Jane Vendor",
      contactEmail: "jane@rosaryco.com",
      boothType: "Standard 10x10",
      status: "approved",
      amountPaid: 150,
      description: "Handmade rosaries, chapel veils, sacramentals.",
    },
    {
      id: "vnd-2",
      eventId: "evt-summer-retreat",
      businessName: "Word on Fire Books",
      contactName: "Peter Callahan",
      contactEmail: "peter@wordonfire.example",
      boothType: "Premium 10x20",
      status: "approved",
      amountPaid: 300,
      description: "Catholic books, DVDs, study programs.",
    },
    {
      id: "vnd-3",
      eventId: "evt-summer-retreat",
      businessName: "Steubenville T-Shirts",
      contactName: "Sarah Bell",
      contactEmail: "sarah@stubtees.example",
      boothType: "Standard 10x10",
      status: "pending",
      amountPaid: 0,
      description: "Retreat merchandise, custom parish t-shirts.",
    },
  ];

  const incidents: DemoIncident[] = [
    {
      id: "inc-1",
      participantId: "p-3",
      time: "2026-07-15T20:15:00Z",
      type: "Medical",
      description: "Mild asthma flare during opening session. Used inhaler.",
      actionTaken: "Rested 20 min in medical room. Symptoms cleared.",
      resolvedBy: "Nurse Kelly",
    },
  ];

  return {
    events,
    registrations,
    vendors,
    emails: [],
    rooms,
    incidents,
    currentEventId: events[0].id,
    currentRegistrationId: registrations[0].id,
  };
};

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const fresh = seed();
      window.localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.events || !parsed.registrations) {
      const fresh = seed();
      window.localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    return parsed;
  } catch {
    return seed();
  }
}

export function saveDemoState(state: DemoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function updateDemoState(mutator: (s: DemoState) => void): DemoState {
  const s = loadDemoState();
  mutator(s);
  saveDemoState(s);
  return s;
}

export function resetDemoState(): DemoState {
  const fresh = seed();
  saveDemoState(fresh);
  return fresh;
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function logDemoEmail(email: Omit<DemoEmail, "id" | "sentAt">) {
  return updateDemoState((s) => {
    s.emails.push({
      ...email,
      id: newId("em"),
      sentAt: new Date().toISOString(),
    });
  });
}
