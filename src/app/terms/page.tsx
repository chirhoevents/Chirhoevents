import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service - ChiRho Events',
  description: 'Terms of Service for ChiRho Events - Review the terms and conditions for using our platform.',
}

export default function TermsOfServicePage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      <PublicNav currentPage="/terms" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center text-gold hover:text-gold-600 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-navy mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last Updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Acceptance of Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By using ChiRho Events, you agree to these Terms of Service. If you do not agree,
                do not use our platform.
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Description of Service</h2>
              <p className="text-gray-700 leading-relaxed">
                ChiRho Events provides event registration and management services for Catholic
                ministry events, including but not limited to diocesan retreats, conferences,
                parish events, and seminary programs.
              </p>
            </section>

            {/* User Accounts */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">User Accounts</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Account Creation</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>You must provide accurate information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must be 18+ to create an account or have parental consent</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Account Responsibilities</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Keep your password secure</li>
                <li>Notify us of unauthorized access</li>
                <li>Do not share your account</li>
                <li>Comply with all applicable laws</li>
              </ul>
            </section>

            {/* Event Registration */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Event Registration</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Registration Commitment</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Registrations are binding</li>
                <li>Payment is required to complete registration</li>
                <li>Cancellation policies vary by event organizer</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Payment Terms</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Deposits may be required</li>
                <li>Full payment due by specified deadline</li>
                <li>Late fees may apply to overdue balances</li>
                <li>Refunds subject to event organizer&apos;s policy</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Liability Forms</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Liability forms must be completed before event attendance</li>
                <li>Parents must complete forms for participants under 18</li>
                <li>Medical information must be accurate and current</li>
              </ul>
            </section>

            {/* User Conduct */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">User Conduct</h2>
              <p className="text-gray-700 mb-4">You agree NOT to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide false information</li>
                <li>Impersonate others</li>
                <li>Violate any laws</li>
                <li>Interfere with platform operation</li>
                <li>Upload malicious content</li>
                <li>Attempt unauthorized access</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Intellectual Property</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Our Content</h3>
              <p className="text-gray-700 mb-6">
                All platform content (text, graphics, logos) is owned by ChiRho Events or licensors.
                You may not copy, modify, or distribute without permission.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">User Content</h3>
              <p className="text-gray-700">
                You retain rights to content you upload (photos, documents). You grant us license
                to use this content for platform operation.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Disclaimers</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Service &quot;As Is&quot;</h3>
              <p className="text-gray-700 mb-6">
                ChiRho Events is provided &quot;as is&quot; without warranties of any kind.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Event Organizer Responsibility</h3>
              <p className="text-gray-700 mb-4">Event organizers are solely responsible for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Event safety and supervision</li>
                <li>Compliance with laws and regulations</li>
                <li>Safe Environment policies</li>
                <li>Refund policies</li>
              </ul>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-blue-800">We are a technology platform only.</p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">To the fullest extent permitted by law:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to amounts you paid us</li>
                <li>We are not liable for event organizer actions</li>
              </ul>
            </section>

            {/* Indemnification */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify ChiRho Events from claims arising from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your use of the platform</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any laws</li>
              </ul>
            </section>

            {/* Event Cancellation */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Event Cancellation</h2>
              <p className="text-gray-700 mb-4">If an event is cancelled:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Event organizer determines refund policy</li>
                <li>We are not responsible for refunds</li>
                <li>We may retain processing fees</li>
              </ul>
            </section>

            {/* Dispute Resolution */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Governing Law</h3>
              <p className="text-gray-700 mb-6">
                These Terms are governed by the laws of the State of Ohio, United States.
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3">Arbitration</h3>
              <p className="text-gray-700">
                Disputes will be resolved through binding arbitration, except for matters that
                may be brought in small claims court.
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Changes to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms at any time. Continued use after changes constitutes
                acceptance of the modified Terms.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Terms violations</li>
                <li>Fraudulent activity</li>
                <li>Non-payment</li>
                <li>At our discretion</li>
              </ul>
            </section>

            {/* Contact */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Contact</h2>
              <p className="text-gray-700 mb-4">Questions about these Terms?</p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:legal@chirhoevents.com" className="text-gold hover:underline">
                    legal@chirhoevents.com
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Related Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-navy mb-4">Related Legal Documents</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="text-gold hover:underline"
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-gold hover:underline"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-navy text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">&copy; 2025 ChiRho Events. All rights reserved.</p>
          <div className="mt-4 space-x-6">
            <Link href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gold hover:underline">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-gold hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
