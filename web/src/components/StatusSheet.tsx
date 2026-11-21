import { useEffect, useMemo, useState } from "react"
import { MapPin, Sparkles } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import type { Me, Place } from "@/lib/types"
import { toneColor } from "@/lib/format"
import { cn, haversineM } from "@/lib/utils"

const STATUS_RADIUS_M = 700

type StatusSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultPlaceId?: number | null
  onSaved?: (place: Place, me: Me, xp: number) => void
}

const SPOT_TYPES = new Set(["free", "players"])

export function StatusSheet({ open, onOpenChange, defaultPlaceId, onSaved }: StatusSheetProps) {
  const { places, meta, position, applyPlace, applyMe } = useApp()
  const { toast } = useToast()
  const [placeId, setPlaceId] = useState<string>("")
  const [type, setType] = useState("free")
  const [text, setText] = useState("")
  const [spots, setSpots] = useState("")
  const [ttl, setTtl] = useState(60)
  const [busy, setBusy] = useState(false)

  const nearbyPlaces = useMemo(() => {
    if (!position) return places
    return places.filter(
      (p) => haversineM(position.lat, position.lng, p.lat, p.lng) <= STATUS_RADIUS_M,
    )
  }, [places, position])

  useEffect(() => {
    if (!open) return
    const pool = nearbyPlaces.length > 0 ? nearbyPlaces : places
    const fallback =
      defaultPlaceId ?? pool.find((place) => place.status)?.id ?? pool[0]?.id
    setPlaceId(fallback ? String(fallback) : "")
    setType("free")
    setText("")
    setSpots("")
    setTtl(60)
  }, [open, defaultPlaceId, nearbyPlaces, places])

  const types = useMemo(() => Object.entries(meta?.statusTypes ?? {}), [meta])
  const visiblePlaces = nearbyPlaces.length > 0 || !position ? nearbyPlaces : places
  const currentPlace = visiblePlaces.find((place) => place.id === Number(placeId))
    ?? places.find((place) => place.id === Number(placeId))
  const needsSpots = SPOT_TYPES.has(type)

  const submit = async () => {
    if (!currentPlace || busy) return
    setBusy(true)
    try {
      const response = await api.createStatus(currentPlace.id, {
        type,
        text: text.trim(),
        spots: needsSpots && spots.trim() !== "" ? Number(spots) : null,
        ttlMinutes: ttl,
      })
      applyPlace(response.place)
      applyMe(response.me)
      onSaved?.(response.place, response.me, response.xpAwarded)
      toast(
        response.xpAwarded > 0
          ? `+${response.xpAwarded} XP за live-статус`
          : "Статус кампуса обновлён",
        response.xpAwarded > 0 ? "success" : "brand",
      )
      onOpenChange(false)
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось обновить статус", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="sheet-surface mx-auto max-h-[92dvh] w-full max-w-[430px] gap-0 overflow-y-auto bg-white px-5 pt-2.5 pb-[max(22px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-uni-line" />
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2 text-[21px] font-extrabold tracking-[-0.02em]">
            <Sparkles size={19} className="text-uni-brand-deep" />
            Live-статус
          </SheetTitle>
          <SheetDescription className="text-[13px] font-semibold text-uni-muted">
            Статус виден всем на карте и живёт до 2 часов. За новую отметку — +10 XP.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-extrabold text-uni-muted">Место</Label>
            <Select value={placeId} onValueChange={setPlaceId}>
              <SelectTrigger className="h-12 w-full rounded-[14px] border-uni-line bg-white px-3.5 text-[14px] font-bold">
                <SelectValue placeholder="Выбери место" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {visiblePlaces.map((place) => (
                  <SelectItem key={place.id} value={String(place.id)}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentPlace && (
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-uni-muted">
                <MapPin size={13} /> {currentPlace.kindLabel} · {currentPlace.address}
              </div>
            )}
            {position && visiblePlaces.length === 0 && (
              <p className="text-[11px] font-semibold text-uni-muted/70">
                Нет мест в радиусе 700 м
              </p>
            )}
            {!position && (
              <p className="text-[11px] font-semibold text-uni-muted/70">
                Включи геолокацию, чтобы видеть только ближайшие места
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-extrabold text-uni-muted">Что происходит</Label>
            <div className="grid grid-cols-3 gap-2">
              {types.map(([key, config]) => {
                const active = key === type
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      "pressable flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-[13px] border px-2.5 text-left",
                      active
                        ? "border-uni-brand bg-uni-soft shadow-[0_0_14px_rgba(124,92,224,0.16)]"
                        : "border-uni-line bg-white",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: toneColor(config.tone) }}
                      />
                      <span
                        className={cn(
                          "text-[11.5px] font-extrabold",
                          active ? "text-uni-brand-deep" : "text-uni-ink",
                        )}
                      >
                        {config.short}
                      </span>
                    </span>
                    <span className="text-[9.5px] font-bold text-uni-muted">
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {needsSpots && (
            <div className="space-y-1.5">
              <Label htmlFor="spots" className="text-[12px] font-extrabold text-uni-muted">
                {type === "players" ? "Сколько игроков не хватает" : "Свободных мест"}
              </Label>
              <Input
                id="spots"
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                placeholder="например, 3"
                value={spots}
                onChange={(event) => setSpots(event.target.value)}
                className="h-12 rounded-[14px] border-uni-line bg-white px-3.5 text-[15px] font-bold"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="status-text" className="text-[12px] font-extrabold text-uni-muted">
              Комментарий <span className="font-bold text-uni-muted/70">— необязательно</span>
            </Label>
            <Textarea
              id="status-text"
              rows={2}
              maxLength={140}
              placeholder={
                type === "players"
                  ? "Например: ищем двух на баскетбол к 18:00"
                  : type === "queue"
                    ? "Например: очередь минут на пять"
                    : "Например: свободно у окон на втором этаже"
              }
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[64px] resize-none rounded-[14px] border-uni-line bg-white px-3.5 py-2.5 text-[14px] font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-extrabold text-uni-muted">Сколько живёт статус</Label>
            <div className="flex gap-2">
              {(meta?.statusTtlChoices ?? [30, 60, 120]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setTtl(choice)}
                  className={cn(
                    "h-9 flex-1 rounded-full border text-[12px] font-extrabold",
                    ttl === choice
                      ? "border-uni-cyan bg-[#E3F4FA] text-uni-cyan"
                      : "border-uni-line bg-white text-uni-muted-2",
                  )}
                >
                  {choice} мин
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={!currentPlace || busy}
            onClick={() => void submit()}
            className="pressable h-12 w-full rounded-[14px] bg-uni-brand text-[15px] font-extrabold text-white shadow-[0_0_20px_rgba(124,92,224,0.2)] hover:bg-uni-brand-deep"
          >
            {busy ? "Публикуем…" : "Опубликовать статус · +10 XP"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
