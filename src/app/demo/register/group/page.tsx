"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDemoState,
  newId,
  saveDemoState,
  type DemoEvent,
} from "../../lib/demo-store";

export default function GroupRegistration() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [seats, setSeats] = useState(10);
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
  const deposit = price * 1; // demo: one-seat deposit
  const total = price * seats;
  const balance = total - deposit;

  const handlePay = () => {
    const s = loadDemoState();
    s.registrations.push({
      id: newId("reg"),
      kind: "group",
      eventId,
      groupName,
      leaderName,
      leaderEmail,
      participants: [],
      amountPaid: deposit,
      balanceDue: balance,
      createdAt: new Date().toISOString(),
    });
    s.emails.push({
      id: newId("em"),
      to: leaderEmail || "leader@example.com",
      subject: `Group reservation confirmed: ${selectedEvent?.name}`,
      body: `${groupName} has reserved ${seats} seats. Log in to the Group Leader portal to add participants and pay the balance.`,
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
      <h1 className="text-3xl font-bold mt-4">Group Registration</h1>
      <p className="mt-2 text-slate-700">
        A group leader reserves seats up front, then adds participants later
        via the Group Leader portal.
      </p>

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
          <label className="block">
            <span className="text-sm font-medium">Group / Parish name</span>
            <input
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Leader name</span>
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Leader email</span>
              <input
                type="email"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={leaderEmail}
                onChange={(e) => setLeaderEmail(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Seats to reserve</span>
            <input
              type="number"
              min={1}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value) || 1)}
            />
          </label>
          <button className="rounded bg-slate-800 text-white px-4 py-2 hover:bg-slate-700">
            Continue to Deposit
          </button>
        </form>
      )}

      {step === "pay" && (
        <div className="mt-6 rounded-lg border border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold">Deposit (Fake)</h2>
          <p className="text-slate-700 mt-2">
            Seats: {seats} · Total: ${total} · Deposit today: <strong>${deposit}</strong> ·
            Balance later: ${balance}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            No real card is charged.
          </p>
          <button
            onClick={handlePay}
            className="mt-4 rounded bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-500"
          >
            Pay Deposit ${deposit} (Demo)
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-lg border border-emerald-400 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">
            Group reservation complete
          </h2>
          <p className="mt-2 text-emerald-900">
            Next, log in to the{" "}
            <Link href="/demo/group-leader" className="underline">
              Group Leader Portal
            </Link>{" "}
            to add participants and pay the balance.
          </p>
        </div>
      )}
    </div>
  );
}
