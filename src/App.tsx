import { useEffect, useMemo, useState } from "react"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ContactRoundIcon,
  FileTextIcon,
  LogOutIcon,
  MenuIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  appStepOptions,
  bootstrapSession,
  handleContactsSync,
  handleNavigateToStep,
  handleOtpSubmit,
  handlePhoneSubmit,
  handleProfileSubmit,
  handleSignOut,
  handleTermsContinue,
  initialAppState,
  startHomeMatchesPolling,
  updateField,
  type AppState,
  type AppStep,
} from "@/handlers/app-handlers"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function StatusMessage({ state }: { state: AppState }) {
  if (state.errorMessage) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-card p-3 text-sm text-destructive">
        {state.errorMessage}
      </div>
    )
  }

  if (!state.successMessage) return null

  return (
    <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
      {state.successMessage}
    </div>
  )
}

export function App() {
  const [state, setState] = useState(initialAppState)
  const actions = useMemo(() => ({ setState }), [])

  useEffect(() => {
    void bootstrapSession(actions)
  }, [actions])

  useEffect(() => {
    if (state.step !== "home") return

    return startHomeMatchesPolling(actions)
  }, [actions, state.step])

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-5 px-5 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Your contacts, only when they join.
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Navigate pages"
                className="shrink-0"
                size="icon"
                variant="outline"
              >
                <MenuIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Pages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                onValueChange={(value) =>
                  handleNavigateToStep(actions, value as AppStep)
                }
                value={state.step}
              >
                {appStepOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.step}
                    value={option.step}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              {state.profile ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={state.isLoading}
                    onClick={() => handleSignOut(actions)}
                    variant="destructive"
                  >
                    <LogOutIcon />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <StatusMessage state={state} />

        {state.step === "phone" ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect your phone number</CardTitle>
              <CardDescription>
                Your account is your phone number, name, and confirmed birthday.
              </CardDescription>
              <CardAction>
                <PhoneIcon className="text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <form onSubmit={(event) => handlePhoneSubmit(event, actions)}>
              <CardContent>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Phone number
                  <input
                    autoComplete="tel"
                    className="h-11 rounded-md border bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    inputMode="tel"
                    onChange={(event) =>
                      updateField(actions, "phoneNumber", event.target.value)
                    }
                    placeholder="+1 555 123 4567"
                    type="tel"
                    value={state.phoneNumber}
                  />
                </label>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={state.isLoading}>
                  <ShieldCheckIcon data-icon="inline-start" />
                  Send login code
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : null}

        {state.step === "otp" ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirm your code</CardTitle>
              <CardDescription>
                Enter the SMS code sent to {state.phoneNumber}.
              </CardDescription>
            </CardHeader>
            <form onSubmit={(event) => handleOtpSubmit(event, actions)}>
              <CardContent>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  SMS code
                  <input
                    autoComplete="one-time-code"
                    className="h-11 rounded-md border bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    inputMode="numeric"
                    onChange={(event) =>
                      updateField(actions, "code", event.target.value)
                    }
                    placeholder="123456"
                    value={state.code}
                  />
                </label>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={state.isLoading}>
                  Confirm phone
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : null}

        {state.step === "profile" ? (
          <Card>
            <CardHeader>
              <CardTitle>Confirm your birthday</CardTitle>
              <CardDescription>
                This is the only profile info friends from your contacts can
                see.
              </CardDescription>
              <CardAction>
                <CalendarDaysIcon className="text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <form onSubmit={(event) => handleProfileSubmit(event, actions)}>
              <CardContent className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Name
                  <input
                    autoComplete="name"
                    className="h-11 rounded-md border bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      updateField(actions, "profileName", event.target.value)
                    }
                    placeholder="Maya Johnson"
                    value={state.profileName}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Birthday
                  <input
                    className="h-11 rounded-md border bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      updateField(
                        actions,
                        "profileBirthday",
                        event.target.value
                      )
                    }
                    type="date"
                    value={state.profileBirthday}
                  />
                </label>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={state.isLoading}>
                  <CheckCircle2Icon data-icon="inline-start" />
                  Confirm birthday
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : null}

        {state.step === "contacts" ? (
          <Card>
            <CardHeader>
              <CardTitle>Sync contacts</CardTitle>
              <CardDescription>
                We match phone numbers from your address book to people who
                already have Birthdays.
              </CardDescription>
              <CardAction>
                <ContactRoundIcon className="text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                Contacts are used for matching only. Friends can see your name
                and birthday only if your number is already in their contacts.
              </div>
            </CardContent>
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
        ) : null}

        {state.step === "terms" ? (
          <Card>
            <CardHeader>
              <CardTitle>Terms and conditions</CardTitle>
              <CardDescription>
                Birthday sharing works only with people who already have your
                phone number.
              </CardDescription>
              <CardAction>
                <FileTextIcon className="text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
              <p>
                By using Birthdays, you agree that anyone who has your phone
                number saved in their contacts may be able to see your name and
                birthday after they join the app and sync their contacts.
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted p-4 text-foreground">
                <input
                  checked={state.termsAccepted}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  onChange={(event) =>
                    updateField(actions, "termsAccepted", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  Yes, I am okay with everyone that has my phone number seeing
                  my birthday.
                </span>
              </label>
              <p>
                Your contacts are used to find matches. We do not show your
                birthday to people unless their synced contacts include your
                phone number.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={!state.termsAccepted || state.isLoading}
                onClick={() => handleTermsContinue(actions)}
              >
                Continue
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {state.step === "home" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  {state.profile?.displayName
                    ? `Hi, ${state.profile.displayName}`
                    : "Birthday contacts"}
                </CardTitle>
                <CardDescription>
                  {state.matches.length
                    ? `${state.matches.length} contacts use the app`
                    : "No matched contacts yet"}
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">
                    {state.contactsSyncedCount} synced
                  </Badge>
                </CardAction>
              </CardHeader>
              {state.matches.length ? (
                <CardFooter>
                  <AvatarGroup>
                    {state.matches.slice(0, 3).map((match) => (
                      <Avatar key={match.id}>
                        <AvatarFallback>
                          {getInitials(match.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {state.matches.length > 3 ? (
                      <AvatarGroupCount>
                        +{state.matches.length - 3}
                      </AvatarGroupCount>
                    ) : null}
                  </AvatarGroup>
                </CardFooter>
              ) : null}
            </Card>

          </>
        ) : null}
      </div>
    </main>
  )
}

export default App
