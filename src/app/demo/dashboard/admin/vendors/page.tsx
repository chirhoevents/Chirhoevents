"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Store } from "lucide-react";
import {
  loadDemoState,
  logDemoEmail,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function AdminVendors() {
  const [state, setState] = useState<DemoState | null>(null);
  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const decide = (id: string, status: "approved" | "rejected") => {
    updateDemoState((s) => {
      const v = s.vendors.find((x) => x.id === id);
      if (v) v.status = status;
    });
    const v = state.vendors.find((x) => x.id === id);
    if (v) {
      logDemoEmail({
        to: v.contactEmail,
        subject: `Vendor application ${status} (Demo)`,
        body: `${v.businessName}: your booth application has been ${status}.`,
        category: "vendor",
      });
    }
    setState(loadDemoState());
  };

  return (
    <div className="max-w-5xl">
      <h2 className="text-3xl font-bold text-[#1E3A5F] mb-6">Vendors</h2>
      <div className="space-y-3">
        {state.vendors.map((v) => (
          <div key={v.id} className="bg-white rounded-lg border border-[#E1D5BA] p-5 flex justify-between items-start">
            <div className="flex items-start gap-3">
              <Store className="h-6 w-6 text-[#9C8466] mt-1" />
              <div>
                <h3 className="font-semibold text-[#1E3A5F]">{v.businessName}</h3>
                <p className="text-sm text-slate-600">
                  {v.contactName} · {v.contactEmail}
                </p>
                <p className="text-sm text-slate-600">
                  {v.boothType} · Paid ${v.amountPaid}
                </p>
                <p className="text-sm text-slate-700 mt-2">{v.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <StatusBadge status={v.status} />
              </div>
              {v.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(v.id, "approved")}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5 rounded"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(v.id, "rejected")}
                    className="inline-flex items-center gap-1 border border-red-300 text-red-700 hover:bg-red-50 text-sm px-3 py-1.5 rounded"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    pending: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}
