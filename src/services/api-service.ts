import { appConfig, isApiConfigured } from "@/config/app-config"
import { getAuthorizationToken } from "@/services/auth-service"

export interface UserProfile {
  id: string
  phoneNumber: string
  displayName: string
  birthday: string
  birthdayConfirmedAt: string
}

export interface ContactUpload {
  displayName: string
  phoneNumber: string
}

export interface ContactMatch {
  id: string
  displayName: string
  birthday: string
  phoneNumber: string
}

interface ApiRequestOptions {
  body?: unknown
  method?: "GET" | "POST" | "PUT"
}

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  if (!isApiConfigured()) {
    throw new Error("API is not configured yet. Set VITE_API_BASE_URL.")
  }

  const token = await getAuthorizationToken()
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: options.method ?? "GET",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || "The birthday service could not be reached.")
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export async function fetchProfile() {
  return request<UserProfile | null>("/me")
}

export async function saveProfile(displayName: string, birthday: string) {
  return request<UserProfile>("/me", {
    body: {
      birthday,
      displayName,
    },
    method: "PUT",
  })
}

export async function syncContacts(contacts: ContactUpload[]) {
  return request<{ syncedCount: number }>("/contacts/sync", {
    body: {
      contacts,
    },
    method: "POST",
  })
}

export async function fetchContactMatches() {
  return request<ContactMatch[]>("/contacts/matches")
}
