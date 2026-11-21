import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  HeartHandshake,
  Megaphone,
  Radio,
  Sparkles,
  Star,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Skyline } from "@/components/Brand"
import { useApp } from "@/store/AppContext"
import { formatXp } from "@/lib/format"
import { cn } from "@/lib/utils"

const XP_ICONS: Record<string, LucideIcon> = {
  review: Star,
  status: Radio,
  post: Megaphone,
  respond: HeartHandshake,
}

const LEVEL_THEMES = [
  { bg: "#D5F3E6", border: "#9ADFC4", fg: "#137A58" },
  { bg: "#E6D6FF", border: "#B9A2F0", fg: "#6D4FD6" },
  { bg: "#FADCEC", border: "#F5C6DE", fg: "#B03C86" },
  { bg: "#FFE2B8", border: "#F2C98E", fg: "#9A5A0C" },
]

export function LevelsPage() {
  const { me, meta } = useApp()
  const navigate = useNavigate()
  if (!me || !meta) return null

  const levels = meta.levels
  const current = me.level.level

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="relative overflow-hidden px-5 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <Skyline className="pointer-events-none absolute -top-4 right-0 h-[120px] w-[70%] opacity-40" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="pressable relative flex size-9 items-center justify-center rounded-[12px] border border-uni-line bg-white/85 text-uni-brand-deep backdrop-blur"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative mt-4 text-[10px] font-extrabold tracking-[0.14em] text-uni-brand-deep">
          CAMPUS REPUTATION
        </div>
        <h1 className="relative mt-1 text-[28px] font-extrabold leading-none tracking-[-0.035em]">
          Уровни кампуса
        </h1>
        <p className="relative mt-1.5 text-[12px] font-semibold text-uni-muted">
          XP дают за реальную пользу: отзывы, live-статусы, запросы и помощь другим.
        </p>
      </div>

      <div className="space-y-2 px-4 pt-3">
        {levels.map((level, index) => {
          const number = index + 1
          const next = levels[index + 1]
          const theme = LEVEL_THEMES[index] ?? LEVEL_THEMES[1]
          const state = number < current ? "passed" : number === current ? "current" : "future"
          const range = next
            ? `${formatXp(level.min)}–${formatXp(next.min - 1)} XP`
            : `${formatXp(level.min)}+ XP`
          return (
            <div
              key={level.name}
              className={cn(
                "rounded-[20px] border bg-white p-3.5",
                state === "current"
                  ? "border-[#7C5CE0] shadow-[0_8px_26px_rgba(124,92,224,0.14)]"
                  : "border-uni-card-line shadow-[0_4px_14px_rgba(124,92,224,0.06)]",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-[13px] border text-[20px]"
                  style={{ background: theme.bg, borderColor: theme.border }}
                >
                  <span aria-hidden="true">{level.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold leading-tight">{level.name}</div>
                  <div className="text-[11px] font-bold text-uni-muted">{range}</div>
                </div>
                {state === "passed" && (
                  <span className="rounded-full bg-[#E3F6EE] px-2.5 py-1 text-[10px] font-extrabold text-uni-green">
                    <Check size={11} className="mr-0.5 inline" /> пройден
                  </span>
                )}
                {state === "current" && (
                  <span className="rounded-full bg-uni-soft px-2.5 py-1 text-[10px] font-extrabold text-uni-brand-deep">
                    сейчас
                  </span>
                )}
                {state === "future" && (
                  <span className="rounded-full bg-uni-soft/60 px-2.5 py-1 text-[10px] font-extrabold text-uni-muted">
                    дальше
                  </span>
                )}
              </div>

              {state === "current" && (
                <>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-uni-soft-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#B8A2FA] to-[#8ED8F5] shadow-[0_0_14px_rgba(124,92,224,0.3)]"
                      style={{ width: `${Math.max(4, Math.round(me.level.progress * 100))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-bold text-uni-muted">
                    <span>
                      {formatXp(me.level.into)} / {formatXp(me.level.span ?? me.level.into)} XP внутри
                      уровня
                    </span>
                    <span className="font-extrabold text-uni-brand-deep">
                      {me.level.isMax ? "максимум" : `ещё ${formatXp(me.level.toNext)} XP`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}

        <div className="mt-2 rounded-[20px] border border-uni-card-line bg-white p-3.5 shadow-[0_4px_14px_rgba(124,92,224,0.06)]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-uni-brand-deep" />
            <h2 className="text-[15px] font-extrabold">Как зарабатывать XP</h2>
          </div>
          <div className="mt-1 divide-y divide-uni-line-soft">
            {meta.xpRules.map((rule) => {
              const Icon = XP_ICONS[rule.kind] ?? Star
              return (
                <div key={rule.kind} className="flex items-center gap-2.5 py-2.5">
                  <span className="flex size-8 items-center justify-center rounded-[10px] bg-uni-soft text-uni-brand-deep">
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-[12.5px] font-bold">{rule.label}</span>
                  <span className="text-[12px] font-extrabold text-uni-brand-deep">
                    +{rule.points} XP
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <p className="px-2 pt-1 pb-6 text-center text-[10px] font-semibold leading-relaxed text-uni-muted/80">
          Уровни считаются по сумме XP. В рейтинге участвуют все студенты СГУ.
        </p>
      </div>
    </div>
  )
}
