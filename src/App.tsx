import { CalendarDaysIcon, GiftIcon, PlusIcon, SparklesIcon } from "lucide-react"

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

interface Birthday {
  name: string
  date: string
  relation: string
  initials: string
  daysAway: string
}

interface Reminder {
  title: string
  description: string
}

const upcomingBirthdays: Birthday[] = [
  {
    name: "Maya Johnson",
    date: "June 12",
    relation: "Sister",
    initials: "MJ",
    daysAway: "7 days",
  },
  {
    name: "Theo Carter",
    date: "June 18",
    relation: "Friend",
    initials: "TC",
    daysAway: "13 days",
  },
  {
    name: "Nina Patel",
    date: "July 2",
    relation: "Coworker",
    initials: "NP",
    daysAway: "27 days",
  },
]

const reminders: Reminder[] = [
  {
    title: "Order Maya's gift",
    description: "Saved idea: ceramic pour-over set",
  },
  {
    title: "Write Theo's card",
    description: "Mention the Yosemite trip",
  },
]

export function App() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-5 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Badge variant="secondary">
              <SparklesIcon data-icon="inline-start" />
              Birthday OS
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Never miss a birthday.
              </h1>
              <p className="text-sm text-muted-foreground">
                Track dates, gift ideas, and reminders from one iPhone-friendly
                home screen.
              </p>
            </div>
          </div>
          <Button size="icon" aria-label="Add birthday">
            <PlusIcon />
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>June celebrations</CardTitle>
            <CardDescription>3 birthdays coming up soon</CardDescription>
            <CardAction>
              <Badge variant="outline">This month</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4 rounded-lg bg-muted p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Next up</span>
                <span className="text-2xl font-semibold">Maya</span>
                <span className="text-sm text-muted-foreground">
                  June 12 at 9:00 AM
                </span>
              </div>
              <CalendarDaysIcon className="text-muted-foreground" />
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-4">
            <AvatarGroup>
              {upcomingBirthdays.map((birthday) => (
                <Avatar key={birthday.name}>
                  <AvatarFallback>{birthday.initials}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+4</AvatarGroupCount>
            </AvatarGroup>
            <Button variant="outline" size="sm">
              View calendar
            </Button>
          </CardFooter>
        </Card>

        <section className="flex flex-col gap-3" aria-labelledby="upcoming">
          <div className="flex items-center justify-between gap-3">
            <h2 id="upcoming" className="font-heading text-lg font-medium">
              Upcoming
            </h2>
            <Badge variant="ghost">Synced</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {upcomingBirthdays.map((birthday) => (
              <Card key={birthday.name} size="sm">
                <CardHeader>
                  <CardTitle>{birthday.name}</CardTitle>
                  <CardDescription>
                    {birthday.relation} - {birthday.date}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="secondary">{birthday.daysAway}</Badge>
                  </CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Gift reminders</CardTitle>
            <CardDescription>Small prep tasks before the big day</CardDescription>
            <CardAction>
              <GiftIcon className="text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.title}
                  className="rounded-lg border bg-background p-3"
                >
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {reminder.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="pb-[env(safe-area-inset-bottom)]">
          <Button className="w-full">
            <PlusIcon data-icon="inline-start" />
            Add someone new
          </Button>
        </div>
      </div>
    </main>
  )
}

export default App
