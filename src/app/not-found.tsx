import Link from 'next/link'
import Image from 'next/image'
import { Home, Calendar, Mail } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image with Navy Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/ChiRho Event Logos/ChiRho events BG.png"
          alt="ChiRho Events Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-navy/85" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <Image
            src="/logo-horizontal.png"
            alt="ChiRho Events"
            width={200}
            height={60}
            className="mx-auto"
          />
        </Link>

        {/* 404 Badge */}
        <div className="mb-6">
          <span className="inline-block bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-semibold">
            Error 404
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Page Not Found
        </h1>

        {/* Message */}
        <p className="text-xl text-gray-300 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
          It might have been moved, deleted, or never existed.
        </p>

        {/* Suggestions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
          <p className="text-gray-300 mb-4">Here are some helpful links:</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-600 text-navy font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Browse Events
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-navy font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
          </div>
        </div>

        {/* Contact Support */}
        <p className="text-gray-400">
          Need help?{' '}
          <a
            href="mailto:support@chirhoevents.com"
            className="inline-flex items-center gap-1 text-gold hover:underline"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
