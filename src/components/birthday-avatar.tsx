import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/birthday-utils"

interface BirthdayAvatarProps {
  name: string
  size?: "default" | "sm" | "lg"
}

export function BirthdayAvatar({ name, size = "default" }: BirthdayAvatarProps) {
  return (
    <Avatar aria-label={`${name} avatar`} size={size}>
      <AvatarFallback className="bg-primary/10 font-medium text-primary">
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
