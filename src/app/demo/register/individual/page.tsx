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

export default function IndividualRegistration() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "pay" | "done">("form");

  useEffect(() => {
    const s = loadDemoState();
    setEvents(s.events);
    const evt = new URLSearchParams(window.location.search).get("event");
    setEventId(evt || s.events[0]?.id || "");
  }, []);

  const selectedEvent = events.find((e) => e.id === eventId);
  const price = selectedEvent?.pricePerPerson ?? 0;

  const pay = () => {
    updateDemoState((s) => {
      s.registrations.push({
        id: newId("reg"),
        kind: "individual",
        eventId,
        participants: [
          {
            id: newId("p"),
            firstName,
            lastName,
            age: Number(age) || 0,
            gender,
            email,
            role: "participant",
            liabilitySigned: false,
            checkedIn: false,
            nametagPrinted: false,
          },
        ],
        amountPaid: price,
        balanceDue: 0,
        createdAt: new Date().toISOString(),
      });
    });
    logDemoEmail({
      to: email,
      subject: `Registration confirmed: ${selectedEvent?.name} (Demo)`,
      body: `Thanks ${firstName}! Your registration is confirmed. This is a fake email.`,
      category: "confirmation",
    });
    setStep("done");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold text-[#1E3A5F] mt-4 mb-6">Individual Registration</h1>

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
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
              required
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <F label="First name" value={firstName} onChange={setFirstName} required />
            <F label="Last name" value={lastName} onChange={setLastName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Age" type="number" value={age} onChange={setAge} required />
            <label className="block">
              <span className="text-sm font-medium">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "M" | "F")}
                className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
              >
                <option value="F">F</option>
                <option value="M">M</option>
              </select>
            </label>
          </div>
          <F label="Email" type="email" value={email} onChange={setEmail} required />
          <button className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-5 py-2 rounded font-medium">
            Continue to payment
          </button>
        </form>
      )}

      {step === "pay" && (
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Payment (Demo)</h2>
          <p className="text-slate-700 mb-2">Total due: <strong>${price}</strong></p>
          <p className="text-xs text-slate-500 mb-4">No real card is charged.</p>
          <button
            onClick={pay}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded font-medium"
          >
            Pay ${price} (Demo)
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
          <h2 className="text-xl font-bold text-emerald-900">You&apos;re registered</h2>
          <p className="text-emerald-800 mt-1 text-sm">
            Fake confirmation email logged. Next:{" "}
            <Link href="/demo/liability" className="underline">
              sign the liability waiver
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function F({ label, value, onChange, type = "text", required = false }: any) {
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
