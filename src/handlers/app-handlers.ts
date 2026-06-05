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

export type AppStep = "phone" | "otp" | "profile" | "contacts" | "home"

export const appStepOptions: { label: string; step: AppStep }[] = [
  { label: "Phone login", step: "phone" },
  { label: "Confirm code", step: "otp" },
  { label: "Confirm birthday", step: "profile" },
  { label: "Sync contacts", step: "contacts" },
  { label: "Home", step: "home" },
]

export interface AppState {
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
}

interface AppActions {
  setState: Dispatch<SetStateAction<AppState>>
}

export const initialAppState: AppState = {
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

async function loadProfileAndMatches(actions: AppActions) {
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
    actions.setState((state) => {
      const normalizedPhone = normalizePhoneNumber(
        state.phoneNumber,
        appConfig.defaultCountry
      )

      if (!normalizedPhone) {
        throw new Error("Enter a valid phone number.")
      }

      return {
        ...state,
        phoneNumber: normalizedPhone.e164,
      }
    })

    const currentState = await new Promise<AppState>((resolve) => {
      actions.setState((state) => {
        resolve(state)
        return state
      })
    })

    await startPhoneSignIn(currentState.phoneNumber)
    actions.setState((state) => ({
      ...state,
      isLoading: false,
      step: "otp",
      successMessage: isAuthConfigured()
        ? "We sent a login code to your phone."
        : "Auth is not configured yet, so this screen is running in preview mode.",
    }))
  } catch (error) {
    setError(actions, error)
  }
}

export async function submitOtp(actions: AppActions) {
  setLoading(actions, true)

  try {
    await confirmPhoneSignIn(
      await new Promise<string>((resolve) => {
        actions.setState((state) => {
          resolve(state.code)
          return state
        })
      })
    )
    await loadProfileAndMatches(actions)
    actions.setState((state) => ({
      ...state,
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
      step: "contacts",
      successMessage: "Birthday confirmed. Now sync contacts.",
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

    const matches = isApiConfigured() ? await fetchContactMatches() : []

    actions.setState((state) => ({
      ...state,
      contactsSyncedCount: contacts.length,
      isLoading: false,
      matches,
      step: "home",
      successMessage: contacts.length
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

export function handleSignOut(actions: AppActions) {
  void signOut(actions)
}

export function handleNavigateToStep(actions: AppActions, step: AppStep) {
  actions.setState((state) => ({
    ...state,
    errorMessage: "",
    step,
    successMessage: "",
  }))
}
