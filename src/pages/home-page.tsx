import { BirthdayAvatar } from "@/components/birthday-avatar"
import { BirthdayList } from "@/components/birthday-list"
import {
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AppState } from "@/handlers/app-handlers"
import {
  getTodaysBirthdays,
  getUpcomingBirthdays,
  type BirthdayListItem,
} from "@/lib/birthday-utils"

interface HomePageProps {
  birthdayList: BirthdayListItem[]
  state: AppState
}

export function HomePage({ birthdayList, state }: HomePageProps) {
  const todaysBirthdays = getTodaysBirthdays(birthdayList)
  const upcomingBirthdays = getUpcomingBirthdays(birthdayList).filter(
    (birthday) => !todaysBirthdays.some((today) => today.id === birthday.id)
  )

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {state.profile?.displayName
              ? `Hi, ${state.profile.displayName}`
              : "Birthday contacts"}
          </CardTitle>
          <CardDescription>
            {birthdayList.length === 1
              ? "1 birthday saved"
              : `${birthdayList.length} birthdays saved`}
          </CardDescription>
          <CardAction>
            <Badge variant="outline">{state.contactsSyncedCount} synced</Badge>
          </CardAction>
        </CardHeader>
        {state.matches.length ? (
          <CardFooter>
            <AvatarGroup>
              {state.matches.slice(0, 3).map((match) => (
                <BirthdayAvatar key={match.id} name={match.displayName} />
              ))}
              {state.matches.length > 3 ? (
                <AvatarGroupCount>+{state.matches.length - 3}</AvatarGroupCount>
              ) : null}
            </AvatarGroup>
          </CardFooter>
        ) : null}
      </Card>

      {todaysBirthdays.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>
              {todaysBirthdays.length === 1
                ? "1 birthday today"
                : `${todaysBirthdays.length} birthdays today`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BirthdayList birthdays={todaysBirthdays} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          <CardDescription>Next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <BirthdayList
            birthdays={upcomingBirthdays}
            emptyMessage="No upcoming birthdays in the next 30 days."
          />
        </CardContent>
      </Card>
    </div>
  )
}
