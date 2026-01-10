'use client'

import { use } from 'react'
import PorosLiabilityClientWrapper from './PorosLiabilityClientWrapper'

interface PageProps {
  params: Promise<{
    eventId: string
  }>
}

// NOTE: Auth is handled by the layout with proper retry logic.
// This pattern avoids server-side auth issues during client navigation.
export default function PorosLiabilityPage({ params }: PageProps) {
  const { eventId } = use(params)
  return <PorosLiabilityClientWrapper eventId={eventId} />
}
