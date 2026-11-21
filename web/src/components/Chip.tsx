import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  tone?: "brand" | "green" | "cyan" | "pink"
}

const toneActive: Record<NonNullable<ChipProps["tone"]>, string> = {
  brand: "border-uni-brand bg-uni-brand text-white shadow-[0_0_16px_rgba(124,92,224,0.22)]",
  green: "border-[#137A58] bg-[#137A58] text-white shadow-[0_0_16px_rgba(19,122,88,0.18)]",
  cyan: "border-[#0F7B94] bg-[#0F7B94] text-white shadow-[0_0_16px_rgba(15,123,148,0.18)]",
  pink: "border-[#B03C86] bg-[#B03C86] text-white shadow-[0_0_16px_rgba(176,60,134,0.18)]",
}

export function Chip({ active, tone = "brand", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "pressable inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-bold",
        active
          ? toneActive[tone]
          : "border-uni-line bg-white/55 text-uni-muted-2 hover:bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
