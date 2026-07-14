"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  loadDemoState,
  logDemoEmail,
  newId,
  updateDemoState,
  type DemoEvent,
} from "../../lib/demo-store";

export default function GroupRegistration() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [organization, setOrganization] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [seats, setSeats] = useState(10);
  const [step, setStep] = useState<"form" | "pay" | "done">("form");

  useEffect(() => {
    const s = loadDemoState();
    setEvents(s.events);
    const evt = new URLSearchParams(window.location.search).get("event");
    setEventId(evt || s.events[0]?.id || "");
  }, []);

  const selected = events.find((e) => e.id === eventId);
  const price = selected?.pricePerPerson ?? 0;
  const deposit = price;
  const total = price * seats;
  const balance = total - deposit;

  const pay = () => {
    updateDemoState((s) => {
      s.registrations.push({
        id: newId("reg"),
        kind: "group",
        eventId,
        groupName,
        organization,
        leaderName,
        leaderEmail,
        participants: [],
        amountPaid: deposit,
        balanceDue: balance,
        createdAt: new Date().toISOString(),
        accessCode: `DEMO-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      });
    });
    logDemoEmail({
      to: leaderEmail,
      subject: `Group reservation confirmed: ${selected?.name} (Demo)`,
      body: `${groupName} reserved ${seats} seats. Log in to the Group Leader portal to add participants and pay the balance.`,
      category: "confirmation",
    });
    setStep("done");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold text-[#1E3A5F] mt-4 mb-6">Group Registration</h1>

      {step === "form" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep("pay");
          }}
          className="bg-white rounded-lg border border-[#E1D5BA] p-6 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium">Event</span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2" required>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <F label="Group name" value={groupName} onChange={setGroupName} required />
          <F label="Organization / Parish" value={organization} onChange={setOrganization} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Leader name" value={leaderName} onChange={setLeaderName} required />
            <F label="Leader email" type="email" value={leaderEmail} onChange={setLeaderEmail} required />
          </div>
          <F label="Seats to reserve" type="number" value={String(seats)} onChange={(v: string) => setSeats(Number(v) || 1)} />
          <button className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-5 py-2 rounded font-medium">Continue</button>
        </form>
      )}

      {step === "pay" && (
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Deposit (Demo)</h2>
          <p className="text-slate-700">
            {seats} seats × ${price} = <strong>${total} total</strong>
          </p>
          <p className="text-slate-700">
            Deposit today: <strong>${deposit}</strong> · Balance later: ${balance}
          </p>
          <button
            onClick={pay}
            className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded font-medium"
          >
            Pay deposit ${deposit} (Demo)
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
          <h2 className="text-xl font-bold text-emerald-900">Group reserved</h2>
          <p className="text-emerald-800 mt-1 text-sm">
            Next: <Link href="/demo/dashboard/group-leader" className="underline">Group Leader Portal</Link> to add participants and pay the balance.
          </p>
        </div>
      )}
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
      />
    </label>
  );
}
