"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDemoState,
  newId,
  saveDemoState,
  type DemoState,
} from "../lib/demo-store";

type Tab = "events" | "registrations" | "vendors" | "emails";

export default function AdminView() {
  const [state, setState] = useState<DemoState | null>(null);
  const [tab, setTab] = useState<Tab>("events");
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(100);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const createEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const s = loadDemoState();
    s.events.push({
      id: newId("evt"),
      name,
      startsOn,
      endsOn,
      location,
      pricePerPerson: price,
      capacity: 200,
    });
    saveDemoState(s);
    setState(s);
    setName("");
    setStartsOn("");
    setEndsOn("");
    setLocation("");
  };

  const setVendorStatus = (id: string, status: "approved" | "rejected") => {
    const s = loadDemoState();
    const v = s.vendors.find((x) => x.id === id);
    if (v) {
      v.status = status;
      s.emails.push({
        id: newId("em"),
        to: "vendor@example.com",
        subject: `Vendor application ${status} (Demo)`,
        body: `${v.businessName}: ${status}.`,
        sentAt: new Date().toISOString(),
      });
    }
    saveDemoState(s);
    setState(s);
  };

  const eventName = (id: string) =>
    state.events.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Event Admin</h1>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-300">
        {(["events", "registrations", "vendors", "emails"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${
              tab === t
                ? "border-b-2 border-slate-800 font-semibold"
                : "text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "events" && (
        <div className="mt-6 space-y-6">
          <form
            onSubmit={createEvent}
            className="rounded-lg border border-slate-300 bg-white p-6 space-y-3"
          >
            <h2 className="text-lg font-semibold">Create event</h2>
            <input
              className="block w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Event name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="rounded border border-slate-300 px-3 py-2"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
              <input
                type="date"
                className="rounded border border-slate-300 px-3 py-2"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                required
              />
            </div>
            <input
              className="block w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <input
              type="number"
              className="block w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Price per person"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
            />
            <button className="rounded bg-slate-800 text-white px-4 py-2 hover:bg-slate-700">
              Create event
            </button>
          </form>
          <ul className="space-y-2">
            {state.events.map((e) => (
              <li
                key={e.id}
                className="rounded border border-slate-300 bg-white p-4"
              >
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-slate-500">
                  {e.startsOn} → {e.endsOn} · {e.location} · $
                  {e.pricePerPerson}/person
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "registrations" && (
        <ul className="mt-6 space-y-3">
          {state.registrations.map((r) => (
            <li
              key={r.id}
              className="rounded border border-slate-300 bg-white p-4"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">
                    {r.kind === "group"
                      ? `${r.groupName} (Group)`
                      : `${r.participants[0]?.firstName} ${r.participants[0]?.lastName} (Individual)`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {eventName(r.eventId)} · {r.participants.length} participant(s)
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div>Paid: ${r.amountPaid}</div>
                  <div className="text-slate-500">Balance: ${r.balanceDue}</div>
                </div>
              </div>
            </li>
          ))}
          {state.registrations.length === 0 && (
            <li className="text-slate-500 text-sm">No registrations yet.</li>
          )}
        </ul>
      )}

      {tab === "vendors" && (
        <ul className="mt-6 space-y-3">
          {state.vendors.map((v) => (
            <li
              key={v.id}
              className="rounded border border-slate-300 bg-white p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{v.businessName}</div>
                <div className="text-xs text-slate-500">
                  {eventName(v.eventId)} · {v.boothType} · {v.status}
                </div>
              </div>
              {v.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setVendorStatus(v.id, "approved")}
                    className="rounded bg-emerald-600 text-white px-3 py-1 text-sm hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setVendorStatus(v.id, "rejected")}
                    className="rounded border border-red-300 text-red-700 px-3 py-1 text-sm hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
          {state.vendors.length === 0 && (
            <li className="text-slate-500 text-sm">No vendors yet.</li>
          )}
        </ul>
      )}

      {tab === "emails" && (
        <ul className="mt-6 space-y-3">
          {state.emails
            .slice()
            .reverse()
            .map((e) => (
              <li
                key={e.id}
                className="rounded border border-slate-300 bg-white p-4"
              >
                <div className="text-xs text-slate-500">
                  To: {e.to} · {new Date(e.sentAt).toLocaleString()}
                </div>
                <div className="font-medium mt-1">{e.subject}</div>
                <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                  {e.body}
                </div>
              </li>
            ))}
          {state.emails.length === 0 && (
            <li className="text-slate-500 text-sm">
              No fake emails yet. Complete a registration or waiver to generate
              one.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
