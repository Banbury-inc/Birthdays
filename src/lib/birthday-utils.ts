import type { ContactMatch, UserProfile } from "@/services/api-service"

export interface BirthdayListItem {
  birthday: string
  displayName: string
  id: string
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function formatBirthday(birthday: string) {
  const birthdayDate = new Date(`${birthday}T00:00:00`)

  if (Number.isNaN(birthdayDate.getTime())) return birthday

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(birthdayDate)
}

export function getDaysUntilBirthday(birthday: string) {
  const birthdayDate = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(birthdayDate.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const month = birthdayDate.getMonth()
  const day = birthdayDate.getDate()
  let nextBirthday = new Date(today.getFullYear(), month, day)

  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month, day)
  }

  const dayMs = 1000 * 60 * 60 * 24
  return Math.round((nextBirthday.getTime() - today.getTime()) / dayMs)
}

export function formatDaysUntilBirthday(birthday: string) {
  const daysUntil = getDaysUntilBirthday(birthday)
  if (daysUntil === null) return birthday
  if (daysUntil === 0) return "Today"
  if (daysUntil === 1) return "1 day"
  return `${daysUntil} days`
}

export function buildBirthdayList(
  profile: UserProfile | null,
  matches: ContactMatch[]
): BirthdayListItem[] {
  const profileBirthday: BirthdayListItem[] = profile
    ? [
        {
          birthday: profile.birthday,
          displayName: profile.displayName,
          id: profile.id,
        },
      ]
    : []

  return [
    ...profileBirthday,
    ...matches.map((match): BirthdayListItem => ({
      birthday: match.birthday,
      displayName: match.displayName,
      id: match.id,
    })),
  ]
}

export function sortByDaysUntil(birthdays: BirthdayListItem[]) {
  return [...birthdays].sort((left, right) => {
    const leftDays = getDaysUntilBirthday(left.birthday) ?? Number.MAX_SAFE_INTEGER
    const rightDays = getDaysUntilBirthday(right.birthday) ?? Number.MAX_SAFE_INTEGER
    return leftDays - rightDays
  })
}

export function sortByName(birthdays: BirthdayListItem[]) {
  return [...birthdays].sort((left, right) =>
    left.displayName.localeCompare(right.displayName)
  )
}

export function getUpcomingBirthdays(
  birthdays: BirthdayListItem[],
  withinDays = 30
) {
  return sortByDaysUntil(birthdays).filter((birthday) => {
    const daysUntil = getDaysUntilBirthday(birthday.birthday)
    return daysUntil !== null && daysUntil <= withinDays
  })
}

export function getTodaysBirthdays(birthdays: BirthdayListItem[]) {
  return birthdays.filter(
    (birthday) => getDaysUntilBirthday(birthday.birthday) === 0
  )
}

export function getBirthdayMonthDay(birthday: string) {
  const birthdayDate = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(birthdayDate.getTime())) return null

  return {
    day: birthdayDate.getDate(),
    month: birthdayDate.getMonth(),
  }
}

export function getBirthdaysOnDate(
  birthdays: BirthdayListItem[],
  month: number,
  day: number
) {
  return birthdays.filter((birthday) => {
    const monthDay = getBirthdayMonthDay(birthday.birthday)
    if (!monthDay) return false
    return monthDay.month === month && monthDay.day === day
  })
}

export interface BirthdayMonthGroup {
  birthdays: BirthdayListItem[]
  label: string
  month: number
}

export function formatMonthLabel(month: number) {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    new Date(2000, month, 1)
  )
}

export function groupBirthdaysByMonth(
  birthdays: BirthdayListItem[]
): BirthdayMonthGroup[] {
  const groups = new Map<number, BirthdayListItem[]>()

  for (const birthday of birthdays) {
    const monthDay = getBirthdayMonthDay(birthday.birthday)
    if (!monthDay) continue

    const existing = groups.get(monthDay.month) ?? []
    existing.push(birthday)
    groups.set(monthDay.month, existing)
  }

  for (const items of groups.values()) {
    items.sort((left, right) => {
      const leftMonthDay = getBirthdayMonthDay(left.birthday)
      const rightMonthDay = getBirthdayMonthDay(right.birthday)
      if (!leftMonthDay || !rightMonthDay) return 0
      return leftMonthDay.day - rightMonthDay.day
    })
  }

  const currentMonth = new Date().getMonth()

  return Array.from(groups.keys())
    .sort((left, right) => {
      const leftOffset = (left - currentMonth + 12) % 12
      const rightOffset = (right - currentMonth + 12) % 12
      return leftOffset - rightOffset
    })
    .map((month) => ({
      birthdays: groups.get(month)!,
      label: formatMonthLabel(month),
      month,
    }))
}
