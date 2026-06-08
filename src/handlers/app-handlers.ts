import type { Dispatch, FormEvent, SetStateAction } from "react"

import { appConfig, isApiConfigured, isAuthConfigured } from "@/config/app-config"
import { normalizePhoneNumber } from "@/lib/phone"
import {
  fetchContactMatches,
  fetchProfile,
  saveProfile,
  syncContacts,
  type ContactMatch,
  type UserProfile,
} from "@/services/api-service"
import {
  confirmPhoneSignIn,
  getAuthenticatedUser,
  signOutUser,
  startPhoneSignIn,
} from "@/services/auth-service"
import { importDeviceContacts } from "@/services/contact-service"
import {
  getMockContactMatches,
  getMockContactsSyncedCount,
  getMockProfile,
  shouldUseMockBirthdays,
} from "@/services/mock-birthday-service"

export type AppStep =
  | "phone"
  | "otp"
  | "profile"
  | "contacts"
  | "terms"
  | "home"

export type MainTab = "home" | "all" | "calendar" | "settings"

export interface AppState {
  activeTab: MainTab
  code: string
  contactsSyncedCount: number
  errorMessage: string
  isLoading: boolean
  matches: ContactMatch[]
  phoneNumber: string
  profile: UserProfile | null
  profileBirthday: string
  profileName: string
  step: AppStep
  successMessage: string
  termsAccepted: boolean
}

export interface AppActions {
  setState: Dispatch<SetStateAction<AppState>>
}

export const MATCHES_POLL_INTERVAL_MS = 30_000

export const initialAppState: AppState = {
  activeTab: "home",
  code: "",
  contactsSyncedCount: 0,
  errorMessage: "",
  isLoading: false,
  matches: [],
  phoneNumber: "",
  profile: null,
  profileBirthday: "",
  profileName: "",
  step: "phone",
  successMessage: "",
  termsAccepted: false,
}

function loadMockBirthdays(actions: AppActions) {
  const profile = getMockProfile()

  actions.setState((state) => ({
    ...state,
    contactsSyncedCount: getMockContactsSyncedCount(),
    isLoading: false,
    matches: getMockContactMatches(),
    phoneNumber: profile.phoneNumber,
    profile,
    profileBirthday: profile.birthday,
    profileName: profile.displayName,
    step: "home",
    successMessage: "Mock birthdays loaded for local development.",
  }))
}

function setLoading(actions: AppActions, isLoading: boolean) {
  actions.setState((state) => ({
    ...state,
    errorMessage: "",
    isLoading,
    successMessage: "",
  }))
}

function setError(actions: AppActions, error: unknown) {
  const errorMessage =
    error instanceof Error ? error.message : "Something went wrong."

  actions.setState((state) => ({
    ...state,
    errorMessage,
    isLoading: false,
  }))
}

function readAppState(actions: AppActions) {
  return new Promise<AppState>((resolve) => {
    actions.setState((state) => {
      resolve(state)
      return state
    })
  })
}

async function loadProfileAndMatches(actions: AppActions) {
  if (shouldUseMockBirthdays()) {
    loadMockBirthdays(actions)
    return
  }

  if (!isApiConfigured()) {
    actions.setState((state) => ({
      ...state,
      step: "profile",
      successMessage:
        "Phone login is configured. Add the API URL to load saved birthdays.",
    }))
    return
  }

  const profile = await fetchProfile()

  if (!profile) {
    actions.setState((state) => ({
      ...state,
      step: "profile",
    }))
    return
  }

  const matches = await fetchContactMatches()

  actions.setState((state) => ({
    ...state,
    matches,
    profile,
    profileBirthday: profile.birthday,
    profileName: profile.displayName,
    step: matches.length ? "home" : "contacts",
  }))
}

export function updateField<K extends keyof AppState>(
  actions: AppActions,
  field: K,
  value: AppState[K]
) {
  actions.setState((state) => ({
    ...state,
    [field]: value,
    errorMessage: "",
    successMessage: "",
  }))
}

export async function bootstrapSession(actions: AppActions) {
  if (shouldUseMockBirthdays()) {
    loadMockBirthdays(actions)
    return
  }

  if (!isAuthConfigured()) return

  setLoading(actions, true)

  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      actions.setState((state) => ({
        ...state,
        isLoading: false,
      }))
      return
    }

    actions.setState((state) => ({
      ...state,
      phoneNumber: user.phoneNumber,
    }))
    await loadProfileAndMatches(actions)
    actions.setState((state) => ({
      ...state,
      isLoading: false,
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function submitPhoneNumber(actions: AppActions) {
  setLoading(actions, true)

  try {
    const currentState = await readAppState(actions)
    const normalizedPhone = normalizePhoneNumber(
      currentState.phoneNumber,
      appConfig.defaultCountry
    )

    if (!normalizedPhone) throw new Error("Enter a valid phone number.")

    await startPhoneSignIn(normalizedPhone.e164)
    actions.setState((state) => ({
      ...state,
      isLoading: false,
      phoneNumber: normalizedPhone.e164,
      step: "otp",
      successMessage: "We sent a login code to your phone.",
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function submitOtp(actions: AppActions) {
  setLoading(actions, true)

  try {
    const currentState = await readAppState(actions)

    await confirmPhoneSignIn(currentState.code)
    await loadProfileAndMatches(actions)
    actions.setState((state) => ({
      ...state,
      code: "",
      isLoading: false,
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function submitProfile(actions: AppActions) {
  setLoading(actions, true)

  try {
    const state = await new Promise<AppState>((resolve) => {
      actions.setState((currentState) => {
        resolve(currentState)
        return currentState
      })
    })

    if (!state.profileName.trim()) throw new Error("Enter your name.")
    if (!state.profileBirthday) throw new Error("Confirm your birthday.")

    const profile = isApiConfigured()
      ? await saveProfile(state.profileName.trim(), state.profileBirthday)
      : {
          birthday: state.profileBirthday,
          birthdayConfirmedAt: new Date().toISOString(),
          displayName: state.profileName.trim(),
          id: "preview-user",
          phoneNumber: state.phoneNumber,
        }

    actions.setState((currentState) => ({
      ...currentState,
      isLoading: false,
      profile,
      step: "terms",
      successMessage: "Birthday confirmed. Review the terms to continue.",
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function syncDeviceContacts(actions: AppActions) {
  setLoading(actions, true)

  try {
    const contacts = await importDeviceContacts()

    if (isApiConfigured() && contacts.length) await syncContacts(contacts)

    const matches = shouldUseMockBirthdays()
      ? getMockContactMatches()
      : isApiConfigured()
        ? await fetchContactMatches()
        : []

    actions.setState((state) => ({
      ...state,
      contactsSyncedCount: shouldUseMockBirthdays()
        ? getMockContactsSyncedCount()
        : contacts.length,
      isLoading: false,
      matches,
      step: "home",
      successMessage: shouldUseMockBirthdays()
        ? "Mock birthdays loaded for local development."
        : contacts.length
          ? "Contacts synced."
          : "Open the iPhone app to grant Contacts permission and sync your address book.",
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function signOut(actions: AppActions) {
  setLoading(actions, true)

  try {
    await signOutUser()
    actions.setState(initialAppState)
  } catch (error) {
    setError(actions, error)
  }
}

export function handlePhoneSubmit(
  event: FormEvent<HTMLFormElement>,
  actions: AppActions
) {
  event.preventDefault()
  void submitPhoneNumber(actions)
}

export function handleOtpSubmit(
  event: FormEvent<HTMLFormElement>,
  actions: AppActions
) {
  event.preventDefault()
  void submitOtp(actions)
}

export function handleProfileSubmit(
  event: FormEvent<HTMLFormElement>,
  actions: AppActions
) {
  event.preventDefault()
  void submitProfile(actions)
}

export function handleContactsSync(actions: AppActions) {
  void syncDeviceContacts(actions)
}

export function handleTermsContinue(actions: AppActions) {
  actions.setState((state) => {
    if (!state.termsAccepted) {
      return {
        ...state,
        errorMessage: "Accept the terms to continue.",
      }
    }

    return {
      ...state,
      errorMessage: "",
      step: "contacts",
      successMessage: "",
    }
  })
}

export function handleSignOut(actions: AppActions) {
  void signOut(actions)
}

export function handleTabChange(actions: AppActions, tab: MainTab) {
  actions.setState((state) => ({
    ...state,
    activeTab: tab,
    errorMessage: "",
    successMessage: "",
  }))
}

export async function refreshContactMatches(actions: AppActions) {
  if (shouldUseMockBirthdays()) {
    actions.setState((state) => {
      if (state.step !== "home") return state

      return {
        ...state,
        matches: getMockContactMatches(),
      }
    })
    return
  }

  if (!isApiConfigured()) return

  try {
    const matches = await fetchContactMatches()

    actions.setState((state) => {
      if (state.step !== "home") return state

      return {
        ...state,
        matches,
      }
    })
  } catch {
    // Background refresh should not interrupt the home screen.
  }
}

export function startHomeMatchesPolling(actions: AppActions) {
  void refreshContactMatches(actions)

  const intervalId = window.setInterval(() => {
    void refreshContactMatches(actions)
  }, MATCHES_POLL_INTERVAL_MS)

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      void refreshContactMatches(actions)
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)

  return () => {
    window.clearInterval(intervalId)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}
