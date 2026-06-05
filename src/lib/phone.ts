import { parsePhoneNumberFromString } from "libphonenumber-js"

export interface NormalizedPhone {
  display: string
  e164: string
}

export function normalizePhoneNumber(
  rawPhoneNumber: string,
  defaultCountry: string
): NormalizedPhone | null {
  const trimmedPhoneNumber = rawPhoneNumber.trim()

  if (!trimmedPhoneNumber) return null

  const phoneNumber = parsePhoneNumberFromString(
    trimmedPhoneNumber,
    defaultCountry.toUpperCase()
  )

  if (!phoneNumber?.isValid()) return null

  return {
    display: phoneNumber.formatInternational(),
    e164: phoneNumber.number,
  }
}
