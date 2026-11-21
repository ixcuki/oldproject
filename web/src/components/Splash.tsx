import { RotateCw } from "lucide-react"
import { Logo } from "@/components/Brand"
import { useApp } from "@/store/AppContext"

export function Splash() {
  const { error, refresh } = useApp()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-uni-brand/10" />
        <Logo size={60} className="relative" />
      </div>
      <div>
        <div className="text-[22px] font-extrabold tracking-[-0.02em]">Собираем пульс кампуса</div>
        <p className="mt-1 text-[14px] font-semibold text-uni-muted">
          Проверяем live-статусы и свободные места
        </p>
      </div>
      {error && (
        <div className="w-full max-w-[320px] rounded-2xl border border-[#F1C9C9] bg-white p-4">
          <p className="text-[13px] font-bold text-[#A33A3A]">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="pressable mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-uni-brand px-4 text-[13px] font-extrabold text-white"
          >
            <RotateCw size={15} /> Повторить
          </button>
        </div>
      )}
      {!error && (
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-uni-soft-2">
          <div className="h-full w-1/2 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#B8A2FA] to-[#8ED8F5]" />
        </div>
      )}
      <style>{`@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(240%)}}`}</style>
    </div>
  )
}
