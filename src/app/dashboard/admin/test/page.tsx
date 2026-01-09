/**
 * Debug Test Page
 *
 * This is a minimal page with NO auth checks to test if navigation works.
 * If this page loads, navigation is working and the issue is with auth.
 * If this page doesn't load, there's a deeper routing/layout issue.
 */
export default function TestPage() {
  console.log('🧪 [Test Page] Component rendering...')

  return (
    <div className="p-8 bg-green-50 min-h-[400px]">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            Test Page Works!
          </h1>

          <div className="space-y-4">
            <p className="text-gray-700">
              If you can see this page, navigation within the admin layout is working correctly.
            </p>

            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Page:</strong> /dashboard/admin/test
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>What this tells us:</strong>
                <br />
                - The layout&apos;s auth check passed (or you wouldn&apos;t see this)
                <br />
                - Client-side routing is working
                <br />
                - The problem is likely in specific page components, not the layout
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <h2 className="font-semibold text-gray-800">Test Links:</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  <a href="/dashboard/admin" className="text-blue-600 hover:underline">
                    → Dashboard Home
                  </a>
                </li>
                <li>
                  <a href="/dashboard/admin/events" className="text-blue-600 hover:underline">
                    → Events List
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
