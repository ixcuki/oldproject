import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen,
  Bot,
  Clock,
  Coffee,
  Footprints,
  Laptop,
  Map,
  MapPin,
  Send,
  Sparkles,
  Star,
  Trophy,
  Users,
  Utensils,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import { plural } from "@/lib/format"
import type { Plan } from "@/lib/types"
import { cn } from "@/lib/utils"

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; plan: Plan }
  | { id: string; role: "assistant"; error: string }

const STORAGE_KEY = "unipulse_ai_chat"

const STEP_ICONS: Record<string, typeof Map> = {
  walk: Footprints,
  coffee: Coffee,
  book: BookOpen,
  food: Utensils,
  ball: Trophy,
  users: Users,
  map: Map,
  clock: Clock,
  star: Star,
  sparkles: Sparkles,
  laptop: Laptop,
  dot: MapPin,
}

const STEP_TONES: Record<string, { bg: string; fg: string }> = {
  walk: { bg: "rgba(19,122,88,0.12)", fg: "#137A58" },
  coffee: { bg: "rgba(245,169,74,0.16)", fg: "#9A5A0C" },
  book: { bg: "rgba(59,184,216,0.14)", fg: "#0F7B94" },
  food: { bg: "rgba(245,169,74,0.16)", fg: "#9A5A0C" },
  ball: { bg: "rgba(238,125,184,0.16)", fg: "#B03C86" },
  users: { bg: "rgba(124,92,224,0.13)", fg: "#6D4FD6" },
  map: { bg: "rgba(124,92,224,0.13)", fg: "#6D4FD6" },
  clock: { bg: "rgba(19,122,88,0.12)", fg: "#137A58" },
  star: { bg: "rgba(245,169,74,0.16)", fg: "#9A5A0C" },
  sparkles: { bg: "rgba(176,60,134,0.13)", fg: "#B03C86" },
  laptop: { bg: "rgba(124,92,224,0.13)", fg: "#6D4FD6" },
  dot: { bg: "rgba(111,98,143,0.12)", fg: "#6F628F" },
}

const QUICK = [
  "У меня два часа, хочу тихое место и кофе",
  "Где пообедать без очереди?",
  "Нужна компания для баскетбола",
  "Куда пойти на мероприятие сегодня?",
]

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

function loadChat(): ChatItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatItem[]
    return Array.isArray(parsed) ? parsed.slice(-12) : []
  } catch {
    return []
  }
}

export function AIPage() {
  const { places, position } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatItem[]>(loadChat)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const liveCount = useMemo(() => places.filter((place) => place.status).length, [places])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-12)))
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, busy])

  const send = async (raw: string) => {
    const query = raw.trim()
    if (!query || busy) return
    setInput("")
    setMessages((previous) => [...previous, { id: newId(), role: "user", text: query }])
    setBusy(true)
    try {
      const plan = await api.aiPlan(query, position?.lat, position?.lng)
      setMessages((previous) => [
        ...previous,
        { id: newId(), role: "assistant", plan },
      ])
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : "AI не ответил — попробуй ещё раз"
      setMessages((previous) => [
        ...previous,
        { id: newId(), role: "assistant", error: message },
      ])
      toast(message, "error")
    } finally {
      setBusy(false)
    }
  }

  const showOnMap = (plan: Plan) => {
    if (!plan.placeIds.length) {
      navigate("/map")
      return
    }
    navigate(`/map?focus=${plan.placeIds.join(",")}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.14em] text-uni-pink">
            <Sparkles size={12} />
            ВИДИТ СТАТУСЫ МЕСТ СЕЙЧАС
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.035em]">
            AI-помощник
          </h1>
          <p className="mt-1 text-[11.5px] font-bold text-uni-muted">
            {liveCount} {plural(liveCount, "live-статус", "live-статуса", "live-статусов")} · СГУ · Саратов
          </p>
        </div>
        <div className="mt-1 flex size-10 items-center justify-center rounded-[14px] border border-[#F5C6DE] bg-[#FBE7F2] text-uni-pink">
          <Bot size={21} />
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-3">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[11px] bg-uni-brand text-white shadow-[0_4px_14px_rgba(124,92,224,0.3)]">
            <Sparkles size={15} />
          </div>
          <div className="max-w-[290px] rounded-[18px_18px_18px_6px] border border-uni-card-line bg-white px-3.5 py-3 text-[13px] font-semibold leading-snug shadow-[0_6px_18px_rgba(124,92,224,0.07)]">
            Привет! Я знаю, что сейчас свободно в библиотеке, где очередь в столовой и кто ищет
            компанию. Скажи, сколько у тебя времени и чего хочется — соберу план и подсвечу точки
            на карте.
          </div>
        </div>

        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2 pl-10">
            {QUICK.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="pressable rounded-full border border-[#F5C6DE] bg-white px-3 py-1.5 text-left text-[11.5px] font-extrabold text-uni-pink"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[300px] rounded-[20px_20px_6px_20px] bg-uni-brand px-4 py-3 text-[13.5px] font-bold leading-snug text-white shadow-[0_8px_22px_rgba(124,92,224,0.22)]">
                  {message.text}
                </div>
              </div>
            ) : "plan" in message ? (
              <PlanCard key={message.id} plan={message.plan} onShowMap={() => showOnMap(message.plan)} />
            ) : (
              <div
                key={message.id}
                className="rounded-[16px] border border-[#F0C4C4] bg-[#FFF1F1] px-3.5 py-3 text-[12.5px] font-bold text-[#A33A3A]"
              >
                {message.error}
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[11px] bg-uni-brand text-white">
                <Sparkles size={15} />
              </div>
              <div className="flex h-10 items-center gap-1.5 rounded-[16px_16px_16px_6px] border border-uni-card-line bg-white px-4">
                <span className="typing-dot size-1.5 rounded-full bg-uni-brand" />
                <span className="typing-dot size-1.5 rounded-full bg-uni-brand" />
                <span className="typing-dot size-1.5 rounded-full bg-uni-brand" />
                <span className="ml-1.5 text-[11px] font-bold text-uni-muted">
                  смотрю статусы…
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-uni-line-soft bg-white px-3 pt-2 pb-2.5">
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void send(input)
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={500}
            placeholder="Спроси про кампус…"
            aria-label="Сообщение AI-помощнику"
            className="h-11 flex-1 rounded-[14px] border-uni-line bg-white px-3.5 text-[13.5px] font-semibold placeholder:text-uni-muted/60"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Отправить"
            className="size-11 shrink-0 rounded-[14px] bg-uni-brand p-0 text-white shadow-[0_6px_16px_rgba(124,92,224,0.24)] disabled:opacity-40"
          >
            <Send size={17} />
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[9.5px] font-bold text-uni-muted/80">
          AI опирается на live-статусы, отзывы и расстояние. Проверяй время на месте.
        </p>
      </div>
    </div>
  )
}

function PlanCard({ plan, onShowMap }: { plan: Plan; onShowMap: () => void }) {
  const isPlan = plan.mode !== "answer"
  return (
    <div className="animate-float-in rounded-[20px] border border-[#B9A2F0] bg-white p-3.5 shadow-[0_10px_28px_rgba(124,92,224,0.1)]">
      <div className="flex items-center justify-between">
        <div className="text-[9.5px] font-extrabold tracking-[0.13em] text-uni-brand-deep">
          {isPlan ? "ПЛАН · LIVE-ДАННЫЕ" : "ОТВЕТ · LIVE-ДАННЫЕ"}
        </div>
        {isPlan && (
          <span className="rounded-full bg-uni-soft px-2 py-0.5 text-[9.5px] font-extrabold text-uni-muted">
            {plan.steps.length} {plural(plan.steps.length, "шаг", "шага", "шагов")}
          </span>
        )}
      </div>
      <h2 className="mt-1 text-[17px] font-extrabold leading-tight tracking-[-0.02em]">
        {plan.title}
      </h2>
      {plan.intro && (
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-uni-muted">{plan.intro}</p>
      )}

      {isPlan && (
      <svg
        viewBox="0 0 326 78"
        width="100%"
        height="78"
        className="mt-2.5 block"
        aria-hidden="true"
      >
        <rect width="326" height="78" rx="12" fill="#EFE9FF" />
        <path d="M0 58H326M88 0V78M226 0V78" stroke="#DDD3F7" strokeWidth="7" />
        <path
          d="M28 62L88 56L150 28L226 32L298 14"
          fill="none"
          stroke="#3BB8D8"
          strokeWidth="3"
          strokeDasharray="6 5"
          strokeLinecap="round"
          className="plan-path"
        />
        <circle cx="28" cy="62" r="6" fill="#fff" />
        <circle cx="150" cy="28" r="6" fill="#F5A94A" />
        <circle cx="298" cy="14" r="6" fill="#46C99A" />
      </svg>
      )}

      <div className="mt-1 divide-y divide-uni-line-soft">
        {plan.steps.map((step, index) => {
          const Icon = STEP_ICONS[step.icon] ?? MapPin
          const tone = STEP_TONES[step.icon] ?? STEP_TONES.dot
          return (
            <div key={`${step.title}-${index}`} className="flex items-start gap-2.5 py-2.5">
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: tone.bg, color: tone.fg }}
              >
                <Icon size={16} strokeWidth={2.1} />
              </span>
              <div className="w-[58px] shrink-0 pt-1 text-[11px] font-extrabold text-uni-brand-deep">
                {step.time}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold leading-tight">{step.title}</div>
                {step.detail && (
                  <div className="mt-0.5 text-[11px] font-semibold leading-snug text-uni-muted">
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        onClick={onShowMap}
        className={cn(
          "pressable mt-2 h-10 w-full rounded-[12px] bg-uni-brand text-[12.5px] font-extrabold text-white",
          "shadow-[0_0_16px_rgba(124,92,224,0.2)] hover:bg-uni-brand-deep",
        )}
      >
        <MapPin size={14} className="mr-1.5" /> Показать на карте
      </Button>
    </div>
  )
}
