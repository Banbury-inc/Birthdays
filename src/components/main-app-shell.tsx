import { BottomTabBar } from "@/components/bottom-tab-bar"
import { AllPage } from "@/pages/all-page"
import { CalendarPage } from "@/pages/calendar-page"
import { HomePage } from "@/pages/home-page"
import { SettingsPage } from "@/pages/settings-page"
import type { AppActions, AppState } from "@/handlers/app-handlers"
import { buildBirthdayList } from "@/lib/birthday-utils"

interface MainAppShellProps {
  actions: AppActions
  state: AppState
}

export function MainAppShell({ actions, state }: MainAppShellProps) {
  const birthdayList = buildBirthdayList(state.profile, state.matches)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        {state.activeTab === "home" ? (
          <HomePage birthdayList={birthdayList} state={state} />
        ) : null}
        {state.activeTab === "all" ? (
          <AllPage birthdayList={birthdayList} />
        ) : null}
        {state.activeTab === "calendar" ? (
          <CalendarPage birthdayList={birthdayList} />
        ) : null}
        {state.activeTab === "settings" ? (
          <SettingsPage actions={actions} state={state} />
        ) : null}
      </div>
      <BottomTabBar actions={actions} activeTab={state.activeTab} />
    </div>
  )
}
