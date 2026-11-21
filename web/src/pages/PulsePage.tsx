import { useMemo, useState } from "react"
import { ArrowLeftRight, AudioLines, HeartHandshake, MapPin, Plus, Send, Trash2, Users } from "lucide-react"
import { Avatar } from "@/components/Avatar"
import { UserName } from "@/components/UserName"
import { Chip } from "@/components/Chip"
import { PostSheet } from "@/components/PostSheet"
import { RespondSheet } from "@/components/RespondSheet"
import { UserProfileSheet } from "@/components/UserProfileSheet"
import { useToast } from "@/components/ToastProvider"
import { useApp } from "@/store/AppContext"
import { api } from "@/lib/api"
import { formatDistance, plural, timeAgo } from "@/lib/format"
import { useNow } from "@/lib/useNow"
import type { Post, UserMini } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORY_STYLE: Record<
  string,
  { tagBg: string; tagFg: string; border: string; icon: typeof Users }
> = {
  activity: {
    tagBg: "rgba(59,184,216,0.16)",
    tagFg: "#0F7B94",
    border: "#BDE4F2",
    icon: Users,
  },
  exchange: {
    tagBg: "rgba(245,169,74,0.18)",
    tagFg: "#9A5A0C",
    border: "#F2D9AE",
    icon: ArrowLeftRight,
  },
  help: {
    tagBg: "rgba(238,125,184,0.16)",
    tagFg: "#B03C86",
    border: "#F5C6DE",
    icon: HeartHandshake,
  },
}

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "activity", label: "Активности" },
  { key: "exchange", label: "Обмен" },
  { key: "help", label: "Помощь" },
]

export function PulsePage() {
  const { posts, removePost } = useApp()
  const { toast } = useToast()
  const now = useNow(30000)
  const [filter, setFilter] = useState("all")
  const [postOpen, setPostOpen] = useState(false)
  const [respondTo, setRespondTo] = useState<Post | null>(null)
  const [profileUser, setProfileUser] = useState<UserMini | null>(null)

  const visible = useMemo(
    () => (filter === "all" ? posts : posts.filter((post) => post.category === filter)),
    [posts, filter],
  )

  const deletePost = async (post: Post) => {
    if (!window.confirm("Удалить свой запрос из ленты?")) return
    try {
      await api.deletePost(post.id)
      removePost(post.id)
      toast("Запрос удалён")
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось удалить", "error")
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.14em] text-uni-cyan">
            <AudioLines size={12} />
            РЯДОМ · {visible.length} {plural(visible.length, "ЗАПРОС", "ЗАПРОСА", "ЗАПРОСОВ")}
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.035em]">Pulse</h1>
          <p className="mt-1 text-[11.5px] font-bold text-uni-muted">
            Компания, обмен и помощь без ценников
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPostOpen(true)}
          aria-label="Создать запрос"
          className="pressable mt-1 flex size-10 items-center justify-center rounded-[14px] bg-uni-cyan text-white shadow-[0_8px_22px_rgba(15,123,148,0.28)]"
        >
          <Plus size={20} strokeWidth={2.6} />
        </button>
      </header>

      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-5 pb-2.5">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            tone="cyan"
            active={filter === item.key}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 pb-5">
        {visible.map((post) => {
          const style = CATEGORY_STYLE[post.category] ?? CATEGORY_STYLE.activity
          const CategoryIcon = style.icon
          return (
            <article
              key={post.id}
              className="animate-float-in rounded-[20px] border bg-white p-3.5 shadow-[0_6px_20px_rgba(124,92,224,0.09)]"
              style={{ borderColor: style.border }}
            >
                <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setProfileUser(post.author)} className="shrink-0">
                  <Avatar name={post.author.name} src={post.author.avatar} size={38} radius={13} fire={post.author.levelNum >= 4} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setProfileUser(post.author)} className="truncate text-left">
                      <UserName name={post.author.name} emoji={post.author.emoji} level={post.author.levelNum} className="text-[13.5px]" />
                    </button>
                    {post.isMine && (
                      <span className="rounded-full bg-uni-soft-2 px-1.5 py-0.5 text-[9px] font-extrabold text-uni-brand-deep">
                        Я
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] font-bold text-uni-muted">
                    {post.author.university} · {post.author.faculty} ·{" "}
                    {timeAgo(post.createdAt, now)}
                  </div>
                </div>
                {post.distanceM != null && (
                  <span className="shrink-0 rounded-full bg-uni-soft px-2 py-1 text-[10.5px] font-extrabold text-uni-muted-2">
                    {formatDistance(post.distanceM)}
                  </span>
                )}
                {post.isMine && (
                  <button
                    type="button"
                    aria-label="Удалить запрос"
                    onClick={() => void deletePost(post)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-uni-muted active:bg-uni-soft"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <p className="mt-2.5 text-[15.5px] font-bold leading-snug text-uni-ink">
                {post.text}
              </p>

              {post.place && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-uni-muted">
                  <MapPin size={12} />
                  {post.place.name}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-extrabold"
                  style={{ background: style.tagBg, color: style.tagFg }}
                >
                  <CategoryIcon size={12} />
                  {post.categoryLabel}
                </span>
                {post.responders > 0 && (
                  <span className="text-[10.5px] font-bold text-uni-muted">
                    {post.responders} откл.
                  </span>
                )}
                <span className="ml-auto text-[10px] font-bold text-uni-muted">
                  ещё {post.minutesLeft}
                </span>
                {!post.isMine &&
                  (post.responded ? (
                    <button
                      type="button"
                      onClick={() => setRespondTo(post)}
                      className="pressable inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#BDE4F2] bg-[#EAF6FB] px-3 text-[11.5px] font-extrabold text-uni-cyan"
                    >
                      <Send size={13} /> Telegram
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRespondTo(post)}
                      className={cn(
                        "pressable inline-flex h-9 items-center gap-1.5 rounded-[12px] bg-[#1678AF] px-3.5 text-[11.5px] font-extrabold text-white",
                        "shadow-[0_6px_16px_rgba(22,120,175,0.22)]",
                      )}
                    >
                      <Send size={13} /> Откликнуться
                    </button>
                  ))}
              </div>
            </article>
          )
        })}

        {!visible.length && (
          <div className="mt-10 flex flex-col items-center gap-3 px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-[18px] border border-uni-line bg-white text-uni-cyan">
              <AudioLines size={26} />
            </div>
            <div>
              <div className="text-[16px] font-extrabold">Пока тихо</div>
              <p className="mt-1 text-[12.5px] font-semibold text-uni-muted">
                Создай первый запрос — кто-то рядом точно ищет компанию.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPostOpen(true)}
              className="pressable inline-flex h-10 items-center gap-2 rounded-[13px] bg-uni-cyan px-4 text-[12.5px] font-extrabold text-white"
            >
              <Plus size={16} /> Создать запрос
            </button>
          </div>
        )}
      </div>

      <PostSheet open={postOpen} onOpenChange={setPostOpen} />
      <RespondSheet post={respondTo} onOpenChange={(open) => !open && setRespondTo(null)} />
      <UserProfileSheet user={profileUser} onOpenChange={(open) => !open && setProfileUser(null)} />
    </div>
  )
}
