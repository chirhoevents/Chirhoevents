"use client";

import { useEffect, useState } from "react";
import { Printer, CheckCircle2 } from "lucide-react";
import {
  loadDemoState,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function NameTagsPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const event = state.events.find((e) => e.id === state.currentEventId) || state.events[0];
  const rows = state.registrations
    .filter((r) => r.eventId === event.id)
    .flatMap((r) => r.participants.map((p) => ({ ...p, groupName: r.groupName || "Individual", regId: r.id })));

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(rows.map((r) => r.id)));
  const selectNone = () => setSelected(new Set());
  const selectUnprinted = () =>
    setSelected(new Set(rows.filter((r) => !r.nametagPrinted).map((r) => r.id)));

  const printSelected = () => {
    updateDemoState((s) => {
      s.registrations.forEach((r) => {
        r.participants.forEach((p) => {
          if (selected.has(p.id)) p.nametagPrinted = true;
        });
      });
    });
    setState(loadDemoState());
    alert(`Demo: ${selected.size} name tags "printed" (marked as printed in browser state).`);
    setSelected(new Set());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A5F]">Name Tags</h2>
          <p className="text-slate-600 text-sm">
            Select participants and print their name tags. Preview shows what would print.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={selectUnprinted} className="text-sm px-3 py-1.5 border border-[#E1D5BA] rounded hover:bg-white">
            Select unprinted
          </button>
          <button onClick={selectAll} className="text-sm px-3 py-1.5 border border-[#E1D5BA] rounded hover:bg-white">
            All
          </button>
          <button onClick={selectNone} className="text-sm px-3 py-1.5 border border-[#E1D5BA] rounded hover:bg-white">
            None
          </button>
          <button
            onClick={printSelected}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#122239] disabled:bg-slate-300 text-white px-4 py-1.5 rounded text-sm"
          >
            <Printer className="h-4 w-4" /> Print {selected.size}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <label
            key={p.id}
            className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition ${
              selected.has(p.id) ? "border-[#9C8466]" : "border-[#E1D5BA]"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="mt-1"
              />
              <div className="flex-1">
                {/* Preview of name tag */}
                <div className="border-2 border-[#1E3A5F] bg-white p-4 mb-3 text-center">
                  <div className="text-xs text-[#9C8466] uppercase tracking-widest">HELLO, my name is</div>
                  <div className="text-2xl font-bold text-[#1E3A5F] my-2">
                    {p.firstName}
                  </div>
                  <div className="text-sm text-slate-600">{p.lastName}</div>
                  <div className="text-xs text-slate-500 mt-2 border-t pt-2">{p.groupName}</div>
                </div>
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{p.role} · Age {p.age}</span>
                  {p.nametagPrinted && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Printed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
