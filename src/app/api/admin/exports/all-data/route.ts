import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { generateCSV } from '@/lib/reports/generate-csv'
import { format } from 'date-fns'

export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const organizationId = user.organizationId

    // Fetch organization name
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    // Fetch all events for this organization
    const events = await prisma.event.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
      },
    })

    const eventMap = new Map(events.map((e) => [e.id, e]))

    // Fetch all group registrations
    const groupRegistrations = await prisma.groupRegistration.findMany({
      where: { organizationId },
      include: {
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            participantType: true,
            gender: true,
            dateOfBirth: true,
            allergies: true,
            dietaryRestrictions: true,
            adaAccommodations: true,
            tshirtSize: true,
          },
        },
      },
    })

    // Fetch all individual registrations
    const individualRegistrations = await prisma.individualRegistration.findMany({
      where: { organizationId },
    })

    // Fetch all payment balances
    const paymentBalances = await prisma.paymentBalance.findMany({
      where: { organizationId },
    })

    const paymentBalanceMap = new Map(
      paymentBalances.map((pb) => [pb.registrationId, pb])
    )

    // Fetch all payments
    const payments = await prisma.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch all liability forms
    const liabilityForms = await prisma.liabilityForm.findMany({
      where: { organizationId },
    })

    // Build comprehensive data rows
    const rows: Record<string, any>[] = []

    // Process group registrations and their participants
    for (const group of groupRegistrations) {
      const event = eventMap.get(group.eventId)
      const balance = paymentBalanceMap.get(group.id)

      // Add group leader row
      rows.push({
        'Event Name': event?.name || 'Unknown',
        'Event Dates': event
          ? `${format(new Date(event.startDate), 'MMM d')} - ${format(new Date(event.endDate), 'MMM d, yyyy')}`
          : '',
        'Registration Type': 'Group Leader',
        'Group Name': group.groupName,
        'Parish': group.parishName || '',
        'First Name': group.groupLeaderName.split(' ')[0] || '',
        'Last Name': group.groupLeaderName.split(' ').slice(1).join(' ') || '',
        'Email': group.groupLeaderEmail,
        'Phone': group.groupLeaderPhone || '',
        'Participant Type': 'Group Leader',
        'Gender': '',
        'Date of Birth': '',
        'T-Shirt Size': '',
        'Allergies': '',
        'Dietary Restrictions': '',
        'ADA Accommodations': '',
        'Housing Type': group.housingType || '',
        'Total Participants': group.totalParticipants,
        'Total Amount Due': balance
          ? `$${Number(balance.totalAmountDue).toFixed(2)}`
          : '$0.00',
        'Amount Paid': balance
          ? `$${Number(balance.amountPaid).toFixed(2)}`
          : '$0.00',
        'Balance Remaining': balance
          ? `$${Number(balance.amountRemaining).toFixed(2)}`
          : '$0.00',
        'Payment Status': balance?.paymentStatus || 'pending',
        'Registration Date': format(new Date(group.registeredAt), 'MMM d, yyyy'),
        'Access Code': group.accessCode || '',
      })

      // Add participant rows
      for (const participant of group.participants) {
        const participantForms = liabilityForms.filter(
          (f) => f.participantId === participant.id
        )
        const formsComplete = participantForms.length > 0

        rows.push({
          'Event Name': event?.name || 'Unknown',
          'Event Dates': event
            ? `${format(new Date(event.startDate), 'MMM d')} - ${format(new Date(event.endDate), 'MMM d, yyyy')}`
            : '',
          'Registration Type': 'Group Participant',
          'Group Name': group.groupName,
          'Parish': group.parishName || '',
          'First Name': participant.firstName,
          'Last Name': participant.lastName,
          'Email': '',
          'Phone': '',
          'Participant Type': participant.participantType?.replace(/_/g, ' ') || '',
          'Gender': participant.gender || '',
          'Date of Birth': participant.dateOfBirth
            ? format(new Date(participant.dateOfBirth), 'MMM d, yyyy')
            : '',
          'T-Shirt Size': participant.tshirtSize || '',
          'Allergies': participant.allergies || '',
          'Dietary Restrictions': participant.dietaryRestrictions || '',
          'ADA Accommodations': participant.adaAccommodations || '',
          'Housing Type': group.housingType || '',
          'Total Participants': '',
          'Total Amount Due': '',
          'Amount Paid': '',
          'Balance Remaining': '',
          'Payment Status': '',
          'Registration Date': '',
          'Access Code': '',
          'Forms Complete': formsComplete ? 'Yes' : 'No',
        })
      }
    }

    // Process individual registrations
    for (const individual of individualRegistrations) {
      const event = eventMap.get(individual.eventId)
      const balance = paymentBalanceMap.get(individual.id)
      const individualForms = liabilityForms.filter(
        (f) => f.registrationId === individual.id && f.registrationType === 'individual'
      )
      const formsComplete = individualForms.length > 0

      rows.push({
        'Event Name': event?.name || 'Unknown',
        'Event Dates': event
          ? `${format(new Date(event.startDate), 'MMM d')} - ${format(new Date(event.endDate), 'MMM d, yyyy')}`
          : '',
        'Registration Type': 'Individual',
        'Group Name': '',
        'Parish': '',
        'First Name': individual.firstName,
        'Last Name': individual.lastName,
        'Email': individual.email,
        'Phone': individual.phone || '',
        'Participant Type': individual.participantType?.replace(/_/g, ' ') || '',
        'Gender': individual.gender || '',
        'Date of Birth': individual.dateOfBirth
          ? format(new Date(individual.dateOfBirth), 'MMM d, yyyy')
          : '',
        'T-Shirt Size': individual.tshirtSize || '',
        'Allergies': individual.allergies || '',
        'Dietary Restrictions': individual.dietaryRestrictions || '',
        'ADA Accommodations': individual.adaAccommodations || '',
        'Housing Type': individual.housingType || '',
        'Total Participants': 1,
        'Total Amount Due': balance
          ? `$${Number(balance.totalAmountDue).toFixed(2)}`
          : '$0.00',
        'Amount Paid': balance
          ? `$${Number(balance.amountPaid).toFixed(2)}`
          : '$0.00',
        'Balance Remaining': balance
          ? `$${Number(balance.amountRemaining).toFixed(2)}`
          : '$0.00',
        'Payment Status': balance?.paymentStatus || 'pending',
        'Registration Date': format(new Date(individual.registeredAt), 'MMM d, yyyy'),
        'Access Code': '',
        'Forms Complete': formsComplete ? 'Yes' : 'No',
      })
    }

    // Generate CSV
    const headers = [
      'Event Name',
      'Event Dates',
      'Registration Type',
      'Group Name',
      'Parish',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Participant Type',
      'Gender',
      'Date of Birth',
      'T-Shirt Size',
      'Allergies',
      'Dietary Restrictions',
      'ADA Accommodations',
      'Housing Type',
      'Total Participants',
      'Total Amount Due',
      'Amount Paid',
      'Balance Remaining',
      'Payment Status',
      'Registration Date',
      'Access Code',
      'Forms Complete',
    ]

    const csv = generateCSV(rows, headers)

    // Generate filename
    const orgName = organization?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'organization'
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const filename = `${orgName}-complete-data-${dateStr}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting all data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
