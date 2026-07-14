"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import {
  loadDemoState,
  logDemoEmail,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function FormsPage() {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];

  const toggleSigned = (pid: string) => {
    updateDemoState((s) => {
      const r = s.registrations.find((x) => x.id === reg.id);
      const p = r?.participants.find((x) => x.id === pid);
      if (p) {
        p.liabilitySigned = !p.liabilitySigned;
        if (p.liabilitySigned) p.liabilitySignedAt = new Date().toISOString();
      }
    });
    setState(loadDemoState());
  };

  const remindAll = () => {
    const pending = reg.participants.filter((p) => !p.liabilitySigned);
    pending.forEach((p) => {
      logDemoEmail({
        to: p.email || p.emergencyContact || "parent@example.com",
        subject: `Waiver reminder for ${p.firstName} ${p.lastName} (Demo)`,
        body: "This is a fake reminder email. Please sign the liability form before the event.",
        category: "reminder",
      });
    });
    setState(loadDemoState());
    alert(`${pending.length} fake reminder emails logged.`);
  };

  const signed = reg.participants.filter((p) => p.liabilitySigned).length;
  const pct = reg.participants.length > 0 ? Math.round((signed / reg.participants.length) * 100) : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Liability Forms</h1>
          <p className="text-slate-600 mt-1">
            Track waivers for every participant. Under-18 participants need parent signatures.
          </p>
        </div>
        <button
          onClick={remindAll}
          className="inline-flex items-center gap-2 bg-[#9C8466] hover:bg-[#8B7355] text-white px-4 py-2 rounded-lg text-sm"
        >
          <Mail className="h-4 w-4" /> Remind pending
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#1E3A5F]">Progress</span>
          <span className="text-sm text-slate-600">
            {signed} of {reg.participants.length} signed
          </span>
        </div>
        <div className="h-3 bg-[#E1D5BA] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1E3A5F] to-[#9C8466]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E1D5BA] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F5F1E8] text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Form type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed at</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1D5BA]">
            {reg.participants.map((p) => {
              const formType =
                p.role === "chaperone"
                  ? "Chaperone (Adult)"
                  : p.age < 18
                    ? "Youth Under 18 (Parent signature)"
                    : "Adult (Self signature)";
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1E3A5F]">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="text-xs text-slate-500">
                      Age {p.age} · {p.role}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <FileText className="h-4 w-4 inline mr-1 text-[#9C8466]" />
                    {formType}
                  </td>
                  <td className="px-4 py-3">
                    {p.liabilitySigned ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Signed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 text-sm">
                        <AlertCircle className="h-4 w-4" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.liabilitySignedAt
                      ? new Date(p.liabilitySignedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleSigned(p.id)}
                      className="text-xs text-[#9C8466] hover:underline"
                    >
                      {p.liabilitySigned ? "Mark pending" : "Mark signed"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-slate-600">
        Try the participant-facing waiver at{" "}
        <Link href="/demo/liability" className="text-[#9C8466] hover:underline">
          /demo/liability
        </Link>
        .
      </div>
    </div>
  );
}
