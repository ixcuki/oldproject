import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { CheckCircle2, Sparkles, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastTone = "brand" | "success" | "error"

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, tone: ToastTone = "brand") => {
    const id = Date.now() + Math.random()
    setItems((previous) => [...previous.slice(-2), { id, message, tone }])
    window.setTimeout(() => {
      setItems((previous) => previous.filter((item) => item.id !== id))
    }, 2800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[120] flex flex-col items-center gap-2 px-5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-float-in pointer-events-auto flex max-w-[360px] items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-extrabold shadow-[0_12px_32px_rgba(43,33,69,0.24)]",
              item.tone === "brand" && "bg-uni-brand text-white",
              item.tone === "success" && "bg-[#0F7B60] text-white",
              item.tone === "error" && "bg-[#B03A3A] text-white",
            )}
            role="status"
            aria-live="polite"
          >
            {item.tone === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : item.tone === "error" ? (
              <XCircle className="size-4 shrink-0" />
            ) : (
              <Sparkles className="size-4 shrink-0" />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}
