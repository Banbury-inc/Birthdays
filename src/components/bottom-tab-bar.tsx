import {
  CalendarDaysIcon,
  HouseIcon,
  ListIcon,
  SettingsIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  handleTabChange,
  type AppActions,
  type MainTab,
} from "@/handlers/app-handlers"

const tabItems: { icon: typeof HouseIcon; id: MainTab; label: string }[] = [
  { icon: HouseIcon, id: "home", label: "Home" },
  { icon: ListIcon, id: "all", label: "All" },
  { icon: CalendarDaysIcon, id: "calendar", label: "Calendar" },
  { icon: SettingsIcon, id: "settings", label: "Settings" },
]

interface BottomTabBarProps {
  actions: AppActions
  activeTab: MainTab
}

export function BottomTabBar({ actions, activeTab }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-[430px] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabItems.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => handleTabChange(actions, tab.id)}
              type="button"
            >
              <Icon className="size-5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
