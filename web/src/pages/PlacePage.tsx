import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Clock, MapPin, RefreshCw, Star } from "lucide-react"
import { KIND_META } from "@/components/KindBadge"
import { Stars } from "@/components/Stars"
import { Avatar } from "@/components/Avatar"
import { UserName } from "@/components/UserName"
import { Countdown } from "@/components/Countdown"
import { StatusSheet } from "@/components/StatusSheet"
import { ReviewSheet } from "@/components/ReviewSheet"
import { UserProfileSheet } from "@/components/UserProfileSheet"
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import { formatDistance, plural, timeAgo } from "@/lib/format"
import { useNow } from "@/lib/useNow"
import { cn } from "@/lib/utils"
import type { UserMini } from "@/lib/types"

export function PlacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { places, position, applyPlace } = useApp()
  const { toast } = useToast()
  const placeId = Number(id)
  const cached = places.find((place) => place.id === placeId) ?? null
  const [place, setPlace] = useState(cached)
  const [loading, setLoading] = useState(!cached)
  const [statusOpen, setStatusOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [profileUser, setProfileUser] = useState<UserMini | null>(null)
  const now = useNow(30000)

  useEffect(() => {
    if (!Number.isFinite(placeId)) return
    let cancelled = false
    setLoading(!place)
    api
      .place(placeId, position?.lat, position?.lng)
      .then((response) => {
        if (cancelled) return
        setPlace(response.place)
        applyPlace(response.place)
      })
      .catch((exception) => {
        if (cancelled) return
        toast(exception instanceof Error ? exception.message : "Место не найдено", "error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId, position?.lat, position?.lng])

  if (!place) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => navigate("/map")}
            className="flex size-10 items-center justify-center rounded-[13px] border border-uni-line bg-white text-uni-brand-deep"
            aria-label="Назад"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="text-[15px] font-extrabold">Карточка места</div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-uni-muted">
            <RefreshCw className={cn("size-6", loading && "animate-spin")} />
            <span className="text-[12px] font-bold">
              {loading ? "Загружаем место…" : "Место не найдено"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const kind = KIND_META[place.kind] ?? KIND_META.event
  const Icon = kind.icon
  const status = place.status
  const reviews = place.reviews ?? []

  return (
    <div className="no-scrollbar h-full overflow-y-auto">
      <div
        className="relative h-[184px] shrink-0 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${kind.bg} 0%, #EFE9FF 68%, #F6F1FF 100%)` }}
      >
        <div className="absolute inset-0 bg-grid opacity-40" />
        <svg
          viewBox="0 0 390 184"
          className="absolute inset-0 h-full w-full opacity-40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-20 150C70 120 160 170 250 140T420 120"
            fill="none"
            stroke={kind.fg}
            strokeOpacity="0.25"
            strokeWidth="2"
          />
          <path
            d="M-20 40C80 70 170 20 260 50T420 30"
            fill="none"
            stroke={kind.fg}
            strokeOpacity="0.18"
            strokeWidth="2"
          />
        </svg>
        <Icon
          size={158}
          strokeWidth={1.2}
          className="absolute -right-3 top-6 opacity-[0.13]"
          style={{ color: kind.fg }}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-uni-bg to-transparent" />

        <button
          type="button"
          onClick={() => navigate("/map")}
          aria-label="Назад к карте"
          className="pressable absolute top-[max(14px,env(safe-area-inset-top))] left-4 flex size-10 items-center justify-center rounded-[13px] border border-white/70 bg-white/90 text-uni-brand-deep shadow-[0_6px_18px_rgba(124,92,224,0.18)] backdrop-blur"
        >
          <ArrowLeft size={19} />
        </button>

        <div className="absolute inset-x-5 bottom-3">
          <div className="text-[10px] font-extrabold tracking-[0.14em]" style={{ color: kind.fg }}>
            {place.kindLabel.toUpperCase()} · {place.university}
          </div>
          <h1 className="mt-1 text-[21px] font-extrabold leading-tight tracking-[-0.025em] text-uni-ink">
            {place.name}
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-bold text-uni-muted">
            <MapPin size={13} />
            {place.address}
            {place.distanceM != null && <span>· {formatDistance(place.distanceM)}</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] border border-uni-line-soft bg-white p-3">
            <div className="flex items-center gap-1.5 text-[16px] font-extrabold text-uni-cyan">
              <Clock size={15} />
              {status ? <Countdown expiresAt={status.expiresAt} /> : "—"}
            </div>
            <div className="text-[10.5px] font-bold text-uni-muted">
              {status ? "статус актуален" : "нет live-статуса"}
            </div>
          </div>
          <div className="rounded-[16px] border border-uni-line-soft bg-white p-3">
            <div className="flex items-center gap-1.5 text-[16px] font-extrabold text-uni-orange-deep">
              <Star size={15} fill="#F5A94A" stroke="#F5A94A" />
              {place.rating ? String(place.rating).replace(".", ",") : "—"}
            </div>
            <div className="text-[10.5px] font-bold text-uni-muted">
              {place.reviewCount} {plural(place.reviewCount, "отзыв", "отзыва", "отзывов")}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-[#B9A2F0] bg-white p-3.5 shadow-[0_8px_24px_rgba(124,92,224,0.09)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold tracking-[0.08em] text-uni-muted">
              ЧТО СЕЙЧАС
            </span>
            {status && (
              <span className="text-[11px] font-extrabold text-uni-brand-deep">
                <Countdown expiresAt={status.expiresAt} />
              </span>
            )}
          </div>
          {status ? (
            <>
              <div className="mt-2 flex items-start gap-2.5">
                <button type="button" onClick={() => setProfileUser(status.author)} className="shrink-0">
                  <Avatar name={status.author.name} src={status.author.avatar} size={34} radius={11} fire={status.author.levelNum >= 4} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-extrabold leading-snug">
                    {status.typeLabel}
                    {status.spots != null && status.type === "free" ? ` · ${status.spots} мест` : ""}
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold leading-snug text-uni-muted">
                    {status.text || "Без комментария"}
                  </div>
                  <button type="button" onClick={() => setProfileUser(status.author)} className="mt-1 text-left text-[10.5px] font-bold text-uni-muted">
                    <UserName name={status.author.name} emoji={status.author.emoji} level={status.author.levelNum} className="text-[10.5px]" /> · {timeAgo(status.createdAt, now)}
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-uni-soft-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C5CE0] to-[#3BB8D8] transition-[width] duration-700"
                  style={{
                    width: `${Math.max(
                      4,
                      Math.min(100, (status.secondsLeft / (status.ttlMinutes * 60)) * 100),
                    )}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-[12.5px] font-semibold text-uni-muted">
              Пока никто не отметил это место. Обнови статус — и карта оживёт.
            </p>
          )}
          <button
            type="button"
            onClick={() => setStatusOpen(true)}
            className="pressable mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-uni-brand text-[12.5px] font-extrabold text-white shadow-[0_0_16px_rgba(124,92,224,0.18)]"
          >
            <RefreshCw size={14} /> Обновить статус · +10 XP
          </button>
        </div>

        {place.description && (
          <p className="mt-3 px-1 text-[12.5px] font-semibold leading-relaxed text-uni-muted-2">
            {place.description}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">Отзывы студентов</h2>
          <span className="rounded-full bg-uni-soft-2 px-2.5 py-1 text-[10.5px] font-extrabold text-uni-brand-deep">
            Сначала новые
          </span>
        </div>

        <div className="mt-2.5 space-y-2.5 pb-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[18px] border border-uni-card-line bg-white p-3.5 shadow-[0_6px_18px_rgba(124,92,224,0.07)]"
            >
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setProfileUser(review.author)} className="shrink-0">
                  <Avatar name={review.author.name} src={review.author.avatar} size={34} radius={11} fire={review.author.levelNum >= 4} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setProfileUser(review.author)} className="truncate text-left">
                      <UserName name={review.author.name} emoji={review.author.emoji} level={review.author.levelNum} className="text-[13px]" />
                    </button>
                    {review.isMine && (
                      <span className="rounded-full bg-uni-soft-2 px-1.5 py-0.5 text-[9px] font-extrabold text-uni-brand-deep">
                        мой отзыв
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[10.5px] font-bold text-uni-muted">
                    {review.author.university} · {review.author.faculty}
                  </div>
                </div>
                <Stars value={review.rating} size={13} />
              </div>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-uni-ink">
                {review.comment}
              </p>
              <div className="mt-1 text-[10px] font-bold text-uni-muted">
                {timeAgo(review.createdAt, now)}
              </div>
            </article>
          ))}

          {!reviews.length && (
            <div className="rounded-[18px] border border-dashed border-uni-line bg-white/60 px-4 py-6 text-center">
              <div className="text-[13.5px] font-extrabold">Отзывов пока нет</div>
              <p className="mt-1 text-[11.5px] font-semibold text-uni-muted">
                Стань первым, кто расскажет о месте — и получи +15 XP.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="pressable mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#B9A2F0] bg-white text-[14px] font-extrabold text-uni-brand-deep"
          >
            {reviews.some((review) => review.isMine) ? "Изменить мой отзыв" : "Оставить отзыв"}
          </button>
        </div>
      </div>

      <StatusSheet
        open={statusOpen}
        onOpenChange={setStatusOpen}
        defaultPlaceId={place.id}
        onSaved={(updated) =>
          setPlace((previous) =>
            previous ? { ...updated, reviews: previous.reviews } : updated,
          )
        }
      />
      <ReviewSheet
        place={place}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onSaved={(updated) => setPlace(updated)}
      />
      <UserProfileSheet user={profileUser} onOpenChange={(open) => !open && setProfileUser(null)} />
    </div>
  )
}
