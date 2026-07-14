"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDemoState,
  newId,
  saveDemoState,
  type DemoEvent,
} from "../../lib/demo-store";

export default function IndividualRegistration() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "pay" | "done">("form");

  useEffect(() => {
    const s = loadDemoState();
    setEvents(s.events);
    const params = new URLSearchParams(window.location.search);
    const evt = params.get("event");
    if (evt) setEventId(evt);
    else if (s.events[0]) setEventId(s.events[0].id);
  }, []);

  const selectedEvent = events.find((e) => e.id === eventId);
  const price = selectedEvent?.pricePerPerson ?? 0;

  const handlePay = () => {
    const s = loadDemoState();
    s.registrations.push({
      id: newId("reg"),
      kind: "individual",
      eventId,
      participants: [
        {
          id: newId("p"),
          firstName,
          lastName,
          age: age ? Number(age) : undefined,
          email,
          liabilitySigned: false,
        },
      ],
      amountPaid: price,
      balanceDue: 0,
      createdAt: new Date().toISOString(),
    });
    s.emails.push({
      id: newId("em"),
      to: email || "participant@example.com",
      subject: `Registration confirmed: ${selectedEvent?.name}`,
      body: `Thanks ${firstName}! This is a fake confirmation. No real email was sent.`,
      sentAt: new Date().toISOString(),
    });
    saveDemoState(s);
    setStep("done");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Individual Registration</h1>

      {step === "form" && (
        <form
          className="mt-6 space-y-4 rounded-lg border border-slate-300 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("pay");
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">Event</span>
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">First name</span>
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Last name</span>
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Age</span>
              <input
                type="number"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          </div>
          <button className="rounded bg-slate-800 text-white px-4 py-2 hover:bg-slate-700">
            Continue to Payment
          </button>
        </form>
      )}

      {step === "pay" && (
        <div className="mt-6 rounded-lg border border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold">Payment (Fake)</h2>
          <p className="text-slate-700 mt-2">
            Total due: <strong>${price}</strong>
          </p>
          <p className="text-sm text-slate-500 mt-1">
            No real card is charged. This button pretends to charge and marks
            you registered.
          </p>
          <button
            onClick={handlePay}
            className="mt-4 rounded bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-500"
          >
            Pay ${price} (Demo)
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-lg border border-emerald-400 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">
            Registration complete
          </h2>
          <p className="mt-2 text-emerald-900">
            A pretend confirmation email was logged. See it in the{" "}
            <Link href="/demo/admin" className="underline">
              Admin view
            </Link>
            . Or complete the{" "}
            <Link href="/demo/liability" className="underline">
              Liability Form
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
