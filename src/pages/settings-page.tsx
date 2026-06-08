import {
  ContactRoundIcon,
  ExternalLinkIcon,
  LogOutIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  handleContactsSync,
  handleSignOut,
  type AppActions,
  type AppState,
} from "@/handlers/app-handlers"
import { formatBirthday } from "@/lib/birthday-utils"
import {
  PRIVACY_URL,
  SUPPORT_URL,
} from "@/pages/handlers/settings-handlers"

interface SettingsPageProps {
  actions: AppActions
  state: AppState
}

export function SettingsPage({ actions, state }: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-5">
      {state.errorMessage ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-3 text-sm text-destructive">
          {state.errorMessage}
        </div>
      ) : null}

      {state.successMessage ? (
        <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          {state.successMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">
              {state.profile?.displayName ?? "Not set"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Birthday</span>
            <span className="font-medium">
              {state.profile?.birthday
                ? formatBirthday(state.profile.birthday)
                : "Not set"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">
              {state.profile?.phoneNumber ?? state.phoneNumber ?? "Not set"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {state.contactsSyncedCount === 1
              ? "1 contact synced"
              : `${state.contactsSyncedCount} contacts synced`}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="w-full"
            disabled={state.isLoading}
            onClick={() => handleContactsSync(actions)}
          >
            <ContactRoundIcon data-icon="inline-start" />
            Sync iPhone contacts
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
          <CardDescription>Help and legal information</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <a
            className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted"
            href={SUPPORT_URL}
            rel="noreferrer"
            target="_blank"
          >
            Support
            <ExternalLinkIcon className="size-4 text-muted-foreground" />
          </a>
          <a
            className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted"
            href={PRIVACY_URL}
            rel="noreferrer"
            target="_blank"
          >
            Privacy policy
            <ExternalLinkIcon className="size-4 text-muted-foreground" />
          </a>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        disabled={state.isLoading}
        onClick={() => handleSignOut(actions)}
        variant="destructive"
      >
        <LogOutIcon data-icon="inline-start" />
        Sign out
      </Button>
    </div>
  )
}
