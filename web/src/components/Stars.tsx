import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function Stars({
  value,
  size = 14,
  className,
  showValue = false,
}: {
  value: number | null | undefined
  size?: number
  className?: string
  showValue?: boolean
}) {
  const rating = value ?? 0
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={value ? `Оценка ${rating} из 5` : "Нет оценок"}
    >
      <span className="stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating)
          return (
            <Star
              key={star}
              size={size}
              strokeWidth={2}
              style={{
                color: filled ? "#F5A94A" : "#D9CCF5",
                fill: filled ? "#F5A94A" : "transparent",
              }}
            />
          )
        })}
      </span>
      {showValue && (
        <span className="text-[13px] font-extrabold text-uni-orange-deep">
          {value ? String(value).replace(".", ",") : "—"}
        </span>
      )}
    </span>
  )
}
