"use client";

// Browser-only demo store. Persists to localStorage under a single key.
// No server, no database. Clearing the browser clears the demo.

const KEY = "chirho-demo-state-v1";

export type DemoParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  email?: string;
  liabilitySigned?: boolean;
};

export type DemoRegistration = {
  id: string;
  kind: "individual" | "group";
  eventId: string;
  groupName?: string;
  leaderName?: string;
  leaderEmail?: string;
  participants: DemoParticipant[];
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
};

export type DemoEvent = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  location: string;
  pricePerPerson: number;
  capacity: number;
};

export type DemoVendor = {
  id: string;
  eventId: string;
  businessName: string;
  contactName: string;
  boothType: string;
  status: "pending" | "approved" | "rejected";
  amountPaid: number;
};

export type DemoEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
};

export type DemoState = {
  events: DemoEvent[];
  registrations: DemoRegistration[];
  vendors: DemoVendor[];
  emails: DemoEmail[];
};

const seed = (): DemoState => ({
  events: [
    {
      id: "evt-demo-retreat",
      name: "Demo Summer Retreat 2026",
      startsOn: "2026-07-15",
      endsOn: "2026-07-18",
      location: "Steubenville, OH",
      pricePerPerson: 285,
      capacity: 400,
    },
    {
      id: "evt-demo-conference",
      name: "Demo Diocesan Youth Conference",
      startsOn: "2026-10-03",
      endsOn: "2026-10-05",
      location: "Denver, CO",
      pricePerPerson: 195,
      capacity: 250,
    },
  ],
  registrations: [
    {
      id: "reg-seed-1",
      kind: "group",
      eventId: "evt-demo-retreat",
      groupName: "St. Mary's Youth Group",
      leaderName: "Sample Leader",
      leaderEmail: "leader@example.com",
      participants: [
        { id: "p1", firstName: "Ana", lastName: "Garcia", age: 16, liabilitySigned: true },
        { id: "p2", firstName: "Ben", lastName: "Smith", age: 15, liabilitySigned: false },
        { id: "p3", firstName: "Chris", lastName: "Lee", age: 17, liabilitySigned: true },
      ],
      amountPaid: 285,
      balanceDue: 570,
      createdAt: new Date().toISOString(),
    },
  ],
  vendors: [
    {
      id: "vnd-seed-1",
      eventId: "evt-demo-retreat",
      businessName: "Sample Rosary Co.",
      contactName: "Jane Vendor",
      boothType: "Standard 10x10",
      status: "approved",
      amountPaid: 150,
    },
  ],
  emails: [],
});

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as DemoState;
    // simple shape guard
    if (!parsed.events || !parsed.registrations) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveDemoState(state: DemoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetDemoState(): DemoState {
  const fresh = seed();
  saveDemoState(fresh);
  return fresh;
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
