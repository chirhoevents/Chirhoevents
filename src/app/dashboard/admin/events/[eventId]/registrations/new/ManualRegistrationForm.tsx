'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Users, User } from 'lucide-react'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  pricing: {
    youthRegularPrice: number
    chaperoneRegularPrice: number
    onCampusYouthPrice?: number | null
    offCampusYouthPrice?: number | null
    dayPassYouthPrice?: number | null
    onCampusChaperonePrice?: number | null
    offCampusChaperonePrice?: number | null
    dayPassChaperonePrice?: number | null
  } | null
}

interface ManualRegistrationFormProps {
  event: Event
  organizationId: string
}

export default function ManualRegistrationForm({
  event,
  organizationId,
}: ManualRegistrationFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [registrationType, setRegistrationType] = useState<'individual' | 'group'>('individual')

  const [formData, setFormData] = useState({
    // Individual fields
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    housingType: 'on_campus',
    roomType: 'double',
    preferredRoommate: '',
    tShirtSize: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact1Relation: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    emergencyContact2Relation: '',

    // Group fields
    groupName: '',
    parishName: '',
    groupLeaderName: '',
    groupLeaderEmail: '',
    groupLeaderPhone: '',
    alternativeContact1Name: '',
    alternativeContact1Email: '',
    alternativeContact1Phone: '',
    youthCount: '',
    chaperoneCount: '',
    priestCount: '',

    // Shared
    street: '',
    city: '',
    state: '',
    zip: '',
    dietaryRestrictions: '',
    adaAccommodations: '',
    specialRequests: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/registrations/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          organizationId,
          registrationType,
          ...formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create registration')
      }

      const result = await response.json()
      router.push(`/dashboard/admin/events/${event.id}/registrations`)
    } catch (error) {
      console.error('Error creating manual registration:', error)
      alert('Failed to create registration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/dashboard/admin/events/${event.id}/registrations`}
              className="inline-flex items-center text-sm text-[#9C8466] hover:underline mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Registrations
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Manual Registration
            </h1>
            <p className="text-gray-600 mt-2">{event.name}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Registration Type Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Registration Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={registrationType === 'individual' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('individual')}
                    className={registrationType === 'individual' ? 'bg-[#9C8466] hover:bg-[#8a7559]' : ''}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Individual
                  </Button>
                  <Button
                    type="button"
                    variant={registrationType === 'group' ? 'default' : 'outline'}
                    onClick={() => setRegistrationType('group')}
                    className={registrationType === 'group' ? 'bg-[#9C8466] hover:bg-[#8a7559]' : ''}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Group
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Individual Registration Fields */}
            {registrationType === 'individual' && (
              <>
                {/* Personal Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <p className="text-sm text-gray-600">All fields are optional</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Preferred Name</Label>
                      <Input
                        value={formData.preferredName}
                        onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Street Address</Label>
                      <Input
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          maxLength={2}
                          placeholder="OK"
                        />
                      </div>
                      <div>
                        <Label>ZIP</Label>
                        <Input
                          value={formData.zip}
                          onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Age</Label>
                        <Input
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Gender</Label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <Label>T-Shirt Size</Label>
                        <select
                          value={formData.tShirtSize}
                          onChange={(e) => setFormData({ ...formData, tShirtSize: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select...</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="2XL">2XL</option>
                          <option value="3XL">3XL</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Housing & Room Preferences */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Housing & Room Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Housing Type</Label>
                        <select
                          value={formData.housingType}
                          onChange={(e) => setFormData({ ...formData, housingType: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="on_campus">On Campus</option>
                          <option value="off_campus">Off Campus</option>
                          <option value="day_pass">Day Pass</option>
                        </select>
                      </div>
                      {formData.housingType === 'on_campus' && (
                        <div>
                          <Label>Room Type</Label>
                          <select
                            value={formData.roomType}
                            onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="single">Single Room</option>
                            <option value="double">Double Room</option>
                            <option value="triple">Triple Room</option>
                            <option value="quad">Quad Room</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {formData.housingType === 'on_campus' && (
                      <div>
                        <Label>Preferred Roommate</Label>
                        <Input
                          value={formData.preferredRoommate}
                          onChange={(e) => setFormData({ ...formData, preferredRoommate: e.target.value })}
                          placeholder="Optional - enter name if they want to room with someone"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dietary & Accommodations */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Dietary Restrictions & Accommodations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Dietary Restrictions</Label>
                      <Textarea
                        value={formData.dietaryRestrictions}
                        onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                        placeholder="Vegetarian, gluten-free, allergies, etc."
                      />
                    </div>

                    <div>
                      <Label>ADA Accommodations</Label>
                      <Textarea
                        value={formData.adaAccommodations}
                        onChange={(e) => setFormData({ ...formData, adaAccommodations: e.target.value })}
                        placeholder="Wheelchair accessible, hearing assistance, etc."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contacts */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Primary Emergency Contact */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Primary Contact</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={formData.emergencyContact1Name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={formData.emergencyContact1Phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Relation</Label>
                          <Input
                            value={formData.emergencyContact1Relation}
                            onChange={(e) => setFormData({ ...formData, emergencyContact1Relation: e.target.value })}
                            placeholder="Mother, Father, etc."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary Emergency Contact */}
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-sm">Secondary Contact (Optional)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={formData.emergencyContact2Name}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={formData.emergencyContact2Phone}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Relation</Label>
                          <Input
                            value={formData.emergencyContact2Relation}
                            onChange={(e) => setFormData({ ...formData, emergencyContact2Relation: e.target.value })}
                            placeholder="Mother, Father, etc."
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Group Registration Fields */}
            {registrationType === 'group' && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Group Information</CardTitle>
                  <p className="text-sm text-gray-600">All fields are optional</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Group Name</Label>
                      <Input
                        value={formData.groupName}
                        onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Parish Name</Label>
                      <Input
                        value={formData.parishName}
                        onChange={(e) => setFormData({ ...formData, parishName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Group Leader Name</Label>
                      <Input
                        value={formData.groupLeaderName}
                        onChange={(e) => setFormData({ ...formData, groupLeaderName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Leader Email</Label>
                      <Input
                        type="email"
                        value={formData.groupLeaderEmail}
                        onChange={(e) => setFormData({ ...formData, groupLeaderEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Leader Phone</Label>
                      <Input
                        value={formData.groupLeaderPhone}
                        onChange={(e) => setFormData({ ...formData, groupLeaderPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Group leader's address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        maxLength={2}
                        placeholder="CA"
                      />
                    </div>
                    <div>
                      <Label>ZIP</Label>
                      <Input
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Alternative Contact</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Contact Name</Label>
                        <Input
                          value={formData.alternativeContact1Name}
                          onChange={(e) => setFormData({ ...formData, alternativeContact1Name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Contact Email</Label>
                        <Input
                          type="email"
                          value={formData.alternativeContact1Email}
                          onChange={(e) => setFormData({ ...formData, alternativeContact1Email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Contact Phone</Label>
                        <Input
                          value={formData.alternativeContact1Phone}
                          onChange={(e) => setFormData({ ...formData, alternativeContact1Phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Expected Participants</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Youth Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.youthCount}
                          onChange={(e) => setFormData({ ...formData, youthCount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Chaperone Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.chaperoneCount}
                          onChange={(e) => setFormData({ ...formData, chaperoneCount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Priest Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.priestCount}
                          onChange={(e) => setFormData({ ...formData, priestCount: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Housing Type</Label>
                    <select
                      value={formData.housingType}
                      onChange={(e) => setFormData({ ...formData, housingType: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="on_campus">On Campus</option>
                      <option value="off_campus">Off Campus</option>
                      <option value="day_pass">Day Pass</option>
                    </select>
                  </div>

                  <div>
                    <Label>Special Requests</Label>
                    <Textarea
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#9C8466] hover:bg-[#8a7559]"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Creating...' : 'Create Registration'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
