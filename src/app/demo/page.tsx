"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadDemoState, resetDemoState, type DemoState } from "./lib/demo-store";

const portals: Array<{
  href: string;
  title: string;
  blurb: string;
  who: string;
}> = [
  {
    href: "/demo/event",
    title: "Public Event Page",
    blurb: "What a prospective registrant sees. Browse an event, then choose Individual or Group registration.",
    who: "Anyone",
  },
  {
    href: "/demo/register/individual",
    title: "Individual Registration",
    blurb: "One person registering themselves (or a parent registering one child). Includes fake payment.",
    who: "Participant",
  },
  {
    href: "/demo/register/group",
    title: "Group Registration",
    blurb: "A youth minister or leader registering a whole group. Reserves seats and generates a leader login.",
    who: "Group Leader",
  },
  {
    href: "/demo/group-leader",
    title: "Group Leader Portal",
    blurb: "Manage a group after registration: add participants, pay balance, track liability forms.",
    who: "Group Leader",
  },
  {
    href: "/demo/vendor",
    title: "Vendor Portal",
    blurb: "Apply for a booth, view approval status, pay booth fee.",
    who: "Vendor",
  },
  {
    href: "/demo/liability",
    title: "Liability Form",
    blurb: "The waiver flow participants (or their parents) complete before the event.",
    who: "Participant / Parent",
  },
  {
    href: "/demo/admin",
    title: "Event Admin",
    blurb: "Create events, review registrations, approve vendors, see fake emails that would have been sent.",
    who: "Organization Admin",
  },
];

export default function DemoLanding() {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => {
    setState(loadDemoState());
  }, []);

  const handleReset = () => {
    if (confirm("Reset all demo data in this browser?")) {
      setState(resetDemoState());
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-slate-900">ChiRho Events Demo</h1>
        <p className="mt-3 text-lg text-slate-700">
          Click through every portal ChiRho offers. This demo runs entirely in
          your browser — no real payments, no real emails, no accounts to
          create. Data is saved to <code className="bg-slate-200 px-1 rounded">localStorage</code>{" "}
          on this computer only. Clear your browser to start over.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-xl font-semibold mb-2">How to try it</h2>
        <ol className="list-decimal list-inside space-y-1 text-slate-700">
          <li>Start at the <strong>Public Event Page</strong> to see what a family or leader sees first.</li>
          <li>Run through an <strong>Individual</strong> or <strong>Group</strong> registration. Payment uses a fake &quot;Pay&quot; button.</li>
          <li>Log into the <strong>Group Leader Portal</strong> to manage participants and balance.</li>
          <li>Check the <strong>Vendor Portal</strong> and <strong>Liability Form</strong> flows.</li>
          <li>Peek at the <strong>Admin</strong> view to see registrations, vendor approvals, and the fake email log.</li>
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {portals.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="block rounded-lg border border-slate-300 bg-white p-5 hover:border-slate-500 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
              <span className="text-xs uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {p.who}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{p.blurb}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-slate-300 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Demo data on this browser</h2>
            <p className="text-sm text-slate-600 mt-1">
              {state
                ? `${state.events.length} events · ${state.registrations.length} registrations · ${state.vendors.length} vendors · ${state.emails.length} fake emails`
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="rounded bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
          >
            Reset demo
          </button>
        </div>
      </section>
    </div>
  );
}
