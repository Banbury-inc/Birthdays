import { BirthdayAvatar } from "@/components/birthday-avatar"
import { Badge } from "@/components/ui/badge"
import {
  formatBirthday,
  formatDaysUntilBirthday,
  groupBirthdaysByMonth,
  type BirthdayListItem,
} from "@/lib/birthday-utils"

interface BirthdayListProps {
  birthdays: BirthdayListItem[]
  emptyMessage?: string
  groupByMonth?: boolean
}

function BirthdayListItem({ birthday }: { birthday: BirthdayListItem }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <BirthdayAvatar name={birthday.displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{birthday.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {formatBirthday(birthday.birthday)}
          </p>
        </div>
      </div>
      <Badge className="shrink-0" variant="secondary">
        {formatDaysUntilBirthday(birthday.birthday)}
      </Badge>
    </li>
  )
}

export function BirthdayList({
  birthdays,
  emptyMessage = "No birthdays yet.",
  groupByMonth = false,
}: BirthdayListProps) {
  if (!birthdays.length) {
    return (
      <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  if (groupByMonth) {
    const monthGroups = groupBirthdaysByMonth(birthdays)

    return (
      <div className="flex flex-col gap-5">
        {monthGroups.map((group) => (
          <section key={group.month}>
            <h3 className="mb-3 font-heading text-sm font-medium text-muted-foreground">
              {group.label}
            </h3>
            <ul
              aria-label={`${group.label} birthdays`}
              className="flex flex-col gap-3"
            >
              {group.birthdays.map((birthday) => (
                <BirthdayListItem birthday={birthday} key={birthday.id} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  return (
    <ul aria-label="Birthday list" className="flex flex-col gap-3">
      {birthdays.map((birthday) => (
        <BirthdayListItem birthday={birthday} key={birthday.id} />
      ))}
    </ul>
  )
}
