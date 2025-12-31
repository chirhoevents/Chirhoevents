import Link from 'next/link'
import { PublicNav } from '@/components/PublicNav'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Cookie Policy - ChiRho Events',
  description: 'Cookie Policy for ChiRho Events - Learn about how we use cookies on our platform.',
}

export default function CookiePolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      <PublicNav currentPage="/cookies" />

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
            <h1 className="text-4xl font-bold text-navy mb-4">Cookie Policy</h1>
            <p className="text-gray-600">Last Updated: {lastUpdated}</p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* What Are Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when
                you visit a website. They are widely used to make websites work more efficiently and
                to provide information to the website owners.
              </p>
            </section>

            {/* How We Use Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">How We Use Cookies</h2>
              <p className="text-gray-700 mb-4">ChiRho Events uses cookies for the following purposes:</p>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Essential Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> These cookies are necessary for the website to function properly.
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Maintaining your login session</li>
                    <li>Remembering items in your registration</li>
                    <li>Security features</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> Session or up to 7 days
                  </p>
                </div>

                {/* Authentication Cookies */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Authentication Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> These cookies are set by our authentication provider (Clerk)
                    to keep you logged in securely.
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Identifying you when you return to the site</li>
                    <li>Maintaining secure access to your account</li>
                    <li>Remembering your authentication preferences</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> Up to 30 days
                  </p>
                </div>

                {/* Preference Cookies */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Preference Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> These cookies remember your choices and preferences.
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Your selected event or group</li>
                    <li>Dashboard display preferences</li>
                    <li>Notification settings</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> Up to 1 year
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-navy mb-3">Analytics Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Purpose:</strong> These cookies help us understand how visitors use our website.
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Pages visited and time spent</li>
                    <li>Features used</li>
                    <li>Error tracking</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Duration:</strong> Up to 2 years
                  </p>
                </div>
              </div>
            </section>

            {/* Third-Party Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                Some cookies on our site are placed by third-party services:
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-navy text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Provider</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Purpose</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">More Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-gray-700">Clerk</td>
                      <td className="px-6 py-4 text-gray-700">Authentication</td>
                      <td className="px-6 py-4">
                        <a
                          href="https://clerk.com/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">Stripe</td>
                      <td className="px-6 py-4 text-gray-700">Payment Processing</td>
                      <td className="px-6 py-4">
                        <a
                          href="https://stripe.com/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Managing Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Managing Cookies</h2>
              <p className="text-gray-700 mb-4">
                You can control and manage cookies in several ways:
              </p>

              <h3 className="text-xl font-semibold text-navy-600 mb-3 mt-6">Browser Settings</h3>
              <p className="text-gray-700 mb-4">
                Most web browsers allow you to control cookies through their settings. Here&apos;s how
                to access cookie settings in popular browsers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>
                  <strong>Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Options &gt; Privacy & Security &gt; Cookies
                </li>
                <li>
                  <strong>Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data
                </li>
                <li>
                  <strong>Edge:</strong> Settings &gt; Cookies and Site Permissions
                </li>
              </ul>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-yellow-800">
                  <strong>Note:</strong> Disabling cookies may affect the functionality of our website.
                  Some features may not work properly without essential cookies.
                </p>
              </div>
            </section>

            {/* Do Not Track */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Do Not Track</h2>
              <p className="text-gray-700">
                Some browsers have a &quot;Do Not Track&quot; feature. Our website currently does not
                respond to Do Not Track signals, but we respect your privacy choices as described in
                our{' '}
                <Link href="/privacy" className="text-gold hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            {/* Updates to This Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time. We will notify you of any
                significant changes by posting the new policy on this page with a new
                &quot;Last Updated&quot; date.
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-navy mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@chirhoevents.com" className="text-gold hover:underline">
                    privacy@chirhoevents.com
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
                href="/terms"
                className="text-gold hover:underline"
              >
                Terms of Service
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
