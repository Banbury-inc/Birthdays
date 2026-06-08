import { BirthdayList } from "@/components/birthday-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type BirthdayListItem } from "@/lib/birthday-utils"

interface AllPageProps {
  birthdayList: BirthdayListItem[]
}

export function AllPage({ birthdayList }: AllPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All birthdays</CardTitle>
        <CardDescription>
          {birthdayList.length === 1
            ? "1 birthday saved"
            : `${birthdayList.length} birthdays saved`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BirthdayList birthdays={birthdayList} groupByMonth />
      </CardContent>
    </Card>
  )
}
