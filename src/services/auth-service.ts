import {
  autoSignIn,
  confirmSignIn,
  confirmSignUp,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from "@aws-amplify/auth"
import { Amplify, fetchAuthSession } from "@aws-amplify/core"

import { appConfig, isAuthConfigured } from "@/config/app-config"

interface AuthenticatedUser {
  userId: string
  phoneNumber: string
}

interface CognitoErrorLike {
  code?: string
  message?: string
  name?: string
  __type?: string
}

type PendingAuthFlow = "sign-in" | "sign-up" | null

let isAmplifyConfigured = false
let pendingPhoneNumber = ""
let pendingAuthFlow: PendingAuthFlow = null

function clearPendingAuthFlow() {
  pendingPhoneNumber = ""
  pendingAuthFlow = null
}

function configureAmplify() {
  if (isAmplifyConfigured || !isAuthConfigured()) return

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: appConfig.cognitoUserPoolId,
        userPoolClientId: appConfig.cognitoUserPoolClientId,
        loginWith: {
          phone: true,
        },
      },
    },
  })

  isAmplifyConfigured = true
}

function getCognitoError(error: unknown): CognitoErrorLike {
  if (typeof error !== "object" || error === null) return {}

  return error as CognitoErrorLike
}

function getCognitoErrorText(error: unknown) {
  const cognitoError = getCognitoError(error)

  return [
    cognitoError.name,
    cognitoError.code,
    cognitoError.__type,
    cognitoError.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function isUserNotFoundError(error: unknown) {
  const errorText = getCognitoErrorText(error)

  return (
    errorText.includes("usernotfoundexception") ||
    errorText.includes("user does not exist")
  )
}

function toPhoneAuthError(error: unknown) {
  const errorText = getCognitoErrorText(error)

  if (errorText.includes("codemismatchexception")) {
    return new Error("That code is not correct. Check the text and try again.")
  }

  if (errorText.includes("expiredcodeexception")) {
    return new Error("That code expired. Request a new login code.")
  }

  if (
    errorText.includes("limitexceededexception") ||
    errorText.includes("toomanyrequestsexception") ||
    errorText.includes("too many")
  ) {
    return new Error("Too many attempts. Wait a few minutes and try again.")
  }

  if (
    errorText.includes("sms") ||
    errorText.includes("sns") ||
    errorText.includes("phone")
  ) {
    return new Error(
      "We could not send a text to that number. Check the number and AWS SMS settings, then try again."
    )
  }

  if (error instanceof Error) return error

  return new Error("Phone authorization failed. Try again.")
}

function assertAuthConfigured() {
  if (isAuthConfigured()) return

  throw new Error(
    "Phone login is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID."
  )
}

export async function startPhoneSignIn(phoneNumber: string) {
  assertAuthConfigured()
  configureAmplify()

  pendingPhoneNumber = phoneNumber
  pendingAuthFlow = null

  try {
    await signIn({
      username: phoneNumber,
      options: {
        authFlowType: "USER_AUTH",
        preferredChallenge: "SMS_OTP",
      },
    })
    pendingAuthFlow = "sign-in"
  } catch (error) {
    if (!isUserNotFoundError(error)) throw toPhoneAuthError(error)

    try {
      await signUp({
        username: phoneNumber,
        options: {
          autoSignIn: {
            authFlowType: "USER_AUTH",
            preferredChallenge: "SMS_OTP",
          },
          userAttributes: {
            phone_number: phoneNumber,
          },
        },
      })
      pendingAuthFlow = "sign-up"
    } catch (signUpError) {
      throw toPhoneAuthError(signUpError)
    }
  }
}

export async function confirmPhoneSignIn(code: string) {
  assertAuthConfigured()
  configureAmplify()

  const confirmationCode = code.trim()

  if (!confirmationCode) throw new Error("Enter the code from your text.")
  if (!pendingPhoneNumber || !pendingAuthFlow) {
    throw new Error("Request a new login code before confirming.")
  }

  try {
    if (pendingAuthFlow === "sign-up") {
      await confirmSignUp({
        confirmationCode,
        username: pendingPhoneNumber,
      })
      clearPendingAuthFlow()

      const signInResult = await autoSignIn()

      if (!signInResult.isSignedIn) {
        throw new Error(
          "Sign-in was not completed after registration. Request a new login code and try again."
        )
      }
      return
    }

    await confirmSignIn({
      challengeResponse: confirmationCode,
    })
    clearPendingAuthFlow()
  } catch (error) {
    throw toPhoneAuthError(error)
  }
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  configureAmplify()

  if (!isAuthConfigured()) return null

  try {
    const user = await getCurrentUser()

    return {
      userId: user.userId,
      phoneNumber: user.signInDetails?.loginId ?? "",
    }
  } catch {
    return null
  }
}

export async function getAuthorizationToken() {
  configureAmplify()

  if (!isAuthConfigured()) return ""

  const session = await fetchAuthSession()

  return session.tokens?.idToken?.toString() ?? ""
}

export async function signOutUser() {
  configureAmplify()

  if (!isAuthConfigured()) return

  await signOut()
}
