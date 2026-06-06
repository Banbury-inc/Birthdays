interface AppConfig {
  apiBaseUrl: string
  defaultCountry: string
}

function readEnvValue(key: string) {
  const value = import.meta.env[key]

  if (typeof value !== "string") return ""

  return value
}

export const appConfig: AppConfig = {
  apiBaseUrl: readEnvValue("VITE_API_BASE_URL"),
  defaultCountry: readEnvValue("VITE_DEFAULT_COUNTRY") || "US",
}

export function isAuthConfigured() {
  return Boolean(appConfig.apiBaseUrl)
}

export function isApiConfigured() {
  return Boolean(appConfig.apiBaseUrl)
}
