import { useEffect, useState } from "react"
import { ExternalLink, MessageCircle, Zap } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar } from "@/components/Avatar"
import { UserName } from "@/components/UserName"
import { api } from "@/lib/api"
import type { UserMini, UserProfile } from "@/lib/types"
import { formatXp } from "@/lib/format"

type Props = {
  user: UserMini | null
  onOpenChange: (open: boolean) => void
}

export function UserProfileSheet({ user, onOpenChange }: Props) {
  const open = user !== null
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    setLoading(true)
    api
      .userProfile(user.username)
      .then((response) => setProfile(response as unknown as UserProfile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [user?.username])

  const progress = profile ? Math.round((profile.level.progress ?? 0) * 100) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="sheet-surface mx-auto max-h-[88dvh] w-full max-w-[430px] gap-0 overflow-y-auto bg-white px-5 pt-2.5 pb-[max(22px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-uni-line" />

        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="size-10 animate-spin rounded-full border-2 border-uni-line border-t-uni-brand" />
            <span className="text-[12px] font-bold text-uni-muted">Загружаем профиль…</span>
          </div>
        )}

        {!loading && !profile && user && (
          <div className="py-10 text-center text-[13px] font-bold text-uni-muted">
            Не удалось загрузить профиль
          </div>
        )}

        {!loading && profile && (
          <>
            <SheetHeader className="p-0">
              <div className="flex items-start gap-3.5">
                <Avatar name={profile.name} src={profile.avatar} size={62} radius={20} fire={profile.level.level >= 4} className="shrink-0 shadow-[0_6px_18px_rgba(124,92,224,0.2)]" />
                <div className="min-w-0 flex-1 pt-1">
                  <SheetTitle className="truncate text-[20px] tracking-[-0.02em]">
                    <UserName name={profile.name} emoji={profile.emoji} level={profile.level.level} className="text-[20px]" />
                    {profile.isMe && (
                      <span className="ml-2 rounded-full bg-uni-soft-2 px-2 py-0.5 text-[9px] font-extrabold text-uni-brand-deep align-middle">
                        Это вы
                      </span>
                    )}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 truncate text-[11.5px] font-semibold text-uni-muted">
                    {profile.university} · {profile.faculty}
                  </SheetDescription>
                  <div className="mt-1 text-[11px] font-bold text-uni-muted">
                    @{profile.username}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* XP / level */}
            <div className="mt-4 rounded-[18px] border border-[#B9A2F0] bg-white p-3 shadow-[0_6px_18px_rgba(124,92,224,0.08)]">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-extrabold">
                  {profile.level.emoji} {profile.level.name}
                </div>
                <div className="text-[13px] font-extrabold text-uni-brand-deep">
                  {formatXp(profile.xp)} XP
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-uni-soft-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B8A2FA] to-[#8ED8F5] transition-[width] duration-700"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] font-bold text-uni-muted">
                Уровень {profile.level.level}
                {profile.level.nextName && ` · до «${profile.level.nextName}» ещё ${formatXp(profile.level.toNext)} XP`}
              </div>
            </div>

            {/* stats */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: "Отзывы", value: profile.counts.reviews },
                { label: "Статусы", value: profile.counts.statuses },
                { label: "Запросы", value: profile.counts.posts },
                { label: "Отклики", value: profile.counts.responses },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[14px] border border-uni-line-soft bg-white px-1.5 py-2.5 text-center"
                >
                  <div className="text-[16px] font-extrabold leading-none text-uni-brand-deep">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-[9px] font-bold text-uni-muted">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* links */}
            <div className="mt-3 space-y-2">
              {profile.telegram && (
                <a
                  href={`https://t.me/${profile.telegram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center gap-2.5 rounded-[14px] border border-uni-line bg-white px-3.5 text-[13px] font-extrabold text-uni-cyan no-underline"
                >
                  <MessageCircle size={16} className="shrink-0" />
                  <span className="truncate">@{profile.telegram}</span>
                  <ExternalLink size={12} className="ml-auto shrink-0 text-uni-muted" />
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center gap-2.5 rounded-[14px] border border-uni-line bg-white px-3.5 text-[13px] font-extrabold text-uni-ink no-underline"
                >
                  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.112-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
                  </svg>
                  <span className="truncate">{profile.github.replace(/^https?:\/\/github\.com\//, "")}</span>
                  <ExternalLink size={12} className="ml-auto shrink-0 text-uni-muted" />
                </a>
              )}
              {profile.maxsite && (
                <a
                  href={profile.maxsite}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center gap-2.5 rounded-[14px] border border-uni-line bg-white px-3.5 text-[13px] font-extrabold text-uni-ink no-underline"
                >
                  <Zap size={16} className="shrink-0 text-uni-brand" />
                  <span className="truncate">
                    {profile.maxsite.replace(/^https?:\/\/(vk\.com|max\.ru)\//, (_, host) => `${host}/`)}
                  </span>
                  <ExternalLink size={12} className="ml-auto shrink-0 text-uni-muted" />
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
