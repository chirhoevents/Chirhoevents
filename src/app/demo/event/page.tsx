"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadDemoState, type DemoEvent } from "../lib/demo-store";

export default function DemoEventPage() {
  const [events, setEvents] = useState<DemoEvent[]>([]);

  useEffect(() => {
    setEvents(loadDemoState().events);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Public Event Page</h1>
      <p className="mt-2 text-slate-700">
        This is what visitors see before registering. Pick an event, then choose
        how to register.
      </p>

      <div className="mt-8 space-y-4">
        {events.map((e) => (
          <div
            key={e.id}
            className="rounded-lg border border-slate-300 bg-white p-6"
          >
            <h2 className="text-xl font-semibold">{e.name}</h2>
            <p className="text-slate-600 text-sm mt-1">
              {e.startsOn} → {e.endsOn} · {e.location}
            </p>
            <p className="text-slate-700 mt-3">
              ${e.pricePerPerson} per person · Capacity {e.capacity}
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/demo/register/individual?event=${e.id}`}
                className="rounded bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
              >
                Register as Individual
              </Link>
              <Link
                href={`/demo/register/group?event=${e.id}`}
                className="rounded border border-slate-800 text-slate-800 px-4 py-2 text-sm hover:bg-slate-100"
              >
                Register a Group
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
