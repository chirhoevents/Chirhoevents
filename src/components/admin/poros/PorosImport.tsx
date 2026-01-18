'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  Upload,
  Building2,
  DoorOpen,
  Users,
  UserPlus,
  Utensils,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'

interface PorosImportProps {
  eventId: string
}

// CSV Templates
const TEMPLATES = {
  buildings: {
    name: 'Buildings',
    icon: Building2,
    description: 'Import buildings for housing AND small group meeting locations',
    columns: ['building_name', 'gender', 'housing_type', 'total_floors', 'notes'],
    sampleData: [
      ['Dorm A', 'male', 'general', '3', 'Main male housing'],
      ['Dorm B', 'female', 'general', '3', 'Main female housing'],
      ['Conference Center', 'mixed', 'general', '1', 'Small group meeting rooms'],
    ],
    endpoint: 'buildings',
  },
  rooms: {
    name: 'Rooms',
    icon: DoorOpen,
    description: 'Import housing rooms AND small group meeting rooms. Set room_purpose to distinguish them.',
    columns: ['building_name', 'room_number', 'floor', 'capacity', 'gender', 'room_purpose', 'is_ada_accessible', 'notes'],
    sampleData: [
      ['Dorm A', '101', '1', '4', 'male', 'housing', 'false', 'Dorm room'],
      ['Dorm A', '102', '1', '4', 'male', 'housing', 'true', 'ADA accessible dorm'],
      ['Conference Center', 'Room A', '1', '40', 'mixed', 'small_group', 'false', 'Small group room'],
      ['Conference Center', 'Room B', '1', '40', 'mixed', 'small_group', 'false', 'Small group room'],
    ],
    endpoint: 'rooms',
  },
  groups: {
    name: 'Groups',
    icon: Users,
    description: 'Import youth groups with group codes for check-in',
    columns: ['group_name', 'parish_name', 'group_leader_name', 'group_leader_email', 'group_leader_phone', 'group_code', 'housing_type', 'special_requests'],
    sampleData: [
      ['St. Mary Parish [001]', 'St. Mary Parish', 'John Smith', 'john@stmary.org', '555-123-4567', '1A', 'on_campus', ''],
      ['Holy Family [002]', 'Holy Family Parish', 'Jane Doe', 'jane@holyfamily.org', '555-234-5678', '2B', 'on_campus', 'Need ground floor'],
    ],
    endpoint: 'groups',
  },
  participants: {
    name: 'Participants',
    icon: UserPlus,
    description: 'Import participants with emergency contacts and medical info for Rapha',
    columns: [
      'group_id', 'first_name', 'last_name', 'preferred_name', 'email', 'age', 'gender', 'participant_type', 't_shirt_size', 'parent_email',
      'emergency_contact_1_name', 'emergency_contact_1_phone', 'emergency_contact_1_relation',
      'emergency_contact_2_name', 'emergency_contact_2_phone', 'emergency_contact_2_relation',
      'allergies', 'medications', 'medical_conditions', 'dietary_restrictions'
    ],
    sampleData: [
      ['001', 'Michael', 'Johnson', 'Mike', '', '16', 'male', 'youth', 'M', 'parent@email.com', 'John Johnson', '555-111-2222', 'Father', 'Mary Johnson', '555-111-3333', 'Mother', 'Peanuts', '', '', 'Vegetarian'],
      ['001', 'Sarah', 'Williams', '', '', '15', 'female', 'youth', 'S', 'parent2@email.com', 'Tom Williams', '555-222-3333', 'Father', '', '', '', '', 'Ibuprofen daily', 'Asthma', ''],
      ['001', 'Robert', 'Brown', '', 'robert@email.com', '45', 'male', 'chaperone', 'L', '', 'Jane Brown', '555-333-4444', 'Spouse', '', '', '', '', '', '', ''],
    ],
    endpoint: 'participants',
  },
  staff: {
    name: 'Staff',
    icon: UserCheck,
    description: 'Import seminarians, religious, SGLs, and other staff',
    columns: ['first_name', 'last_name', 'staff_type', 'email', 'phone', 'community', 'notes'],
    sampleData: [
      ['Fr. Thomas', 'Anderson', 'priest', 'fr.thomas@seminary.edu', '555-111-2222', 'Diocese of Dallas', ''],
      ['Br. James', 'Wilson', 'seminarian', 'br.james@seminary.edu', '555-222-3333', 'Mount St. Mary Seminary', 'SGL'],
      ['Sr. Maria', 'Garcia', 'religious', 'sr.maria@sisters.org', '555-333-4444', 'Sisters of Life', ''],
    ],
    endpoint: 'staff',
  },
  mealGroups: {
    name: 'Meal Groups',
    icon: Utensils,
    description: 'Import meal color groups with time assignments',
    columns: ['name', 'color', 'color_hex', 'breakfast_time', 'lunch_time', 'dinner_time', 'display_order'],
    sampleData: [
      ['Red', 'red', '#e74c3c', '7:00 AM', '12:00 PM', '6:00 PM', '1'],
      ['Blue', 'blue', '#3498db', '7:30 AM', '12:30 PM', '6:30 PM', '2'],
      ['Green', 'green', '#27ae60', '8:00 AM', '1:00 PM', '7:00 PM', '3'],
    ],
    endpoint: 'meal-groups',
  },
}

type TemplateKey = keyof typeof TEMPLATES

export function PorosImport({ eventId }: PorosImportProps) {
  const { getToken } = useAuth()
  const [uploading, setUploading] = useState<TemplateKey | null>(null)
  const [results, setResults] = useState<Record<TemplateKey, { success: boolean; message: string } | null>>({
    buildings: null,
    rooms: null,
    groups: null,
    participants: null,
    staff: null,
    mealGroups: null,
  })

  const generateCSV = (templateKey: TemplateKey) => {
    const template = TEMPLATES[templateKey]
    const header = template.columns.join(',')
    const rows = template.sampleData.map(row => row.join(','))
    return [header, ...rows].join('\n')
  }

  const downloadTemplate = (templateKey: TemplateKey) => {
    const template = TEMPLATES[templateKey]
    const csv = generateCSV(templateKey)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateKey}-import-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (templateKey: TemplateKey, file: File) => {
    setUploading(templateKey)
    setResults(prev => ({ ...prev, [templateKey]: null }))

    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('importType', TEMPLATES[templateKey].endpoint)

      // Use the bulk-import endpoint for buildings, rooms, staff, meal-groups
      // Use registrations/import for groups and participants
      const isRegistrationImport = templateKey === 'groups' || templateKey === 'participants'
      const endpoint = isRegistrationImport
        ? `/api/admin/events/${eventId}/registrations/import`
        : `/api/admin/events/${eventId}/poros/bulk-import`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Import failed')
      }

      const successMessage = data.results
        ? `Imported: ${Object.entries(data.results)
            .filter(([k, v]) => typeof v === 'number' && v > 0)
            .map(([k, v]) => `${v} ${k}`)
            .join(', ')}`
        : 'Import completed successfully'

      setResults(prev => ({
        ...prev,
        [templateKey]: { success: true, message: successMessage }
      }))
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [templateKey]: { success: false, message: error.message || 'Import failed' }
      }))
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-navy">Data Import</h2>
        <p className="text-muted-foreground">
          Download CSV templates, fill in your data, and upload to import into the system.
        </p>
      </div>

      {/* Import Order Guide */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommended Import Order:</strong> Buildings → Rooms → Groups → Participants → Staff → Meal Groups.
          Buildings must exist before importing rooms. Groups must exist before importing participants.
        </AlertDescription>
      </Alert>

      {/* Import Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((templateKey) => {
          const template = TEMPLATES[templateKey]
          const Icon = template.icon
          const result = results[templateKey]
          const isUploading = uploading === templateKey

          return (
            <Card key={templateKey} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-navy/10 rounded-lg">
                    <Icon className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Template Download */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => downloadTemplate(templateKey)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>

                {/* File Upload */}
                <div className="relative">
                  <Input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(templateKey, file)
                        e.target.value = '' // Reset input
                      }
                    }}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start bg-navy hover:bg-navy/90 text-white"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV
                      </>
                    )}
                  </Button>
                </div>

                {/* Result Message */}
                {result && (
                  <div className={`text-sm p-2 rounded-md flex items-start gap-2 ${
                    result.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}

                {/* Column Preview */}
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-navy">View columns</summary>
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                    {template.columns.join(', ')}
                  </div>
                </details>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Group Code:</strong> The group_code field (e.g., <code>1A</code>, <code>53B</code>) appears on check-in tables and public pages.</p>
          <p><strong>Room Purpose:</strong> Use <code>housing</code> for dorm rooms, <code>small_group</code> for meeting rooms, or <code>both</code> for dual-purpose rooms.</p>
          <p><strong>Small Group Rooms:</strong> Import meeting rooms through the Rooms import with <code>room_purpose</code> set to <code>small_group</code>. These can be printed for posting.</p>
          <p><strong>Participant Types:</strong> Valid types are: youth, chaperone, priest</p>
          <p><strong>Staff Types:</strong> Valid types are: seminarian, religious, sgl, co_sgl, priest, deacon</p>
          <p><strong>Gender:</strong> Use <code>male</code>, <code>female</code>, or <code>mixed</code> (for rooms/buildings)</p>
          <p><strong>Existing Records:</strong> The system will skip records that already exist (matched by name/identifier).</p>
        </CardContent>
      </Card>
    </div>
  )
}
