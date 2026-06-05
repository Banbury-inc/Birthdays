import { useEffect, useMemo, useState } from "react"
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  ContactRoundIcon,
  LogOutIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  bootstrapSession,
  handleContactsSync,
  handleOtpSubmit,
  handlePhoneSubmit,
  handleProfileSubmit,
  handleSignOut,
  initialAppState,
  updateField,
  type AppState,
} from "@/handlers/app-handlers"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function getBirthdayLabel(birthday: string) {
  const date = new Date(`${birthday}T00:00:00`)

  if (Number.isNaN(date.getTime())) return birthday

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
  }).format(date)
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

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-5 px-5 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Badge variant="secondary">
              <SparklesIcon data-icon="inline-start" />
              Phone-first birthdays
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Your contacts, only when they join.
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in with your phone, confirm your birthday, and see friends
                from your address book who also use the app.
              </p>
            </div>
          </div>
          {state.profile ? (
            <Button
              aria-label="Sign out"
              disabled={state.isLoading}
              onClick={() => handleSignOut(actions)}
              size="icon"
              variant="outline"
            >
              <LogOutIcon />
            </Button>
          ) : null}
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
              <CardContent>
                <div className="flex items-end justify-between gap-4 rounded-lg bg-muted p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      Your birthday
                    </span>
                    <span className="text-2xl font-semibold">
                      {state.profile?.birthday
                        ? getBirthdayLabel(state.profile.birthday)
                        : "Confirmed"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Shared with matched contacts
                    </span>
                  </div>
                  <CalendarDaysIcon className="text-muted-foreground" />
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-4">
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
                <Button
                  disabled={state.isLoading}
                  onClick={() => handleContactsSync(actions)}
                  size="sm"
                  variant="outline"
                >
                  Resync
                </Button>
              </CardFooter>
            </Card>

            <section className="flex flex-col gap-3" aria-labelledby="matches">
              <div className="flex items-center justify-between gap-3">
                <h2 id="matches" className="font-heading text-lg font-medium">
                  App contacts
                </h2>
                <Badge variant="ghost">Matched</Badge>
              </div>

              <div className="flex flex-col gap-3">
                {state.matches.length ? (
                  state.matches.map((match) => (
                    <Card key={match.id} size="sm">
                      <CardHeader>
                        <CardTitle>{match.displayName}</CardTitle>
                        <CardDescription>
                          Birthday: {getBirthdayLabel(match.birthday)}
                        </CardDescription>
                        <CardAction>
                          <Badge variant="secondary">In contacts</Badge>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>No matches yet</CardTitle>
                      <CardDescription>
                        When people in your contacts join, their birthdays will
                        appear here.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

export default App
