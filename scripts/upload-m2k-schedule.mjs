// Script to upload M2K schedule using project's prisma client
// Run with: node scripts/upload-m2k-schedule.mjs

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const M2K_EVENT_ID = 'b9b70d36-ae35-47a0-aeb7-a50df9a598f1'

const scheduleEntries = [
  // Friday, February 7
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '5:00 PM', endTime: '6:30 PM', title: 'Arrival / Registration', location: 'Various', order: 1 },
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '6:30 PM', endTime: null, title: 'ARCC Arena Opens', location: 'ARCC', order: 2 },
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '7:00 PM', endTime: '7:35 PM', title: 'Start of Program - Introductions', location: 'ARCC Arena', order: 3 },
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '7:40 PM', endTime: '8:20 PM', title: 'Keynote 1: Dr. John-Mark Miravalle', location: 'ARCC Arena', order: 4 },
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '8:35 PM', endTime: '9:50 PM', title: 'Holy Mass', location: 'ARCC Arena', order: 5 },
  { day: 'friday', dayDate: new Date('2025-02-07'), startTime: '10:00 PM', endTime: null, title: 'Dismissal', location: null, order: 6 },

  // Saturday, February 8
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '7:40 AM', endTime: '8:40 AM', title: 'On-Campus Breakfast', location: 'Patriot Hall', order: 1 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '8:30 AM', endTime: '9:00 AM', title: 'ARCC Arena Opens', location: 'ARCC', order: 2 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '9:00 AM', endTime: '9:30 AM', title: 'Start of Program', location: 'ARCC Arena', order: 3 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '9:40 AM', endTime: '10:10 AM', title: 'Keynote 2: Patricia Sandoval', location: 'ARCC Arena', order: 4 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '10:10 AM', endTime: '10:25 AM', title: 'Dismissal and Prep for Holy Mass', location: 'ARCC Arena', order: 5 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '10:25 AM', endTime: '11:45 AM', title: 'Holy Mass', location: 'ARCC Arena', order: 6 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '10:25 AM', endTime: '11:45 AM', title: '(Confirmation ONLY) Holy Mass', location: 'JC Chapel', order: 7 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '12:15 PM', endTime: '1:15 PM', title: 'Lunch', location: 'Patriot Hall', order: 8 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '1:30 PM', endTime: '2:30 PM', title: 'Breakout Sessions', location: 'Various', order: 9 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '2:30 PM', endTime: '4:20 PM', title: 'Group Time/Recreation', location: 'Various', order: 10 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '4:20 PM', endTime: '6:40 PM', title: 'Dinner', location: 'Patriot Hall', order: 11 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '6:15 PM', endTime: null, title: 'ARCC Arena Opens', location: 'ARCC', order: 12 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '6:50 PM', endTime: '7:40 PM', title: 'Start of Program', location: 'ARCC Arena', order: 13 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '7:40 PM', endTime: '8:00 PM', title: 'Break', location: 'ARCC Arena', order: 14 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '8:00 PM', endTime: '8:40 PM', title: 'Keynote 3: Archbishop Sample', location: 'ARCC Arena', order: 15 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '8:50 PM', endTime: '9:50 PM', title: 'Eucharistic Adoration', location: 'ARCC Arena', order: 16 },
  { day: 'saturday', dayDate: new Date('2025-02-08'), startTime: '10:00 PM', endTime: null, title: 'Dismissal', location: null, order: 17 },

  // Sunday, February 9
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '7:40 AM', endTime: '8:40 AM', title: 'On-Campus Breakfast', location: 'Patriot Hall', order: 1 },
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '8:30 AM', endTime: '9:00 AM', title: 'ARCC Arena Opens', location: 'ARCC', order: 2 },
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '8:50 AM', endTime: '9:20 AM', title: 'Start of Program', location: 'ARCC Arena', order: 3 },
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '9:25 AM', endTime: '10:05 AM', title: 'Keynote 4: Sr. Catherine Holum', location: 'ARCC Arena', order: 4 },
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '10:40 AM', endTime: '12:10 PM', title: 'Holy Mass', location: 'ARCC Arena', order: 5 },
  { day: 'sunday', dayDate: new Date('2025-02-09'), startTime: '12:20 PM', endTime: null, title: 'Departure', location: 'All Exits', order: 6 },
]

async function main() {
  console.log('Deleting existing schedule entries...')
  await prisma.porosScheduleEntry.deleteMany({
    where: { eventId: M2K_EVENT_ID }
  })

  console.log('Creating new schedule entries...')
  const result = await prisma.porosScheduleEntry.createMany({
    data: scheduleEntries.map(e => ({
      eventId: M2K_EVENT_ID,
      ...e
    }))
  })

  console.log(`Created ${result.count} schedule entries`)

  // Verify
  const count = await prisma.porosScheduleEntry.count({
    where: { eventId: M2K_EVENT_ID }
  })
  console.log(`Total entries in database: ${count}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
