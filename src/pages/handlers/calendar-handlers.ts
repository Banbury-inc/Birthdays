export interface CalendarMonth {
  month: number
  year: number
}

export function getInitialCalendarMonth(): CalendarMonth {
  const today = new Date()
  return {
    month: today.getMonth(),
    year: today.getFullYear(),
  }
}

export function getMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1))
}

export function getCalendarDays(month: number, year: number) {
  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingEmptyDays = firstDayOfMonth.getDay()

  const days: (number | null)[] = []

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day)
  }

  return days
}

export function goToPreviousMonth(month: CalendarMonth): CalendarMonth {
  if (month.month === 0) {
    return { month: 11, year: month.year - 1 }
  }

  return { month: month.month - 1, year: month.year }
}

export function goToNextMonth(month: CalendarMonth): CalendarMonth {
  if (month.month === 11) {
    return { month: 0, year: month.year + 1 }
  }

  return { month: month.month + 1, year: month.year }
}

export function isToday(day: number, month: number, year: number) {
  const today = new Date()
  return (
    today.getDate() === day &&
    today.getMonth() === month &&
    today.getFullYear() === year
  )
}
