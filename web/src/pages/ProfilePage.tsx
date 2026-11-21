import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ChevronRight,
  HeartHandshake,
  LogOut,
  Megaphone,
  Radio,
  Settings,
  Star,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Avatar } from "@/components/Avatar"
import { UserName } from "@/components/UserName"
import { SkylinePulse } from "@/components/Brand"
import { EditProfileSheet } from "@/components/EditProfileSheet"
import { useApp } from "@/store/AppContext"
import { formatXp } from "@/lib/format"
import type { Achievement } from "@/lib/types"
import { cn } from "@/lib/utils"

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  radio: Radio,
  heart: HeartHandshake,
  megaphone: Megaphone,
  zap: Zap,
}

const MEDALS = ["#B07200", "#7C8BA8", "#B5622A"]

export function ProfilePage() {
  const { me, leaderboard, logout } = useApp()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  if (!me) return null

  const board = leaderboard
  const entries = board?.entries ?? []
  const top = entries.slice(0, 5)
  const myEntry = board?.me ?? null
  const unlocked = me.achievements.filter((item) => item.unlocked).length
  const progress = Math.round((me.level.progress ?? 0) * 100)

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div className="relative h-[96px] overflow-hidden bg-[#E3D9FF]">
        <SkylinePulse className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-uni-bg to-transparent" />
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="Настройки профиля"
          className="pressable absolute top-[max(12px,env(safe-area-inset-top))] right-4 flex size-9 items-center justify-center rounded-[12px] border border-white/70 bg-white/85 text-uni-brand-deep backdrop-blur"
        >
          <Settings size={17} />
        </button>
      </div>

      <div className="relative px-5">
          <div className="-mt-7 flex items-end gap-3">
          <Avatar
            name={me.name}
            src={me.avatar}
            size={68}
            radius={20}
            fire={me.level.level >= 4}
            className="shadow-[0_8px_24px_rgba(124,92,224,0.25)]"
          />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-[22px] leading-tight tracking-[-0.02em]">
              <UserName name={me.name} emoji={me.emoji} level={me.level.level} className="text-[22px]" />
            </h1>
            <div className="truncate text-[11.5px] font-bold text-uni-muted">
              {me.university} · {me.faculty} ·{" "}
              <a
                href={`https://t.me/${me.telegram}`}
                target="_blank"
                rel="noreferrer"
                className="text-uni-cyan no-underline"
              >
                @{me.telegram}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-[#B9A2F0] bg-white p-3.5 shadow-[0_8px_24px_rgba(124,92,224,0.1)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[9.5px] font-extrabold tracking-[0.13em] text-uni-muted">
                УРОВЕНЬ {me.level.level}
              </div>
              <div className="mt-0.5 text-[19px] font-extrabold leading-tight">
                {me.level.emoji} {me.level.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-extrabold text-uni-brand-deep">
                {formatXp(me.xp)} XP
              </div>
              <div className="text-[10px] font-bold text-uni-muted">
                {me.level.nextMin ? `из ${formatXp(me.level.nextMin)}` : "максимум"}
              </div>
            </div>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-uni-soft-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B8A2FA] to-[#8ED8F5] shadow-[0_0_14px_rgba(124,92,224,0.3)] transition-[width] duration-700"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-bold">
            <span className="text-uni-muted">
              {me.level.isMax
                ? "Ты на вершине кампуса"
                : `${formatXp(me.level.toNext)} XP до «${me.level.nextName}»`}
            </span>
            <Link
              to="/levels"
              className="inline-flex items-center gap-0.5 font-extrabold text-uni-brand-deep no-underline"
            >
              Уровни <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {[
            { label: "Отзывы", value: me.counts.reviews },
            { label: "Статусы", value: me.counts.statuses },
            { label: "Отклики", value: me.counts.responses },
            { label: "Запросы", value: me.counts.posts },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[14px] border border-uni-line-soft bg-white px-1.5 py-2 text-center"
            >
              <div className="text-[16px] font-extrabold leading-none text-uni-brand-deep">
                {stat.value}
              </div>
              <div className="mt-0.5 text-[9px] font-bold text-uni-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">Достижения</h2>
          <span className="text-[10.5px] font-extrabold text-uni-muted">
            {unlocked} из {me.achievements.length}
          </span>
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {me.achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-[-0.01em]">Топ студентов</h2>
            <p className="text-[10.5px] font-bold text-uni-muted">СГУ · рейтинг по XP</p>
          </div>
          <Link
            to="/levels"
            className="text-[10.5px] font-extrabold text-uni-brand-deep"
          >
            Все уровни
          </Link>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-[20px] border border-uni-card-line bg-white px-3 shadow-[0_6px_18px_rgba(124,92,224,0.07)]">
          {top.map((entry, index) => (
            <div
              key={entry.user.id}
              className={cn(
                "flex items-center gap-2.5 py-2.5",
                index > 0 && "border-t border-uni-line-soft",
                entry.isMe && "-mx-3 rounded-[14px] border border-[#B9A2F0] bg-uni-soft px-3",
              )}
            >
              <span
                className="w-5 text-center text-[12px] font-extrabold"
                style={{ color: MEDALS[index] ?? "#6F628F" }}
              >
                {entry.rank}
              </span>
              <Avatar name={entry.user.name} src={entry.user.avatar} size={32} radius={10} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-extrabold">
                  {entry.isMe ? "Вы" : entry.user.name}
                </div>
                <div className="truncate text-[10px] font-bold text-uni-muted">
                  {entry.user.university} · {entry.user.faculty}
                </div>
              </div>
              <span className="text-[12px] font-extrabold text-uni-brand-deep">
                {formatXp(entry.xp)} XP
              </span>
            </div>
          ))}

          {myEntry && !top.some((entry) => entry.isMe) && (
            <div className="-mx-3 mt-1 mb-2 flex items-center gap-2.5 rounded-[14px] border border-[#B9A2F0] bg-uni-soft px-3 py-2.5">
              <span className="w-5 text-center text-[12px] font-extrabold text-uni-brand-deep">
                {myEntry.rank}
              </span>
              <Avatar name={me.name} src={me.avatar} size={32} radius={10} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-extrabold">Вы</div>
                <div className="text-[10px] font-bold text-uni-muted">
                  {me.university} · {me.faculty}
                </div>
              </div>
              <span className="text-[12px] font-extrabold text-uni-brand-deep">
                {formatXp(me.xp)} XP
              </span>
            </div>
          )}

          {!entries.length && (
            <div className="py-6 text-center text-[12px] font-bold text-uni-muted">
              Рейтинг пока пуст
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 pb-6">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-uni-line bg-white text-[13px] font-extrabold text-uni-brand-deep"
          >
            <Settings size={15} /> Редактировать профиль
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate("/auth", { replace: true })
            }}
            className="pressable flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#F0C4C4] bg-[#FFF7F7] text-[13px] font-extrabold text-[#A33A3A]"
          >
            <LogOut size={15} /> Выйти
          </button>
          <p className="pt-1 text-center text-[9.5px] font-bold text-uni-muted/80">
            nearby · кампус СГУ · Саратов
          </p>
        </div>
      </div>

      <EditProfileSheet open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Star
  return (
    <div className="flex w-[64px] shrink-0 flex-col items-center gap-1">
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full border",
          achievement.unlocked
            ? "border-[#7C5CE0] bg-[#EFE8FF] text-uni-brand-deep shadow-[0_0_14px_rgba(124,92,224,0.18)]"
            : "border-uni-line bg-uni-soft/60 text-uni-line",
        )}
        aria-label={`${achievement.title}: ${achievement.unlocked ? "получено" : "не получено"}`}
      >
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <span
        className={cn(
          "text-center text-[9px] font-bold leading-tight",
          achievement.unlocked ? "text-uni-muted-2" : "text-uni-muted/60",
        )}
      >
        {achievement.title}
      </span>
    </div>
  )
}
