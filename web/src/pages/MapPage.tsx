import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronRight, Plus, Star, Users } from "lucide-react"
import { CampusMap, filterPlaces } from "@/components/CampusMap"
import type { MapFilter } from "@/components/CampusMap"
import { Chip } from "@/components/Chip"
import { Avatar } from "@/components/Avatar"
import { KindBadge } from "@/components/KindBadge"
import { Countdown, LiveDot } from "@/components/Countdown"
import { Button } from "@/components/ui/button"
import { StatusSheet } from "@/components/StatusSheet"
import { useApp } from "@/store/AppContext"
import { formatDistance, plural, statusSummary } from "@/lib/format"
import { cn } from "@/lib/utils"

const FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "places", label: "Места" },
  { key: "players", label: "Спорт" },
  { key: "events", label: "События" },
]

export function MapPage() {
  const { places, me, meta, position, locate } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<MapFilter>("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)

  const focusIds = useMemo(
    () =>
      (params.get("focus") ?? "")
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    [params],
  )

  const visible = useMemo(() => filterPlaces(places, filter), [places, filter])
  const selected = places.find((place) => place.id === selectedId) ?? null
  const center = meta?.center ?? { lat: 51.5385, lng: 46.0078 }
  const liveCount = places.filter((place) => place.status).length

  useEffect(() => {
    if (!places.length) return
    const currentVisible = selectedId ? visible.some((place) => place.id === selectedId) : false
    if (currentVisible) return
    const next = focusIds.find((id) => places.some((place) => place.id === id))
    const fallback = visible.find((place) => place.status) ?? visible[0]
    setSelectedId(next ?? fallback?.id ?? null)
  }, [places, visible, selectedId, focusIds])

  const openStatus = () => setStatusOpen(true)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.14em] text-uni-green">
            <LiveDot className="text-uni-green" />
            LIVE CAMPUS · СГУ
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.035em] text-uni-ink">
            near<span className="text-[#8B6CF0]">by</span>
          </h1>
          <p className="mt-1 text-[11.5px] font-bold text-uni-muted">
            {liveCount} {plural(liveCount, "live-статус", "live-статуса", "live-статусов")} ·{" "}
            {places.length} {plural(places.length, "место", "места", "мест")} рядом
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={openStatus}
            aria-label="Создать live-статус"
            className="pressable flex size-10 items-center justify-center rounded-[14px] bg-uni-brand text-white shadow-[0_8px_22px_rgba(124,92,224,0.32)]"
          >
            <Plus size={20} strokeWidth={2.6} />
          </button>
          <Link to="/profile" aria-label="Профиль">
            <Avatar
              name={me?.name ?? "Студент"}
              src={me?.avatar}
              size={40}
              className="shadow-[0_4px_14px_rgba(124,92,224,0.18)]"
            />
          </Link>
        </div>
      </header>

      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-5 pb-2.5">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            active={filter === item.key}
            tone="green"
            onClick={() => setFilter(item.key)}
          >
            {item.key === "players" && <Users size={14} />}
            {item.label}
            {item.key === "all" && liveCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-extrabold">
                {liveCount}
              </span>
            )}
          </Chip>
        ))}
      </div>

      <div className="relative mx-4 mb-2 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-uni-card-line bg-[#EFE9FF] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]">
        <CampusMap
          places={places}
          position={position}
          selectedId={selectedId}
          focusIds={focusIds}
          filter={filter}
          center={center}
          onSelect={(place) => setSelectedId(place?.id ?? null)}
          onLocate={() => void locate()}
        />

        {visible.length === 0 && (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 z-[800] -translate-y-1/2 rounded-2xl border border-uni-line bg-white/95 px-4 py-4 text-center shadow-lg">
            <div className="text-[13px] font-extrabold">Здесь пока пусто</div>
            <p className="mt-1 text-[11.5px] font-semibold text-uni-muted">
              Создай первый live-статус — карта оживёт.
            </p>
          </div>
        )}

        {selected && (
          <div className="animate-float-in absolute inset-x-2.5 bottom-2.5 z-[800] rounded-[20px] border border-[#B9A2F0] bg-white p-3 shadow-[0_12px_32px_rgba(64,44,120,0.2)]">
            <div className="flex items-start gap-2.5">
              <KindBadge kind={selected.kind} size={38} />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate(`/place/${selected.id}`)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center gap-1">
                    <span className="line-clamp-2 text-[14.5px] font-extrabold leading-tight">
                      {selected.name}
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-uni-muted" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-uni-muted">
                    <span>{selected.kindLabel}</span>
                    <span>·</span>
                    <span>
                      {selected.distanceM != null
                        ? formatDistance(selected.distanceM)
                        : selected.address}
                    </span>
                  </div>
                </button>
              </div>
              <div className="flex flex-col items-end gap-0.5 pt-0.5">
                <div className="flex items-center gap-1 text-[13px] font-extrabold text-uni-orange-deep">
                  <Star size={12} fill="#F5A94A" stroke="#F5A94A" />
                  {selected.rating ? String(selected.rating).replace(".", ",") : "—"}
                </div>
                <span className="text-[10px] font-bold text-uni-muted">
                  {selected.reviewCount}{" "}
                  {plural(selected.reviewCount, "отзыв", "отзыва", "отзывов")}
                </span>
              </div>
            </div>

            {selected.status ? (
              <div className="mt-2 flex items-center gap-2 rounded-[12px] bg-uni-soft px-2.5 py-2">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    selected.status.tone === "green" && "bg-uni-green",
                    selected.status.tone === "cyan" && "bg-uni-cyan",
                    selected.status.tone === "pink" && "bg-uni-pink",
                    selected.status.tone === "orange" && "bg-uni-orange",
                    selected.status.tone === "purple" && "bg-uni-brand",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold text-uni-ink">
                  {statusSummary(selected.status)}
                  {selected.status.text ? ` · ${selected.status.text}` : ""}
                </span>
                <Countdown
                  expiresAt={selected.status.expiresAt}
                  className="shrink-0 text-[11px] font-extrabold text-uni-brand-deep"
                />
              </div>
            ) : (
              <div className="mt-2 rounded-[12px] bg-uni-soft px-2.5 py-2 text-[11.5px] font-bold text-uni-muted">
                Пока нет live-статуса — стань первым
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <Button
                type="button"
                onClick={openStatus}
                className="pressable h-10 flex-1 rounded-[12px] bg-uni-brand text-[12.5px] font-extrabold text-white shadow-[0_0_16px_rgba(124,92,224,0.2)] hover:bg-uni-brand-deep"
              >
                Обновить статус · +10 XP
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Открыть карточку места"
                onClick={() => navigate(`/place/${selected.id}`)}
                className="size-10 rounded-[12px] border-uni-line bg-white p-0 text-uni-brand-deep hover:bg-uni-soft"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <StatusSheet
        open={statusOpen}
        onOpenChange={setStatusOpen}
        defaultPlaceId={selectedId}
        onSaved={(place) => setSelectedId(place.id)}
      />
    </div>
  )
}
