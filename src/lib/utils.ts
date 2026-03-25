import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date-only string (from @db.Date fields) as a local date.
 * Using new Date("YYYY-MM-DD") treats the string as UTC midnight, which shifts
 * the displayed date backward by one day in negative-offset timezones (e.g. ET).
 * This function avoids that by constructing the Date in local time.
 */
export function parseDateOnly(dateStr: string): Date {
  const datePart = dateStr.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day)
}
