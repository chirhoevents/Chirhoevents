"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { loadDemoState, type DemoState } from "../../../lib/demo-store";

export default function AdminEmails() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  return (
    <div className="max-w-4xl">
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-2">Email Log (Demo)</h2>
      <p className="text-slate-600 mb-6 text-sm">
        Every email the real system would have sent shows up here instead. Nothing is delivered.
      </p>
      <div className="bg-white rounded-lg border border-[#E1D5BA] divide-y divide-[#E1D5BA]">
        {state.emails.length === 0 && (
          <div className="p-6 text-slate-500 text-sm">
            No emails yet. Complete a registration, pay a balance, or approve a vendor to log one.
          </div>
        )}
        {state.emails
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id} className="p-5">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-[#9C8466] mt-1" />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <div className="text-xs text-slate-500">To: {e.to}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(e.sentAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-medium text-[#1E3A5F] mt-1">{e.subject}</div>
                  <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{e.body}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
