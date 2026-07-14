"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle2 } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function WelcomePackets() {
  const [state, setState] = useState<DemoState | null>(null);
  const [handed, setHanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setState(loadDemoState());
    const saved = localStorage.getItem("demo-welcome-packets");
    if (saved) setHanded(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    localStorage.setItem("demo-welcome-packets", JSON.stringify(Array.from(handed)));
  }, [handed]);

  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const groups = state.registrations.filter((r) => r.eventId === event.id);

  const toggle = (id: string) => {
    const next = new Set(handed);
    next.has(id) ? next.delete(id) : next.add(id);
    setHanded(next);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Welcome Packets</h2>
      <p className="text-slate-600 mb-6 text-sm">
        Track which groups have picked up their welcome packets (name tags, schedule, room keys, T-shirts).
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div
            key={g.id}
            className={`bg-white rounded-lg border-2 p-5 ${
              handed.has(g.id) ? "border-emerald-500" : "border-[#E1D5BA]"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[#1E3A5F]">{g.groupName || "Individual"}</h3>
                <p className="text-xs text-slate-500">
                  {g.participants.length} participants · Leader: {g.leaderName}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#9C8466]/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-[#9C8466]" />
              </div>
            </div>
            <button
              onClick={() => toggle(g.id)}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded font-medium text-sm ${
                handed.has(g.id)
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1E3A5F] text-white hover:bg-[#122239]"
              }`}
            >
              {handed.has(g.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Handed off
                </>
              ) : (
                "Mark handed off"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
