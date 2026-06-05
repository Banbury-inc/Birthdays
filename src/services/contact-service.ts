import { Capacitor } from "@capacitor/core"
import { Contacts } from "@capacitor-community/contacts"

import { appConfig } from "@/config/app-config"
import type { ContactUpload } from "@/services/api-service"
import { normalizePhoneNumber } from "@/lib/phone"

interface DeviceContactPhone {
  number: string | null
}

interface DeviceContact {
  name?: {
    display: string | null
  }
  phones?: DeviceContactPhone[]
}

function getContactDisplayName(contact: DeviceContact) {
  return contact.name?.display?.trim() || "Contact"
}

export async function importDeviceContacts(): Promise<ContactUpload[]> {
  if (!Capacitor.isNativePlatform()) return []

  const permission = await Contacts.requestPermissions()

  if (permission.contacts !== "granted" && permission.contacts !== "limited") {
    throw new Error("Contacts permission is required to find friends.")
  }

  const result = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
    },
  })

  const contactsByPhoneNumber = new Map<string, ContactUpload>()

  for (const contact of result.contacts) {
    const displayName = getContactDisplayName(contact)

    for (const phone of contact.phones ?? []) {
      if (!phone.number) continue

      const normalizedPhone = normalizePhoneNumber(
        phone.number,
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
