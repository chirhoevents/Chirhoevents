"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadDemoState,
  newId,
  saveDemoState,
  type DemoState,
  type DemoVendor,
} from "../lib/demo-store";

export default function VendorPortal() {
  const [state, setState] = useState<DemoState | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [boothType, setBoothType] = useState("Standard 10x10");
  const [eventId, setEventId] = useState("");

  useEffect(() => {
    const s = loadDemoState();
    setState(s);
    if (s.events[0]) setEventId(s.events[0].id);
  }, []);

  if (!state) return null;

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const s = loadDemoState();
    const vendor: DemoVendor = {
      id: newId("vnd"),
      eventId,
      businessName,
      contactName,
      boothType,
      status: "pending",
      amountPaid: 0,
    };
    s.vendors.push(vendor);
    s.emails.push({
      id: newId("em"),
      to: "vendor@example.com",
      subject: "Vendor application received (Demo)",
      body: `${businessName} — application submitted. Awaiting approval.`,
      sentAt: new Date().toISOString(),
    });
    saveDemoState(s);
    setState(s);
    setBusinessName("");
    setContactName("");
  };

  const payBoothFee = (id: string) => {
    const s = loadDemoState();
    const v = s.vendors.find((x) => x.id === id);
    if (!v) return;
    v.amountPaid = 150;
    saveDemoState(s);
    setState(s);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Vendor Portal</h1>

      <form
        onSubmit={apply}
        className="mt-6 space-y-4 rounded-lg border border-slate-300 bg-white p-6"
      >
        <h2 className="text-lg font-semibold">Apply for a booth</h2>
        <label className="block">
          <span className="text-sm font-medium">Event</span>
          <select
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            {state.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Business name</span>
            <input
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Contact name</span>
            <input
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Booth type</span>
          <select
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            value={boothType}
            onChange={(e) => setBoothType(e.target.value)}
          >
            <option>Standard 10x10</option>
            <option>Premium 10x20</option>
            <option>Non-profit</option>
          </select>
        </label>
        <button className="rounded bg-slate-800 text-white px-4 py-2 hover:bg-slate-700">
          Submit application
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Your vendor applications</h2>
        <ul className="mt-3 space-y-3">
          {state.vendors.map((v) => (
            <li
              key={v.id}
              className="rounded border border-slate-300 bg-white p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{v.businessName}</div>
                <div className="text-xs text-slate-500">
                  {v.boothType} · Status:{" "}
                  <span
                    className={
                      v.status === "approved"
                        ? "text-emerald-700"
                        : v.status === "rejected"
                          ? "text-red-700"
                          : "text-amber-700"
                    }
                  >
                    {v.status}
                  </span>{" "}
                  · Paid: ${v.amountPaid}
                </div>
              </div>
              {v.status === "approved" && v.amountPaid === 0 && (
                <button
                  onClick={() => payBoothFee(v.id)}
                  className="rounded bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-500"
                >
                  Pay Booth Fee $150 (Demo)
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
