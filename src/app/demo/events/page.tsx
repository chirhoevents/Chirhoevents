"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { loadDemoState, type DemoEvent } from "../lib/demo-store";

export default function DemoEventsList() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  useEffect(() => setEvents(loadDemoState().events), []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-4xl font-bold text-[#1E3A5F] mt-4 mb-2">Upcoming Events</h1>
      <p className="text-slate-600 mb-8">
        Browse events and start a registration. Individual or group.
      </p>

      <div className="grid gap-4">
        {events.map((e) => (
          <div key={e.id} className="bg-white rounded-lg border border-[#E1D5BA] p-6">
            <div className="flex flex-wrap justify-between gap-4 mb-3">
              <div>
                <h2 className="text-2xl font-bold text-[#1E3A5F]">{e.name}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {e.startsOn} → {e.endsOn}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {e.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {e.registered} / {e.capacity} registered
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#1E3A5F]">${e.pricePerPerson}</div>
                <div className="text-xs text-slate-500">per person</div>
              </div>
            </div>
            <p className="text-slate-700 mb-4">{e.description}</p>
            <div className="flex gap-3">
              <Link
                href={`/demo/register/individual?event=${e.id}`}
                className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-4 py-2 rounded font-medium text-sm"
              >
                Register as Individual
              </Link>
              <Link
                href={`/demo/register/group?event=${e.id}`}
                className="border border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/5 px-4 py-2 rounded font-medium text-sm"
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
