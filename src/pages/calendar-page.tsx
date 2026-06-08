import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { BirthdayList } from "@/components/birthday-list"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getBirthdaysOnDate,
  type BirthdayListItem,
} from "@/lib/birthday-utils"
import {
  getCalendarDays,
  getInitialCalendarMonth,
  getMonthLabel,
  goToNextMonth,
  goToPreviousMonth,
  isToday,
  type CalendarMonth,
} from "@/pages/handlers/calendar-handlers"

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface CalendarPageProps {
  birthdayList: BirthdayListItem[]
}

export function CalendarPage({ birthdayList }: CalendarPageProps) {
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth>(
    getInitialCalendarMonth
  )
  const [selectedDay, setSelectedDay] = useState<number | null>(
    new Date().getDate()
  )

  const calendarDays = getCalendarDays(calendarMonth.month, calendarMonth.year)
  const selectedBirthdays =
    selectedDay === null
      ? []
      : getBirthdaysOnDate(
          birthdayList,
          calendarMonth.month,
          selectedDay
        )

  function handlePreviousMonth() {
    setCalendarMonth((currentMonth) => goToPreviousMonth(currentMonth))
    setSelectedDay(null)
  }

  function handleNextMonth() {
    setCalendarMonth((currentMonth) => goToNextMonth(currentMonth))
    setSelectedDay(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Button
              aria-label="Previous month"
              onClick={handlePreviousMonth}
              size="icon"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <CardTitle className="text-center">
              {getMonthLabel(calendarMonth.month, calendarMonth.year)}
            </CardTitle>
            <Button
              aria-label="Next month"
              onClick={handleNextMonth}
              size="icon"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdayLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} />
              }

              const dayBirthdays = getBirthdaysOnDate(
                birthdayList,
                calendarMonth.month,
                day
              )
              const hasBirthdays = dayBirthdays.length > 0
              const isSelected = selectedDay === day
              const isTodayDate = isToday(
                day,
                calendarMonth.month,
                calendarMonth.year
              )

              return (
                <button
                  aria-label={
                    hasBirthdays
                      ? `${day}, ${dayBirthdays.length} birthdays`
                      : `${day}`
                  }
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                    isTodayDate && !isSelected && "ring-1 ring-primary"
                  )}
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  type="button"
                >
                  <span>{day}</span>
                  {hasBirthdays ? (
                    <span
                      className={cn(
                        "absolute bottom-1 size-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDay === null
              ? "Select a day"
              : new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "long",
                }).format(
                  new Date(calendarMonth.year, calendarMonth.month, selectedDay)
                )}
          </CardTitle>
          <CardDescription>
            {selectedBirthdays.length === 1
              ? "1 birthday"
              : `${selectedBirthdays.length} birthdays`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BirthdayList
            birthdays={selectedBirthdays}
            emptyMessage={
              selectedDay === null
                ? "Tap a day to see birthdays."
                : "No birthdays on this day."
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
