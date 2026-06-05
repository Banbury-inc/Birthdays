import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.banbury.birthdays",
  appName: "Birthdays",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    scheme: "Birthdays",
  },
  plugins: {
    Contacts: {
      iosUsageDescription:
        "Birthdays uses your contacts to find friends who also use the app.",
    },
  },
}

export default config
