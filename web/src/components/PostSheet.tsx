import { useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, HeartHandshake, MapPin, Navigation, Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
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
import { cn, haversineM } from "@/lib/utils"

const POST_RADIUS_M = 1000

type PostSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCategory?: string
}

const CATEGORY_ICONS = {
  activity: Users,
  exchange: ArrowLeftRight,
  help: HeartHandshake,
} as const

export function PostSheet({ open, onOpenChange, defaultCategory }: PostSheetProps) {
  const { meta, places, position, applyPost, applyMe } = useApp()
  const { toast } = useToast()
  const [category, setCategory] = useState(defaultCategory ?? "activity")
  const [text, setText] = useState("")
  // "none" = no place, "geo" = my location (no placeId), or a place id string
  const [placeId, setPlaceId] = useState("none")
  const [busy, setBusy] = useState(false)
  const categories = Object.entries(meta?.postCategories ?? {})

  const nearbyPlaces = useMemo(() => {
    if (!position) return places
    return places.filter(
      (p) => haversineM(position.lat, position.lng, p.lat, p.lng) <= POST_RADIUS_M,
    )
  }, [places, position])

  useEffect(() => {
    if (!open) return
    setCategory(defaultCategory ?? "activity")
    setText("")
    setPlaceId("none")
  }, [open, defaultCategory])

  const submit = async () => {
    if (busy) return
    if (text.trim().length < 3) {
      toast("Опиши запрос хотя бы в пару слов", "error")
      return
    }
    setBusy(true)
    try {
      const resolvedPlaceId =
        placeId === "none" || placeId === "geo" ? null : Number(placeId)
      const response = await api.createPost({
        category,
        text: text.trim(),
        placeId: resolvedPlaceId,
      })
      applyPost(response.post)
      applyMe(response.me)
      toast(`+${response.xpAwarded} XP · запрос в ленте`, "success")
      onOpenChange(false)
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось опубликовать", "error")
    } finally {
      setBusy(false)
    }
  }

  const selectedPlace = nearbyPlaces.find((p) => String(p.id) === placeId)
    ?? places.find((p) => String(p.id) === placeId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="sheet-surface mx-auto max-h-[92dvh] w-full max-w-[430px] gap-0 overflow-y-auto bg-white px-5 pt-2.5 pb-[max(22px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-uni-line" />
        <SheetHeader className="p-0">
          <SheetTitle className="text-[21px] font-extrabold tracking-[-0.02em]">
            Новый запрос в Pulse
          </SheetTitle>
          <SheetDescription className="text-[13px] font-semibold text-uni-muted">
            Без ценников и маркетплейса: просто найди рядом своих. Запрос живёт 6 часов.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-[12px] font-extrabold text-uni-muted">Что нужно</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(([key, config]) => {
                const Icon = CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] ?? Users
                const active = category === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={cn(
                      "pressable flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[14px] border px-1.5 text-center",
                      active
                        ? "border-uni-cyan bg-[#E3F4FA] shadow-[0_0_14px_rgba(59,184,216,0.18)]"
                        : "border-uni-line bg-white",
                    )}
                  >
                    <Icon
                      size={19}
                      className={active ? "text-uni-cyan" : "text-uni-muted"}
                      strokeWidth={2.1}
                    />
                    <span
                      className={cn(
                        "text-[11.5px] font-extrabold",
                        active ? "text-uni-cyan" : "text-uni-ink",
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[9px] font-bold leading-tight text-uni-muted">
                      {config.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-text" className="text-[12px] font-extrabold text-uni-muted">
              Запрос
            </Label>
            <Textarea
              id="post-text"
              rows={4}
              maxLength={280}
              autoFocus
              placeholder="Например: ищу напарника для подготовки к матанализу в библиотеке через час"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[96px] resize-none rounded-[14px] border-uni-line bg-white px-3.5 py-3 text-[14px] font-semibold"
            />
            <div className="text-right text-[10.5px] font-bold text-uni-muted/80">
              {text.length}/280
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-extrabold text-uni-muted">
              Где встретимся{" "}
              <span className="font-bold text-uni-muted/70">— необязательно</span>
            </Label>
            <Select value={placeId} onValueChange={setPlaceId}>
              <SelectTrigger className="h-12 w-full rounded-[14px] border-uni-line bg-white px-3.5 text-[14px] font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                <SelectItem value="none">Без привязки к месту</SelectItem>
                {position && (
                  <SelectItem value="geo">
                    <span className="flex items-center gap-1.5">
                      <Navigation size={13} className="shrink-0 text-uni-brand" />
                      Моё местоположение
                    </span>
                  </SelectItem>
                )}
                {nearbyPlaces.map((place) => (
                  <SelectItem key={place.id} value={String(place.id)}>
                    {place.name}
                  </SelectItem>
                ))}
                {!position && places.map((place) => (
                  <SelectItem key={place.id} value={String(place.id)}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {placeId === "geo" && position && (
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-uni-brand">
                <Navigation size={12} />
                Привязано к вашей геопозиции
              </div>
            )}
            {selectedPlace && (
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-uni-muted">
                <MapPin size={13} /> {selectedPlace.kindLabel} · {selectedPlace.address}
              </div>
            )}
            {position && nearbyPlaces.length === 0 && (
              <p className="text-[11px] font-semibold text-uni-muted/70">
                Нет мест в радиусе 1 км
              </p>
            )}
            {!position && (
              <p className="text-[11px] font-semibold text-uni-muted/70">
                Включи геолокацию, чтобы видеть ближайшие места и выбрать своё положение
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-[14px] bg-uni-soft px-3 py-2.5 text-[11.5px] font-semibold leading-snug text-uni-muted-2">
            <span className="mt-0.5 text-uni-brand-deep">✦</span>
            После отклика другого студента откроется твой Telegram. Без спама и звонков.
          </div>

          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="pressable h-12 w-full rounded-[14px] bg-uni-brand text-[15px] font-extrabold text-white shadow-[0_0_20px_rgba(124,92,224,0.2)] hover:bg-uni-brand-deep"
          >
            {busy ? "Публикуем…" : "Опубликовать · +10 XP"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
