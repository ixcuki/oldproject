import { AudioLines, Map, Sparkles, UserRound } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const tabs = [
  {
    to: "/map",
    match: ["/map", "/place"],
    label: "Карта",
    icon: Map,
    color: "#137A58",
    soft: "#E3F6EE",
  },
  {
    to: "/pulse",
    match: ["/pulse"],
    label: "Pulse",
    icon: AudioLines,
    color: "#0F7B94",
    soft: "#E1F3FA",
  },
  {
    to: "/ai",
    match: ["/ai"],
    label: "AI",
    icon: Sparkles,
    color: "#B03C86",
    soft: "#FBE7F2",
  },
  {
    to: "/profile",
    match: ["/profile", "/levels"],
    label: "Профиль",
    icon: UserRound,
    color: "#6D4FD6",
    soft: "#EFE8FF",
  },
]

export function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      className="relative z-30 flex shrink-0 items-stretch justify-around border-t border-uni-line-soft bg-white px-1.5 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]"
      aria-label="Основная навигация"
    >
      {tabs.map((tab) => {
        const active = tab.match.some((prefix) => pathname.startsWith(prefix))
        const Icon = tab.icon
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? "page" : undefined}
            className="pressable flex min-h-[52px] min-w-[72px] flex-col items-center justify-center gap-0.5 no-underline"
          >
            <span
              className="flex h-7 w-14 items-center justify-center rounded-[11px] transition-colors"
              style={{ background: active ? tab.soft : "transparent" }}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 2}
                style={{ color: active ? tab.color : "#6F628F" }}
              />
            </span>
            <span
              className={cn("text-[11px] font-extrabold")}
              style={{ color: active ? tab.color : "#6F628F" }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
