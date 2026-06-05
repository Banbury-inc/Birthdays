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

let isAmplifyConfigured = false
let pendingPhoneNumber = ""
let pendingSignUpConfirmation = false

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

export async function startPhoneSignIn(phoneNumber: string) {
  configureAmplify()

  if (!isAuthConfigured()) return

  pendingPhoneNumber = phoneNumber
  pendingSignUpConfirmation = false

  try {
    await signIn({
      username: phoneNumber,
      options: {
        authFlowType: "USER_AUTH",
        preferredChallenge: "SMS_OTP",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""

    if (!message.includes("User does not exist")) throw error

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
    pendingSignUpConfirmation = true
  }
}

export async function confirmPhoneSignIn(code: string) {
  configureAmplify()

  if (!isAuthConfigured()) return

  if (pendingSignUpConfirmation) {
    await confirmSignUp({
      confirmationCode: code,
      username: pendingPhoneNumber,
    })
    await autoSignIn()
    pendingSignUpConfirmation = false
    return
  }

  await confirmSignIn({
    challengeResponse: code,
  })
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
