import {
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js"

export interface NormalizedPhone {
  display: string
  e164: string
}

export function normalizePhoneNumber(
  rawPhoneNumber: string,
  defaultCountry: string
): NormalizedPhone | null {
  const trimmedPhoneNumber = rawPhoneNumber.trim()
  const defaultCountryCode = defaultCountry.toUpperCase()

  if (!trimmedPhoneNumber) return null
  if (!isSupportedCountry(defaultCountryCode)) return null

  const phoneNumber = parsePhoneNumberFromString(
    trimmedPhoneNumber,
    defaultCountryCode
  )

  if (!phoneNumber?.isValid()) return null

  return {
    display: phoneNumber.formatInternational(),
    e164: phoneNumber.number,
  }
}
