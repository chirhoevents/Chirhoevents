import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Events',
  description: 'Find Catholic youth ministry events near you. Browse Steubenville conferences, diocesan retreats, parish events, and more.',
  openGraph: {
    title: 'Browse Events | ChiRho Events',
    description: 'Find Catholic youth ministry events near you. Browse Steubenville conferences, diocesan retreats, parish events, and more.',
  },
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
