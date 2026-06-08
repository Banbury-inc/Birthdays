import { Capacitor } from "@capacitor/core"
import { CapacitorContacts } from "@capgo/capacitor-contacts"

import { appConfig } from "@/config/app-config"
import type { ContactUpload } from "@/services/api-service"
import { normalizePhoneNumber } from "@/lib/phone"

export async function importDeviceContacts(): Promise<ContactUpload[]> {
  if (!Capacitor.isNativePlatform()) return []

  const permission = await CapacitorContacts.requestPermissions({
    permissions: ["readContacts"],
  })

  const readState = permission.readContacts
  if (readState !== "granted" && readState !== "limited") {
    throw new Error("Contacts permission is required to find friends.")
  }

  const result = await CapacitorContacts.getContacts({
    fields: ["fullName", "phoneNumbers"],
  })

  const contactsByPhoneNumber = new Map<string, ContactUpload>()

  for (const contact of result.contacts) {
    const displayName = contact.fullName?.trim() || "Contact"

    for (const phone of contact.phoneNumbers ?? []) {
      if (!phone.value) continue

      const normalizedPhone = normalizePhoneNumber(
        phone.value,
        appConfig.defaultCountry
      )

      if (!normalizedPhone) continue

      contactsByPhoneNumber.set(normalizedPhone.e164, {
        displayName,
        phoneNumber: normalizedPhone.e164,
      })
    }
  }

  return Array.from(contactsByPhoneNumber.values())
}
