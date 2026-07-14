"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { logDemoEmail } from "../lib/demo-store";

export default function LiabilityForm() {
  const [signerName, setSignerName] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [relationship, setRelationship] = useState("Parent / Guardian");
  const [signed, setSigned] = useState(false);
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    logDemoEmail({
      to: "admin@example.com",
      subject: `Liability form signed for ${participantName} (Demo)`,
      body: `Signed by ${signerName} (${relationship}). No real waiver was recorded.`,
      category: "waiver",
    });
    setDone(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <div className="flex items-center gap-3 mt-4 mb-2">
        <FileText className="h-8 w-8 text-[#9C8466]" />
        <h1 className="text-3xl font-bold text-[#1E3A5F]">Liability / Waiver</h1>
      </div>
      <p className="text-slate-600 mb-6">
        Under-18 participants have this signed by a parent. Adults sign themselves.
      </p>

      {!done ? (
        <form onSubmit={submit} className="bg-white rounded-lg border border-[#E1D5BA] p-6 space-y-4">
          <F label="Participant name" value={participantName} onChange={setParticipantName} required />
          <F label="Signer name" value={signerName} onChange={setSignerName} required />
          <label className="block">
            <span className="text-sm font-medium">Relationship</span>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
            >
              <option>Parent / Guardian</option>
              <option>Self (18+)</option>
              <option>Chaperone</option>
              <option>Clergy</option>
            </select>
          </label>
          <div className="rounded border border-slate-200 bg-[#F5F1E8] p-4 text-sm text-slate-700 max-h-40 overflow-y-auto">
            [Sample waiver text.] I acknowledge that participation in the event
            involves risks including but not limited to physical injury. I agree
            to release the organizer, its staff, and volunteers from liability
            for injuries or losses sustained during the event, and I authorize
            emergency medical treatment if needed. This is placeholder text for
            demonstration only.
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-1"
              required
            />
            <span>I have read and agree to the waiver above.</span>
          </label>
          <button
            disabled={!signed}
            className="bg-[#1E3A5F] hover:bg-[#122239] text-white px-5 py-2 rounded font-medium disabled:opacity-50"
          >
            Submit signed form (Demo)
          </button>
        </form>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
          <h2 className="text-xl font-bold text-emerald-900">Waiver submitted</h2>
          <p className="text-emerald-800 mt-1 text-sm">
            A fake notification was logged. See it in{" "}
            <Link href="/demo/dashboard/admin/emails" className="underline">Admin → Emails</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function F({ label, value, onChange, required = false }: any) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded border border-[#E1D5BA] px-3 py-2"
      />
    </label>
  );
}
