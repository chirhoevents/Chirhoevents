"use client";

import Link from "next/link";
import { useState } from "react";
import { loadDemoState, newId, saveDemoState } from "../lib/demo-store";

export default function LiabilityForm() {
  const [signerName, setSignerName] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [relationship, setRelationship] = useState("Parent / Guardian");
  const [signed, setSigned] = useState(false);
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = loadDemoState();
    s.emails.push({
      id: newId("em"),
      to: "admin@example.com",
      subject: `Liability form signed for ${participantName} (Demo)`,
      body: `Signed by ${signerName} (${relationship}). No real waiver was recorded.`,
      sentAt: new Date().toISOString(),
    });
    saveDemoState(s);
    setDone(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/demo" className="text-sm text-slate-600 underline">
        ← Demo home
      </Link>
      <h1 className="text-3xl font-bold mt-4">Liability Form</h1>
      <p className="mt-2 text-slate-700">
        In the real site, this is signed electronically before the event.
        Youth-under-18 forms are routed to a parent to sign.
      </p>

      {!done ? (
        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-lg border border-slate-300 bg-white p-6"
        >
          <label className="block">
            <span className="text-sm font-medium">Participant name</span>
            <input
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Signer name</span>
            <input
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Relationship</span>
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              <option>Parent / Guardian</option>
              <option>Self (18+)</option>
              <option>Chaperone</option>
              <option>Clergy</option>
            </select>
          </label>
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 max-h-40 overflow-y-auto">
            [Sample waiver text.] I acknowledge that participation in the event
            involves risks and I agree to release the organizer from liability
            for injuries sustained during the event. This is placeholder text
            for demonstration only.
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-1"
              required
            />
            <span className="text-sm">
              I have read and agree to the waiver above.
            </span>
          </label>
          <button
            disabled={!signed}
            className="rounded bg-slate-800 text-white px-4 py-2 hover:bg-slate-700 disabled:opacity-50"
          >
            Submit signed form (Demo)
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded-lg border border-emerald-400 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">
            Waiver submitted
          </h2>
          <p className="mt-2 text-emerald-900">
            A fake notification email was logged for the admin. See it in the{" "}
            <Link href="/demo/admin" className="underline">
              Admin view
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
