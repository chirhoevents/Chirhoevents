"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import {
  loadDemoState,
  logDemoEmail,
  updateDemoState,
  type DemoState,
} from "../../../lib/demo-store";

export default function PaymentsPage() {
  const [state, setState] = useState<DemoState | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const s = loadDemoState();
    setState(s);
    const reg = s.registrations.find((r) => r.id === s.currentRegistrationId) || s.registrations[0];
    setAmount(reg.balanceDue);
  }, []);

  if (!state) return null;

  const reg = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];
  const total = reg.amountPaid + reg.balanceDue;

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      updateDemoState((s) => {
        const r = s.registrations.find((x) => x.id === reg.id);
        if (r) {
          const pay = Math.min(amount, r.balanceDue);
          r.amountPaid += pay;
          r.balanceDue -= pay;
        }
      });
      logDemoEmail({
        to: reg.leaderEmail || "leader@example.com",
        subject: `Payment receipt: $${amount} (Demo)`,
        body: `Thanks! We received your payment of $${amount} for ${reg.groupName}. This is a fake receipt — no real card was charged.`,
        category: "receipt",
      });
      setState(loadDemoState());
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }, 800);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-[#1E3A5F] mb-6">Payments</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Stat label="Total registration" value={`$${total}`} />
        <Stat label="Amount paid" value={`$${reg.amountPaid}`} accent="text-emerald-700" />
        <Stat label="Balance due" value={`$${reg.balanceDue}`} accent="text-amber-700" />
      </div>

      {reg.balanceDue > 0 ? (
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
          <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Make a payment</h2>
          <label className="block mb-3">
            <span className="text-sm font-medium">Amount</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min={1}
                max={reg.balanceDue}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="block w-full rounded border border-[#E1D5BA] pl-7 pr-3 py-2"
              />
            </div>
          </label>
          <div className="rounded border border-dashed border-[#9C8466] bg-[#F5F1E8] p-4 mb-4 text-sm text-slate-700">
            <strong>Demo mode:</strong> No real card entry, no real charge.
            Clicking pay records a fake payment and logs a fake receipt email.
          </div>
          <button
            onClick={handlePay}
            disabled={processing || amount < 1}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-semibold"
          >
            <CreditCard className="h-5 w-5" />
            {processing ? "Processing…" : `Pay $${amount}`}
          </button>
          {success && (
            <div className="mt-4 flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Payment recorded. Fake receipt logged to the admin email log.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div>
            <div className="font-semibold text-emerald-900">Paid in full</div>
            <div className="text-sm text-emerald-800">No balance remaining.</div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-semibold text-[#1E3A5F] mb-3">Payment history</h3>
        <div className="bg-white rounded-lg border border-[#E1D5BA] divide-y divide-[#E1D5BA]">
          {state.emails
            .filter((e) => e.category === "receipt")
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e.subject}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(e.sentAt).toLocaleString()}
                  </div>
                </div>
                <span className="text-emerald-700 text-sm">✓ Paid</span>
              </div>
            ))}
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Initial deposit</div>
              <div className="text-xs text-slate-500">
                {new Date(reg.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span className="text-emerald-700 text-sm">✓ Paid</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${accent || "text-[#1E3A5F]"}`}>{value}</div>
    </div>
  );
}
