import { useEffect, useState } from "react"
import { Star } from "lucide-react"
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
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import type { Me, Place, Review } from "@/lib/types"

type ReviewSheetProps = {
  place: Place | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (place: Place, me: Me, xp: number) => void
}

export function ReviewSheet({ place, open, onOpenChange, onSaved }: ReviewSheetProps) {
  const { me, applyPlace, applyMe } = useApp()
  const { toast } = useToast()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !place) return
    const mine: Review | undefined = place.reviews?.find((review) => review.isMine)
    setRating(mine?.rating ?? 5)
    setComment(mine?.comment ?? "")
    setBusy(false)
  }, [open, place])

  const submit = async () => {
    if (!place || busy) return
    if (comment.trim().length < 3) {
      toast("Напиши пару слов о месте", "error")
      return
    }
    setBusy(true)
    try {
      const response = await api.createReview(place.id, rating, comment.trim())
      applyPlace(response.place)
      applyMe(response.me)
      onSaved?.(response.place, response.me, response.xpAwarded)
      toast(
        response.xpAwarded > 0 ? `+${response.xpAwarded} XP за отзыв` : "Отзыв обновлён",
        response.xpAwarded > 0 ? "success" : "brand",
      )
      onOpenChange(false)
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось оставить отзыв", "error")
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
          <SheetTitle className="text-[21px] font-extrabold tracking-[-0.02em]">
            Отзыв о месте
          </SheetTitle>
          <SheetDescription className="text-[13px] font-semibold text-uni-muted">
            {place?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-[12px] font-extrabold text-uni-muted">Твоя оценка</Label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= rating
                return (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} из 5`}
                    onClick={() => setRating(star)}
                    className="pressable flex size-11 items-center justify-center rounded-[13px] border border-uni-line bg-white"
                  >
                    <Star
                      size={24}
                      strokeWidth={1.8}
                      style={{
                        color: filled ? "#F5A94A" : "#D9CCF5",
                        fill: filled ? "#F5A94A" : "transparent",
                      }}
                    />
                  </button>
                )
              })}
              <span className="ml-1 text-[18px] font-extrabold text-uni-orange-deep">
                {rating},0
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-comment" className="text-[12px] font-extrabold text-uni-muted">
              Комментарий
            </Label>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={400}
              placeholder="Что здесь реально полезно? Тихо ли, есть ли розетки, очередь, атмосфера…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-[104px] resize-none rounded-[14px] border-uni-line bg-white px-3.5 py-3 text-[14px] font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 rounded-[14px] bg-uni-soft px-3 py-2.5 text-[11.5px] font-semibold text-uni-muted-2">
            <span className="text-uni-brand-deep">✦</span>
            Отзыв появится под именем {me?.name}. Первый отзыв о месте даёт +15 XP.
          </div>

          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="pressable h-12 w-full rounded-[14px] bg-uni-brand text-[15px] font-extrabold text-white shadow-[0_0_20px_rgba(124,92,224,0.2)] hover:bg-uni-brand-deep"
          >
            {busy ? "Сохраняем…" : "Оставить отзыв · +15 XP"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
