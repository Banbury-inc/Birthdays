import { Preferences } from "@capacitor/preferences"

import { appConfig, isAuthConfigured } from "@/config/app-config"

interface AuthenticatedUser {
  userId: string
  phoneNumber: string
}

interface AuthSessionPayload {
  exp: number
  phoneNumber: string
  sub: string
}

let pendingPhoneNumber = ""
const authTokenStorageKey = "birthdays.authToken"

function assertAuthConfigured() {
  if (isAuthConfigured()) return

  throw new Error(
    "Phone login is not configured. Set VITE_API_BASE_URL."
  )
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)

  return atob(`${base64}${padding}`)
}

function decodeSessionPayload(token: string): AuthSessionPayload | null {
  const [payload] = token.split(".")

  if (!payload) return null

  try {
    return JSON.parse(decodeBase64Url(payload)) as AuthSessionPayload
  } catch {
    return null
  }
}

function isSessionExpired(payload: AuthSessionPayload) {
  return payload.exp * 1000 <= Date.now()
}

async function getStoredToken() {
  const result = await Preferences.get({ key: authTokenStorageKey })

  return result.value ?? ""
}

async function storeToken(token: string) {
  await Preferences.set({
    key: authTokenStorageKey,
    value: token,
  })
}

async function clearToken() {
  await Preferences.remove({ key: authTokenStorageKey })
}

async function requestAuth<T>(path: string, body: unknown) {
  assertAuthConfigured()

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (response.ok) return (await response.json()) as T

  const errorBody = (await response.json().catch(() => null)) as {
    message?: string
  } | null

  throw new Error(errorBody?.message ?? "Phone authorization failed. Try again.")
}

export async function startPhoneSignIn(phoneNumber: string) {
  await requestAuth<{ status: string }>("/auth/start", {
    phoneNumber,
  })
  pendingPhoneNumber = phoneNumber
}

export async function confirmPhoneSignIn(code: string) {
  const confirmationCode = code.trim()

  if (!confirmationCode) throw new Error("Enter the code from your text.")
  if (!pendingPhoneNumber) {
    throw new Error("Request a new login code before confirming.")
  }

  const result = await requestAuth<{ token: string }>("/auth/verify", {
    code: confirmationCode,
    phoneNumber: pendingPhoneNumber,
  })

  await storeToken(result.token)
  pendingPhoneNumber = ""
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = await getStoredToken()

  if (!token) return null

  const payload = decodeSessionPayload(token)

  if (!payload || isSessionExpired(payload)) {
    await clearToken()
    return null
  }

  return {
    phoneNumber: payload.phoneNumber,
    userId: payload.sub,
  }
}

export async function getAuthorizationToken() {
  const token = await getStoredToken()
  const payload = decodeSessionPayload(token)

  if (!token || !payload || isSessionExpired(payload)) {
    await clearToken()
    return ""
  }

  return token
}

export async function signOutUser() {
  pendingPhoneNumber = ""
  await clearToken()
}
