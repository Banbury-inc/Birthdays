import { isApiConfigured } from "@/config/app-config"
import type { ContactMatch, UserProfile } from "@/services/api-service"

const mockUserProfile: UserProfile = {
  birthday: "1994-06-06",
  birthdayConfirmedAt: "2026-06-06T00:00:00.000Z",
  displayName: "Mason",
  id: "dev-user",
  phoneNumber: "+15555550100",
}

const mockContactMatches: ContactMatch[] = [
  {
    birthday: "1992-01-14",
    displayName: "Avery Brooks",
    id: "dev-match-avery",
    phoneNumber: "+15555550101",
  },
  {
    birthday: "1989-03-22",
    displayName: "Jordan Lee",
    id: "dev-match-jordan",
    phoneNumber: "+15555550102",
  },
  {
    birthday: "1996-06-18",
    displayName: "Casey Morgan",
    id: "dev-match-casey",
    phoneNumber: "+15555550103",
  },
  {
    birthday: "1991-09-04",
    displayName: "Taylor Kim",
    id: "dev-match-taylor",
    phoneNumber: "+15555550104",
  },
  {
    birthday: "1998-12-11",
    displayName: "Riley Chen",
    id: "dev-match-riley",
    phoneNumber: "+15555550105",
  },
]

export function shouldUseMockBirthdays() {
  return import.meta.env.DEV && !isApiConfigured()
}

export function getMockProfile() {
  return mockUserProfile
}

export function getMockContactMatches() {
  return mockContactMatches
}

export function getMockContactsSyncedCount() {
  return mockContactMatches.length
}
