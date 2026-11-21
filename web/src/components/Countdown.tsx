import { formatLeft } from "@/lib/format"
import { useNow } from "@/lib/useNow"
import { cn } from "@/lib/utils"

export function useSecondsLeft(expiresAt: number): number {
  const now = useNow(1000)
  return Math.max(0, Math.floor((expiresAt - now) / 1000))
}

export function Countdown({ expiresAt, className }: { expiresAt: number; className?: string }) {
  const seconds = useSecondsLeft(expiresAt)
  return <span className={cn("tabular-nums", className)}>{formatLeft(seconds)}</span>
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2.5 shrink-0", className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
      <span className="relative inline-flex size-2.5 rounded-full bg-current" />
    </span>
  )
}
