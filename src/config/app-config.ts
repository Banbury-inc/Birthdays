interface AppConfig {
  apiBaseUrl: string
  awsRegion: string
  cognitoUserPoolId: string
  cognitoUserPoolClientId: string
  defaultCountry: string
}

function readEnvValue(key: string) {
  const value = import.meta.env[key]

  if (typeof value !== "string") return ""

  return value
}

export const appConfig: AppConfig = {
  apiBaseUrl: readEnvValue("VITE_API_BASE_URL"),
  awsRegion: readEnvValue("VITE_AWS_REGION") || "us-east-1",
  cognitoUserPoolId: readEnvValue("VITE_COGNITO_USER_POOL_ID"),
  cognitoUserPoolClientId: readEnvValue("VITE_COGNITO_USER_POOL_CLIENT_ID"),
  defaultCountry: readEnvValue("VITE_DEFAULT_COUNTRY") || "US",
}

export function isAuthConfigured() {
  return Boolean(
    appConfig.cognitoUserPoolId && appConfig.cognitoUserPoolClientId
  )
}

export function isApiConfigured() {
  return Boolean(appConfig.apiBaseUrl)
}
