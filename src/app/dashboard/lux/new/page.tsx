'use client'

import Link from 'next/link'
import { CalendarHeart, BookOpen, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/lux/ui'
import { useLux } from '@/contexts/LuxContext'

/** "What are you setting up?" — the one starting point for everything in Lux */
export default function NewInLuxPage() {
  const { info } = useLux()
  const remaining = info.simpleEvents.remaining

  return (
    <div className="max-w-4xl">
      <PageHeader title="What are you setting up?" description="Pick one. You can change anything later." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/dashboard/lux/events/new" className="group bg-white rounded-2xl border border-[#E8E2D4] p-6 hover:shadow-lg hover:border-[#C8A24A] transition-all">
          <div className="h-12 w-12 rounded-xl bg-[#F5F1E8] flex items-center justify-center mb-4">
            <CalendarHeart className="h-6 w-6 text-[#C8A24A]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">An event or sign-up</h2>
          <p className="text-gray-600 mt-1 text-sm">Fish fry, Bible study, retreat, parish picnic, volunteer sign-up. One page, tickets, and payment.</p>
          <p className="text-xs text-gray-500 mt-3">
            {remaining === null
              ? 'Unlimited on your plan'
              : `${remaining} of ${info.simpleEvents.limit} left on your plan this year`}
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#1E3A5F] mt-4 group-hover:gap-2 transition-all">
            Set up an event <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/dashboard/lux/programs/new" className="group bg-white rounded-2xl border border-[#E8E2D4] p-6 hover:shadow-lg hover:border-[#C8A24A] transition-all">
          <div className="h-12 w-12 rounded-xl bg-[#F5F1E8] flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-[#C8A24A]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">A class or sacrament program</h2>
          <p className="text-gray-600 mt-1 text-sm">Faith Formation, First Communion, Confirmation, Vacation Bible School. Families register their children, upload documents, and pay.</p>
          <p className="text-xs text-gray-500 mt-3">Unlimited programs on every plan</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#1E3A5F] mt-4 group-hover:gap-2 transition-all">
            Set up a program <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  )
}
