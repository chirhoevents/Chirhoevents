"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users,
  FileText,
  Home,
  CreditCard,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { loadDemoState, type DemoState } from "../../lib/demo-store";

export default function GroupLeaderDashboard() {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => setState(loadDemoState()), []);
  if (!state) return null;

  const registration = state.registrations.find((r) => r.id === state.currentRegistrationId) || state.registrations[0];
  const event = state.events.find((e) => e.id === registration.eventId)!;

  const participants = registration.participants;
  const signed = participants.filter((p) => p.liabilitySigned).length;
  const housed = participants.filter((p) => p.housingId).length;
  const totalPaid = registration.amountPaid;
  const total = totalPaid + registration.balanceDue;
  const paidPct = total > 0 ? Math.round((totalPaid / total) * 100) : 0;

  const daysUntil = Math.ceil(
    (new Date(event.startsOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1E3A5F]">
          Welcome back, {registration.leaderName?.split(" ")[0]}
        </h1>
        <p className="text-slate-600 mt-1">
          Here&apos;s where <strong>{registration.groupName}</strong> stands for{" "}
          <strong>{event.name}</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Participants</span>
            <Users className="h-4 w-4 text-[#9C8466]" />
          </div>
          <div className="text-3xl font-bold text-[#1E3A5F]">{participants.length}</div>
          <Link href="/demo/dashboard/group-leader/participants" className="text-xs text-[#9C8466] hover:underline mt-2 inline-block">
            Manage →
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Waivers signed</span>
            <FileText className="h-4 w-4 text-[#9C8466]" />
          </div>
          <div className="text-3xl font-bold text-[#1E3A5F]">
            {signed}/{participants.length}
          </div>
          <Link href="/demo/dashboard/group-leader/forms" className="text-xs text-[#9C8466] hover:underline mt-2 inline-block">
            View →
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Housing assigned</span>
            <Home className="h-4 w-4 text-[#9C8466]" />
          </div>
          <div className="text-3xl font-bold text-[#1E3A5F]">
            {housed}/{participants.length}
          </div>
          <Link href="/demo/dashboard/group-leader/housing" className="text-xs text-[#9C8466] hover:underline mt-2 inline-block">
            Assign →
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-[#E1D5BA] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Balance due</span>
            <CreditCard className="h-4 w-4 text-[#9C8466]" />
          </div>
          <div className="text-3xl font-bold text-[#1E3A5F]">${registration.balanceDue}</div>
          <Link href="/demo/dashboard/group-leader/payments" className="text-xs text-[#9C8466] hover:underline mt-2 inline-block">
            Pay →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E1D5BA] p-6">
          <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Event details</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-[#9C8466] mt-0.5" />
              <div>
                <div className="font-medium">
                  {new Date(event.startsOn).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  {" → "}
                  {new Date(event.endsOn).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </div>
                <div className="text-sm text-slate-500">
                  {daysUntil > 0 ? `${daysUntil} days from now` : "Event has started"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#9C8466] mt-0.5" />
              <div>
                <div className="font-medium">{event.location}</div>
                <div className="text-sm text-slate-500">{event.address}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#E1D5BA]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Paid</span>
              <span className="font-medium">${totalPaid} of ${total}</span>
            </div>
            <div className="h-2 bg-[#E1D5BA] rounded-full overflow-hidden">
              <div className="h-full bg-[#1E3A5F]" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E1D5BA] p-6">
          <h2 className="text-xl font-semibold text-[#1E3A5F] mb-4">Action needed</h2>
          <ul className="space-y-3">
            {registration.balanceDue > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  Balance of <strong>${registration.balanceDue}</strong> due before event.{" "}
                  <Link href="/demo/dashboard/group-leader/payments" className="text-[#9C8466] hover:underline">
                    Pay now
                  </Link>
                </div>
              </li>
            )}
            {signed < participants.length && (
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>{participants.length - signed}</strong> waivers still pending.{" "}
                  <Link href="/demo/dashboard/group-leader/forms" className="text-[#9C8466] hover:underline">
                    Review
                  </Link>
                </div>
              </li>
            )}
            {housed < participants.length && (
              <li className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>{participants.length - housed}</strong> participants unassigned to housing.{" "}
                  <Link href="/demo/dashboard/group-leader/housing" className="text-[#9C8466] hover:underline">
                    Assign
                  </Link>
                </div>
              </li>
            )}
            {registration.balanceDue === 0 && signed === participants.length && housed === participants.length && (
              <li className="flex items-start gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>You&apos;re all set. See you at the event!</div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
