"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Store, CheckCircle2 } from "lucide-react";
import {
  loadDemoState,
  logDemoEmail,
  newId,
  updateDemoState,
  type DemoState,
} from "../lib/demo-store";

export default function VendorPortal() {
  const [state, setState] = useState<DemoState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [boothType, setBoothType] = useState("Standard 10x10");

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDemoState((s) => {
      s.vendors.push({
        id: newId("vnd"),
        eventId: event.id,
        businessName,
        contactName,
        contactEmail,
        description,
        boothType,
        status: "pending",
        amountPaid: 0,
      });
    });
    logDemoEmail({
      to: contactEmail,
      subject: "Vendor application received (Demo)",
      body: `Thanks ${contactName}! Your ${boothType} booth application for ${event.name} is pending review.`,
      category: "vendor",
    });
    setState(loadDemoState());
    setShowForm(false);
    setBusinessName("");
    setContactName("");
    setContactEmail("");
    setDescription("");
  };

  const payBooth = (id: string) => {
    updateDemoState((s) => {
      const v = s.vendors.find((x) => x.id === id);
      if (v) v.amountPaid = v.boothType.includes("Premium") ? 300 : 150;
    });
    setState(loadDemoState());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#9C8466]">Vendor Portal</p>
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Booths for {event.name}</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded"
          >
            + New application
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-lg border border-[#E1D5BA] p-6 mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">Booth application</h2>
          <F label="Business name" value={businessName} onChange={setBusinessName} required />
          <div className="grid grid-cols-2 gap-3">
            <F label="Contact name" value={contactName} onChange={setContactName} required />
            <F label="Contact email" type="email" value={contactEmail} onChange={setContactEmail} required />
          </div>
          <label className="block">
            <span className="text-sm font-medium">Booth type</span>
            <select
              value={boothType}
              onChange={(e) => setBoothType(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            >
              <option>Standard 10x10 — $150</option>
              <option>Premium 10x20 — $300</option>
              <option>Non-profit — $75</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button className="flex-1 bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded">Submit</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      )}

      <h2 className="font-semibold text-[#1E3A5F] mb-3">Your applications</h2>
      <div className="space-y-3">
        {state.vendors.map((v) => (
          <div key={v.id} className="bg-white rounded-lg border border-[#E1D5BA] p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-[#9C8466]" />
              <div>
                <div className="font-semibold text-[#1E3A5F]">{v.businessName}</div>
                <div className="text-xs text-slate-500">{v.boothType} · Status: {v.status}</div>
              </div>
            </div>
            {v.status === "approved" && v.amountPaid === 0 && (
              <button
                onClick={() => payBooth(v.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded"
              >
                Pay booth fee (Demo)
              </button>
            )}
            {v.amountPaid > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Paid ${v.amountPaid}
              </span>
            )}
          </div>
        ))}
      </div>
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
