import { requireAdmin } from '@/lib/auth-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon } from 'lucide-react'

export default async function SettingsPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
          Organization Settings
        </h1>
        <p className="text-[#6B7280]">
          Manage settings for {user.organization.name}
        </p>
      </div>

      <Card className="bg-white border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A5F]">Organization Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={user.organization.name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type
              </label>
              <input
                type="text"
                value={user.organization.type}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
              />
            </div>
            <p className="text-sm text-gray-600">
              More settings coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
