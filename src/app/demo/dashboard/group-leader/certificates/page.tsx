"use client";

import { useEffect, useState } from "react";
import { Download, Shield } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function CertificatesPage() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];
  const event = state.events.find((e) => e.id === reg.eventId)!;

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">Certificates</h1>
      <p className="text-slate-600 mb-6">
        Downloadable certificates of completion for each participant after the event.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {reg.participants
          .filter((p) => p.role === "participant")
          .map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg border border-[#E1D5BA] p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-[#9C8466]/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-[#9C8466]" />
                </div>
                <div>
                  <div className="font-semibold text-[#1E3A5F]">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{event.name}</div>
                </div>
              </div>
              <button
                onClick={() => alert(`Demo: would download certificate for ${p.firstName} ${p.lastName}.`)}
                className="inline-flex items-center gap-1 text-sm text-[#9C8466] hover:underline"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
