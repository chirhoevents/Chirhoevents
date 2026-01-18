import { NextRequest, NextResponse } from 'next/server'
import { verifyEventAccess } from '@/lib/api-auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// Generate a unique access code for group registrations
function generateAccessCode(eventSlug: string): string {
  const code = nanoid(8).toUpperCase()
  return `${eventSlug.substring(0, 6).toUpperCase()}-${code}`
}

// Parse CSV text handling quoted fields
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const headers = parseRow(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    if (values.length === 0 || (values.length === 1 && !values[0])) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.toLowerCase().replace(/ /g, '_')] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers: headers.map(h => h.toLowerCase().replace(/ /g, '_')), rows }
}

// POST /api/admin/events/[eventId]/registrations/import
// Import groups and/or participants from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { error, user, event } = await verifyEventAccess(request, eventId, {
      requireAdmin: true,
      logPrefix: '[Registrations Import]',
    })
    if (error) return error
    if (!hasPermission(user!.role, 'poros.access')) {
      return NextResponse.json(
        { message: 'Forbidden - Registration import access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const importType = formData.get('importType') as string // 'groups', 'participants', or 'both'
    const groupsFile = formData.get('groupsFile') as File | null
    const participantsFile = formData.get('participantsFile') as File | null

    const results = {
      groupsCreated: 0,
      groupsUpdated: 0,
      participantsCreated: 0,
      participantsUpdated: 0,
      staffCreated: 0,
      smallGroupAssignments: 0,
      mealGroupAssignments: 0,
      errors: [] as string[],
      detectedHeaders: [] as string[],
      debugFirstRow: null as any,
    }

    // Cache for staff and assignment lookups
    const staffCache = new Map<string, string>() // name -> id
    const smallGroupCache = new Map<string, string>() // meeting place -> id
    const mealGroupCache = new Map<string, string>() // color name -> id

    // Import groups
    if ((importType === 'groups' || importType === 'both') && groupsFile) {
      const text = await groupsFile.text()
      const { headers, rows } = parseCSV(text)

      // Debug: log headers found
      console.log('[Groups Import] CSV headers found:', headers)
      console.log('[Groups Import] Number of rows:', rows.length)
      results.detectedHeaders = headers

      // Capture first row for debugging - check multiple column name variations
      if (rows.length > 0) {
        const r = rows[0]
        results.debugFirstRow = {
          raw: r,
          parsed: {
            group_id: r.group_id,
            parish_name: r.parish_name,
            total_participants: r.total_participants || r.totalparticipants || r.total || r.participants || r.count,
            fully_paid: r.fully_paid || r.fullypaid || r.paid,
            amount_owed: r.amount_owed || r.amountowed || r.owed || r.balance || r.amount,
          }
        }
      }

      // Required columns for groups
      const requiredColumns = ['group_id', 'parish_name', 'leader_name', 'leader_email', 'leader_phone']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `Groups CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      for (const row of rows) {
        try {
          const groupExternalId = row.group_id?.trim()
          if (!groupExternalId) {
            results.errors.push(`Skipping row with empty group_id`)
            continue
          }

          // Check if group already exists (by groupName matching the external ID pattern)
          const existingGroup = await prisma.groupRegistration.findFirst({
            where: {
              eventId,
              groupName: { contains: `[${groupExternalId}]` }
            }
          })

          // Get total participants from CSV - try multiple column name variations
          const totalParticipantsRaw = row.total_participants || row.totalparticipants || row.total || row.participants || row.count || '0'
          const totalParticipants = parseInt(totalParticipantsRaw) || 0

          // Parse payment info - try multiple column name variations
          const fullyPaidRaw = (row.fully_paid || row.fullypaid || row.paid || 'yes').toLowerCase()
          const isFullyPaid = fullyPaidRaw === 'yes' || fullyPaidRaw === 'true' || fullyPaidRaw === '1' || fullyPaidRaw === 'y'
          const amountOwedRaw = row.amount_owed || row.amountowed || row.owed || row.balance || row.amount || '0'
          const amountOwed = parseFloat(amountOwedRaw) || 0

          // Debug logging
          console.log(`[Groups Import] Row data:`, {
            group_id: groupExternalId,
            parish_name: row.parish_name,
            total_participants: totalParticipantsRaw,
            fully_paid: fullyPaidRaw,
            amount_owed: amountOwedRaw,
            parsed: { totalParticipants, isFullyPaid, amountOwed }
          })

          const housingTypeRaw = (row.housing_type || 'on_campus').toLowerCase().replace(/ /g, '_')
          const housingType = ['on_campus', 'off_campus', 'day_pass'].includes(housingTypeRaw)
            ? housingTypeRaw
            : 'on_campus'

          const groupData = {
            eventId,
            organizationId: event!.organizationId,
            groupName: `${row.parish_name} [${groupExternalId}]`,
            groupCode: row.group_code?.trim() || null, // Check-in table code like "53B"
            parishName: row.parish_name || null,
            dioceseName: row.diocese_name || null,
            groupLeaderName: row.leader_name,
            groupLeaderEmail: row.leader_email,
            groupLeaderPhone: row.leader_phone,
            youthCount: 0, // Will be calculated from participants import
            chaperoneCount: 0,
            priestCount: 0,
            totalParticipants,
            housingType: housingType as any,
            specialRequests: row.special_requests || null,
            adaAccommodationsSummary: row.ada_summary || null,
            registrationStatus: 'complete' as const,
          }

          let groupId: string

          if (existingGroup) {
            await prisma.groupRegistration.update({
              where: { id: existingGroup.id },
              data: groupData
            })
            groupId = existingGroup.id
            results.groupsUpdated++
          } else {
            const newGroup = await prisma.groupRegistration.create({
              data: {
                ...groupData,
                accessCode: generateAccessCode(event!.name.substring(0, 6) || 'EVT'),
              }
            })
            groupId = newGroup.id
            results.groupsCreated++
          }

          // Create/update PaymentBalance for check-in payment tracking
          if (amountOwed > 0 || !isFullyPaid) {
            const existingBalance = await prisma.paymentBalance.findFirst({
              where: { registrationId: groupId }
            })

            const paymentBalanceData = {
              organizationId: event!.organizationId,
              eventId,
              registrationId: groupId,
              registrationType: 'group' as const,
              totalAmountDue: amountOwed,
              amountPaid: 0,
              amountRemaining: amountOwed,
              paymentStatus: amountOwed > 0 ? 'partial' as const : 'unpaid' as const,
            }

            if (existingBalance) {
              await prisma.paymentBalance.update({
                where: { id: existingBalance.id },
                data: {
                  amountRemaining: amountOwed,
                  paymentStatus: amountOwed > 0 ? 'partial' : 'unpaid',
                }
              })
            } else {
              await prisma.paymentBalance.create({
                data: paymentBalanceData
              })
            }
          } else {
            // Mark as fully paid
            const existingBalance = await prisma.paymentBalance.findFirst({
              where: { registrationId: groupId }
            })

            if (existingBalance) {
              await prisma.paymentBalance.update({
                where: { id: existingBalance.id },
                data: {
                  amountRemaining: 0,
                  paymentStatus: 'paid_full',
                }
              })
            } else {
              await prisma.paymentBalance.create({
                data: {
                  organizationId: event!.organizationId,
                  eventId,
                  registrationId: groupId,
                  registrationType: 'group' as const,
                  totalAmountDue: 0,
                  amountPaid: 0,
                  amountRemaining: 0,
                  paymentStatus: 'paid_full' as const,
                }
              })
            }
          }

          // Handle Seminarian SGL assignment
          if (row.seminarian_sgl?.trim()) {
            const sglName = row.seminarian_sgl.trim()
            let sglId = staffCache.get(sglName)

            if (!sglId) {
              // Check if staff member exists
              const nameParts = sglName.replace(/^Seminarian\s+/i, '').split(' ')
              const firstName = nameParts[0] || sglName
              const lastName = nameParts.slice(1).join(' ') || ''

              let staff = await prisma.porosStaff.findFirst({
                where: {
                  eventId,
                  firstName: { contains: firstName, mode: 'insensitive' },
                  lastName: lastName ? { contains: lastName, mode: 'insensitive' } : undefined,
                  staffType: { in: ['sgl', 'seminarian'] }
                }
              })

              if (!staff) {
                staff = await prisma.porosStaff.create({
                  data: {
                    eventId,
                    firstName,
                    lastName,
                    staffType: 'seminarian',
                  }
                })
                results.staffCreated++
              }
              sglId = staff.id
              staffCache.set(sglName, sglId)
            }
          }

          // Handle Religious assignment
          if (row.religious?.trim()) {
            const religiousName = row.religious.trim()
            let religiousId = staffCache.get(religiousName)

            if (!religiousId) {
              // Check if staff member exists
              const nameParts = religiousName.replace(/^(Sr\.|Sister|Br\.|Brother)\s+/i, '').split(' ')
              const firstName = nameParts[0] || religiousName
              const lastName = nameParts.slice(1).join(' ') || ''

              let staff = await prisma.porosStaff.findFirst({
                where: {
                  eventId,
                  firstName: { contains: firstName, mode: 'insensitive' },
                  lastName: lastName ? { contains: lastName, mode: 'insensitive' } : undefined,
                  staffType: 'religious'
                }
              })

              if (!staff) {
                staff = await prisma.porosStaff.create({
                  data: {
                    eventId,
                    firstName,
                    lastName,
                    staffType: 'religious',
                  }
                })
                results.staffCreated++
              }
              religiousId = staff.id
              staffCache.set(religiousName, religiousId)
            }
          }

          // Handle Small Group Location assignment
          // Store SGL and Religious IDs to link to small group
          let linkedSglId: string | null = null
          let linkedReligiousId: string | null = null

          // Get SGL ID if we created/found one
          if (row.seminarian_sgl?.trim()) {
            linkedSglId = staffCache.get(row.seminarian_sgl.trim()) || null
          }

          // Get Religious ID if we created/found one
          if (row.religious?.trim()) {
            linkedReligiousId = staffCache.get(row.religious.trim()) || null
          }

          if (row.small_group_location?.trim()) {
            const meetingPlace = row.small_group_location.trim()
            let smallGroupId = smallGroupCache.get(meetingPlace)

            if (!smallGroupId) {
              // Find or create small group by meeting place
              let smallGroup = await prisma.smallGroup.findFirst({
                where: {
                  eventId,
                  meetingPlace: { contains: meetingPlace, mode: 'insensitive' }
                },
                select: { id: true, sglId: true, coSglId: true }
              })

              if (!smallGroup) {
                smallGroup = await prisma.smallGroup.create({
                  data: {
                    eventId,
                    name: meetingPlace,
                    meetingPlace,
                    sglId: linkedSglId,
                    coSglId: linkedReligiousId,
                  }
                })
              } else if (linkedSglId || linkedReligiousId) {
                // Update existing small group with SGL/religious if provided
                await prisma.smallGroup.update({
                  where: { id: smallGroup.id },
                  data: {
                    ...(linkedSglId && !smallGroup.sglId ? { sglId: linkedSglId } : {}),
                    ...(linkedReligiousId && !smallGroup.coSglId ? { coSglId: linkedReligiousId } : {}),
                  }
                })
              }
              smallGroupId = smallGroup.id
              smallGroupCache.set(meetingPlace, smallGroupId)
            }

            // Create assignment if not exists
            const existingAssignment = await prisma.smallGroupAssignment.findFirst({
              where: {
                smallGroupId,
                groupRegistrationId: groupId
              }
            })

            if (!existingAssignment) {
              await prisma.smallGroupAssignment.create({
                data: {
                  smallGroupId,
                  groupRegistrationId: groupId
                }
              })
              results.smallGroupAssignments++
            }
          }

          // Handle Meal Color assignment
          if (row.meal_color?.trim()) {
            const colorName = row.meal_color.trim()
            let mealGroupId = mealGroupCache.get(colorName.toLowerCase())

            if (!mealGroupId) {
              // Find or create meal group by color name
              let mealGroup = await prisma.mealGroup.findFirst({
                where: {
                  eventId,
                  name: { equals: colorName, mode: 'insensitive' }
                }
              })

              if (!mealGroup) {
                // Create with default color hex
                const colorHexMap: Record<string, string> = {
                  'red': '#e74c3c',
                  'blue': '#3498db',
                  'green': '#27ae60',
                  'yellow': '#f1c40f',
                  'orange': '#e67e22',
                  'purple': '#9b59b6',
                  'pink': '#e83e8c',
                  'brown': '#8b4513',
                  'grey': '#95a5a6',
                  'gray': '#95a5a6',
                  'black': '#343a40',
                  'white': '#f8f9fa',
                }
                const colorHex = colorHexMap[colorName.toLowerCase()] || '#3498db'

                mealGroup = await prisma.mealGroup.create({
                  data: {
                    eventId,
                    name: colorName,
                    color: colorName.toLowerCase(),
                    colorHex,
                    isActive: true
                  }
                })
              }
              mealGroupId = mealGroup.id
              mealGroupCache.set(colorName.toLowerCase(), mealGroupId)
            }

            // Create assignment if not exists
            const existingMealAssignment = await prisma.mealGroupAssignment.findFirst({
              where: {
                mealGroupId,
                groupRegistrationId: groupId
              }
            })

            if (!existingMealAssignment) {
              await prisma.mealGroupAssignment.create({
                data: {
                  mealGroupId,
                  groupRegistrationId: groupId
                }
              })
              results.mealGroupAssignments++
            }
          }
        } catch (err: any) {
          results.errors.push(`Error importing group ${row.group_id}: ${err.message}`)
        }
      }
    }

    // Import participants
    if ((importType === 'participants' || importType === 'both') && participantsFile) {
      const text = await participantsFile.text()
      const { headers, rows } = parseCSV(text)

      // Required columns for participants
      const requiredColumns = ['group_id', 'first_name', 'last_name', 'age', 'gender', 'participant_type']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      if (missingColumns.length > 0) {
        return NextResponse.json({
          error: `Participants CSV missing required columns: ${missingColumns.join(', ')}`
        }, { status: 400 })
      }

      // Get all groups for this event for lookup
      const groups = await prisma.groupRegistration.findMany({
        where: { eventId },
        select: { id: true, groupName: true }
      })

      // Create a lookup map by external group ID (handle various formats)
      const groupMap = new Map<string, string>()
      for (const group of groups) {
        // Extract [groupId] from groupName like "Parish Name [123]"
        const match = group.groupName.match(/\[([^\]]+)\]$/)
        if (match) {
          const extractedId = match[1].trim()
          groupMap.set(extractedId, group.id)
          // Also add without leading zeros for flexibility (e.g., "001" also matches "1")
          const numericId = parseInt(extractedId, 10)
          if (!isNaN(numericId)) {
            groupMap.set(String(numericId), group.id)
          }
        }
      }

      // Debug: log available groups
      console.log('[Participant Import] Available groups:', Array.from(groupMap.keys()))

      for (const row of rows) {
        try {
          const groupExternalId = row.group_id?.trim()
          // Try exact match first, then try as number
          let groupId = groupMap.get(groupExternalId)
          if (!groupId) {
            const numericId = parseInt(groupExternalId, 10)
            if (!isNaN(numericId)) {
              groupId = groupMap.get(String(numericId))
            }
          }

          if (!groupId) {
            results.errors.push(`Group not found for participant ${row.first_name} ${row.last_name} (group_id: "${groupExternalId}"). Available: ${Array.from(groupMap.keys()).slice(0, 5).join(', ')}`)
            continue
          }

          const age = parseInt(row.age || '0') || 0
          const genderRaw = (row.gender || '').toLowerCase()
          const gender = genderRaw === 'male' || genderRaw === 'm' ? 'male' : 'female'

          const participantTypeRaw = (row.participant_type || 'youth').toLowerCase()
          let participantType: 'youth_u18' | 'youth_o18' | 'chaperone' | 'priest' = 'youth_u18'
          if (participantTypeRaw.includes('chaperone')) participantType = 'chaperone'
          else if (participantTypeRaw.includes('priest') || participantTypeRaw.includes('clergy') || participantTypeRaw.includes('religious')) participantType = 'priest'
          else if (participantTypeRaw.includes('youth')) {
            participantType = age >= 18 ? 'youth_o18' : 'youth_u18'
          }

          // Check for existing participant (by name and group)
          const existingParticipant = await prisma.participant.findFirst({
            where: {
              groupRegistrationId: groupId,
              firstName: row.first_name,
              lastName: row.last_name,
            }
          })

          // Check if we have medical/emergency info
          const hasMedicalInfo = row.emergency_contact_1_name || row.allergies || row.medications || row.medical_conditions || row.ada_requirements

          const participantData = {
            groupRegistrationId: groupId,
            organizationId: event!.organizationId,
            firstName: row.first_name,
            lastName: row.last_name,
            preferredName: row.preferred_name || null,
            email: row.email || null,
            age,
            gender: gender as any,
            participantType: participantType as any,
            tShirtSize: row.t_shirt_size || null,
            parentEmail: row.parent_email || null,
            liabilityFormCompleted: hasMedicalInfo ? true : false,
          }

          let participantId: string

          if (existingParticipant) {
            await prisma.participant.update({
              where: { id: existingParticipant.id },
              data: participantData
            })
            participantId = existingParticipant.id
            results.participantsUpdated++
          } else {
            const newParticipant = await prisma.participant.create({
              data: participantData
            })
            participantId = newParticipant.id
            results.participantsCreated++
          }

          // Create liability form with medical info if we have any
          if (hasMedicalInfo) {
            // Check if liability form already exists
            const existingForm = await prisma.liabilityForm.findFirst({
              where: { participantId }
            })

            const liabilityFormData = {
              organizationId: event!.organizationId,
              participantId,
              eventId,
              formType: (participantType === 'priest' ? 'clergy' : (participantType === 'chaperone' || age >= 18) ? 'youth_o18_chaperone' : 'youth_u18') as any,
              participantType: participantType as any,
              participantFirstName: row.first_name,
              participantLastName: row.last_name,
              participantPreferredName: row.preferred_name || null,
              participantAge: age,
              participantGender: gender as any,
              participantEmail: row.email || null,
              parentEmail: row.parent_email || null,
              emergencyContact1Name: row.emergency_contact_1_name || '',
              emergencyContact1Phone: row.emergency_contact_1_phone || '',
              emergencyContact1Relation: row.emergency_contact_1_relation || null,
              emergencyContact2Name: row.emergency_contact_2_name || null,
              emergencyContact2Phone: row.emergency_contact_2_phone || null,
              emergencyContact2Relation: row.emergency_contact_2_relation || null,
              allergies: row.allergies || null,
              medications: row.medications || null,
              medicalConditions: row.medical_conditions || null,
              dietaryRestrictions: row.dietary_restrictions || null,
              adaAccommodations: row.ada_requirements || null,
              signatureData: { imported: true, importedAt: new Date().toISOString() },
              completed: true,
              completedAt: new Date(),
              formStatus: 'approved',
            }

            if (existingForm) {
              await prisma.liabilityForm.update({
                where: { id: existingForm.id },
                data: liabilityFormData
              })
            } else {
              await prisma.liabilityForm.create({
                data: liabilityFormData
              })
            }
          }
        } catch (err: any) {
          results.errors.push(`Error importing participant ${row.first_name} ${row.last_name}: ${err.message}`)
        }
      }

      // Update group counts based on actual participants
      const groupsToUpdate = await prisma.groupRegistration.findMany({
        where: { eventId },
        include: {
          participants: {
            select: { participantType: true }
          }
        }
      })

      for (const group of groupsToUpdate) {
        const youthCount = group.participants.filter(p => p.participantType === 'youth_u18' || p.participantType === 'youth_o18').length
        const chaperoneCount = group.participants.filter(p => p.participantType === 'chaperone').length
        const priestCount = group.participants.filter(p => p.participantType === 'priest').length

        await prisma.groupRegistration.update({
          where: { id: group.id },
          data: {
            youthCount,
            chaperoneCount,
            priestCount,
            totalParticipants: youthCount + chaperoneCount + priestCount
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Import completed. Groups: ${results.groupsCreated} created, ${results.groupsUpdated} updated. Participants: ${results.participantsCreated} created, ${results.participantsUpdated} updated. Staff: ${results.staffCreated} created. Small group assignments: ${results.smallGroupAssignments}. Meal group assignments: ${results.mealGroupAssignments}.`
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Import failed. Please check your CSV format and try again.',
      details: error.message
    }, { status: 500 })
  }
}

// GET - Download import template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('template') || 'groups'

  if (templateType === 'groups') {
    const csv = `group_id,group_code,parish_name,diocese_name,leader_name,leader_email,leader_phone,male_youth,female_youth,male_chaperones,female_chaperones,priests,housing_type,special_requests,ada_summary
1,53B,St. Mary's Parish,Diocese of Arlington,John Smith,john.smith@example.com,555-123-4567,5,6,2,2,1,on_campus,Need early check-in,Wheelchair access needed
2,54A,Holy Family Church,Archdiocese of Baltimore,Jane Doe,jane.doe@example.com,555-987-6543,8,7,3,2,0,off_campus,,
3,55C,Sacred Heart Parish,Diocese of Richmond,Bob Johnson,bob.j@example.com,555-456-7890,4,5,1,2,1,on_campus,Late arrival Friday,`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="groups-import-template.csv"'
      }
    })
  } else if (templateType === 'participants') {
    const csv = `group_id,first_name,last_name,preferred_name,age,gender,participant_type,email,parent_email,t_shirt_size
1,Michael,Williams,,16,male,youth,,,M
1,Sarah,Brown,,15,female,youth,,,S
1,James,Wilson,,45,male,chaperone,james.w@example.com,,XL
1,Fr. Thomas,Moore,,55,male,priest,fr.thomas@example.com,,L`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="participants-import-template.csv"'
      }
    })
  }

  return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
}
