import {
  BookOpen,
  Coffee,
  Laptop,
  Sparkles,
  Trees,
  Trophy,
  Utensils,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const KIND_META: Record<
  string,
  { icon: LucideIcon; bg: string; fg: string; border: string; label: string }
> = {
  library: {
    icon: BookOpen,
    bg: "#BFF0DC",
    fg: "#137A58",
    border: "#9ADFC4",
    label: "Библиотека",
  },
  study: {
    icon: Laptop,
    bg: "#EBE3FF",
    fg: "#6D4FD6",
    border: "#C9B8F5",
    label: "Коворкинг",
  },
  cafe: { icon: Coffee, bg: "#BDE4F2", fg: "#0F7B94", border: "#9ED7EC", label: "Кофейня" },
  food: { icon: Utensils, bg: "#FFDDB0", fg: "#9A5A0C", border: "#F2C98E", label: "Столовая" },
  sport: { icon: Trophy, bg: "#FFC9E3", fg: "#B03C86", border: "#F2A9D2", label: "Спорт" },
  event: {
    icon: Sparkles,
    bg: "#D9CCFF",
    fg: "#6D4FD6",
    border: "#B9A2F0",
    label: "Событие",
  },
  rest: { icon: Trees, bg: "#D5F3E6", fg: "#137A58", border: "#9ADFC4", label: "Отдых" },
}

export function KindBadge({
  kind,
  size = 38,
  radius = 12,
}: {
  kind: string
  size?: number
  radius?: number
}) {
  const meta = KIND_META[kind] ?? KIND_META.event
  const Icon = meta.icon
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.fg,
      }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2.1} />
    </span>
  )
}
