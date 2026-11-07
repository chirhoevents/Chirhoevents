// Group directory on the public Poros portal: a searchable list of every
// group with its group number, meal color, small group leader/room and
// housing. Built for Mount 2000 2027, where a group number can be shared by
// two registrations that come as one group, so it is only switched on for
// the events listed here.
//
// Safe to import from client components (no server-only imports).

export const GROUP_DIRECTORY_EVENT_IDS: readonly string[] = [
  '8c7aaf89-6790-4a81-bf6b-33e8dd8586f1', // Mount 2000 Youth Retreat 2027
]

export function isGroupDirectoryEvent(eventId: string): boolean {
  return GROUP_DIRECTORY_EVENT_IDS.includes(eventId)
}

// Matches the group_code column (VARCHAR(10))
export const GROUP_NUMBER_MAX_LENGTH = 10

export interface DirectoryMeal {
  name: string
  colorHex: string | null
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  sundayBreakfast: string | null
}

export interface DirectoryGroup {
  id: string
  groupNumber: string | null
  name: string
  leader: string
  people: number
  offCampus: boolean
  dayPass: boolean
  meal: DirectoryMeal | null
  sgl: string[]
  religious: string[]
  smallGroupRoom: string | null
  maleRooms: string[]
  femaleRooms: string[]
  otherRooms: string[]
}
