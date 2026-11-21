import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Camera, Eye, EyeOff, GraduationCap, MapPin, Sparkles } from "lucide-react"
import { Logo, Skyline, Wordmark } from "@/components/Brand"
import { Avatar } from "@/components/Avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ToastProvider"
import { useApp } from "@/store/AppContext"
import { api } from "@/lib/api"
import { readFileAsAvatar } from "@/lib/format"
import type { Meta } from "@/lib/types"
import { cn } from "@/lib/utils"

const FALLBACK_FACULTIES = [
  "КНиИТ",
  "Мехмат",
  "Физический",
  "Филологический",
  "Экономический",
  "Юридический",
  "Психологический",
]

const inputClass =
  "h-12 rounded-[14px] border-uni-line bg-white px-3.5 text-[14px] font-bold placeholder:text-uni-muted/55"

export function AuthPage() {
  const { login, register, demoLogin } = useApp()
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [mode, setMode] = useState<"register" | "login">("register")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [faculty, setFaculty] = useState("КНиИТ")
  const [telegram, setTelegram] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch(() => undefined)
  }, [])

  const university = "СГУ"
  const universityMeta = meta?.universities?.find((item) => item.short === university)
  const faculties = meta?.faculties?.[university] ?? FALLBACK_FACULTIES
  const previewName = `${firstName} ${lastName}`.trim() || "Иван Петров"

  const submit = async () => {
    if (busy) return
    setError(null)
    if (mode === "register") {
      const tg = telegram.trim().replace(/^@/, "")
      if (!tg || tg.length < 4) {
        const msg = "Укажи ник в Telegram (обязательно)"
        setError(msg)
        toast(msg, "error")
        return
      }
    }
    setBusy(true)
    try {
      if (mode === "login") {
        await login(username.trim(), password)
      } else {
        await register({
          username: username.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          university,
          faculty,
          telegram: telegram.trim(),
          avatar,
        })
      }
      navigate("/map", { replace: true })
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : "Не получилось войти"
      setError(message)
      toast(message, "error")
    } finally {
      setBusy(false)
    }
  }

  const demo = async () => {
    setError(null)
    setBusy(true)
    try {
      await demoLogin()
      navigate("/map", { replace: true })
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Демо недоступно")
    } finally {
      setBusy(false)
    }
  }

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return
    try {
      setAvatar(await readFileAsAvatar(file))
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось загрузить фото", "error")
    }
  }

  return (
    <div className="desktop-shell">
      <div className="app-frame">
        <div className="no-scrollbar relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[140px] overflow-hidden">
            <Skyline className="absolute inset-0 h-[140px] w-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
          </div>

          <div className="relative px-6 pt-[max(18px,env(safe-area-inset-top))]">
            <Logo size={46} />
            <div className="mt-2 text-[10px] font-extrabold tracking-[0.16em] text-uni-muted">
              {mode === "register" ? "РЕГИСТРАЦИЯ" : "ВХОД"} · САРАТОВ
            </div>
            <h1 className="mt-1 text-[26px] font-extrabold leading-[1.12] tracking-[-0.035em] text-uni-ink">
              Добро пожаловать в <Wordmark />
            </h1>
            <p className="mt-1 text-[12.5px] font-semibold text-uni-muted">
              Живой пульс кампуса СГУ: места, люди и помощь рядом
            </p>
          </div>

          <div className="relative px-6 pt-3">
            <div className="grid grid-cols-2 gap-1 rounded-[16px] border border-uni-line bg-white p-1">
              {(
                [
                  { key: "register", label: "Регистрация" },
                  { key: "login", label: "Вход" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setMode(tab.key)
                    setError(null)
                  }}
                  className={cn(
                    "h-9 rounded-[12px] text-[12.5px] font-extrabold transition",
                    mode === tab.key
                      ? "bg-uni-brand text-white shadow-[0_4px_14px_rgba(124,92,224,0.28)]"
                      : "text-uni-muted-2",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

         <div className="relative px-6 pt-3 pb-4">
            {mode === "register" && (
              <div className="mb-3 flex items-center gap-3 rounded-[16px] border border-uni-line bg-white/80 p-2.5">
                <div className="relative">
                  <Avatar name={previewName} src={avatar} size={50} radius={17} />
                  <button
                    type="button"
                    aria-label="Загрузить аватар"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-[10px] border border-uni-line bg-white text-uni-brand-deep shadow-sm"
                  >
                    <Camera size={13} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void pickAvatar(event.target.files?.[0])}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold">Бейдж по инициалам</div>
                  <p className="mt-0.5 text-[10.5px] font-semibold leading-snug text-uni-muted">
                    Или добавь фото — его увидят авторы отзывов и запросов.
                  </p>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar(null)}
                      className="mt-1 text-[11px] font-extrabold text-uni-pink"
                    >
                      Убрать фото
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="login" className="text-[12px] font-extrabold text-uni-muted">
                    Логин
                  </Label>
                  <Input
                    id="login"
                    autoComplete="username"
                    placeholder="ivan_p"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[12px] font-extrabold text-uni-muted">
                    Пароль
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={cn(inputClass, "pr-10")}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-uni-muted"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {mode === "register" && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="first" className="text-[12px] font-extrabold text-uni-muted">
                        Имя
                      </Label>
                      <Input
                        id="first"
                        autoComplete="given-name"
                        placeholder="Иван"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last" className="text-[12px] font-extrabold text-uni-muted">
                        Фамилия
                      </Label>
                      <Input
                        id="last"
                        autoComplete="family-name"
                        placeholder="Петров"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-extrabold text-uni-muted">Вуз</Label>
                    <div className="flex h-12 items-center gap-2 rounded-[14px] border border-uni-line bg-uni-soft px-3.5">
                      <GraduationCap size={16} className="shrink-0 text-uni-brand-deep" />
                      <span className="truncate text-[13px] font-bold">
                        {universityMeta?.full ?? "СГУ им. Н. Г. Чернышевского"}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-uni-muted/80">
                      nearby работает для студентов СГУ.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-extrabold text-uni-muted">Факультет</Label>
                    <Select value={faculty} onValueChange={setFaculty}>
                      <SelectTrigger className="h-12 w-full rounded-[14px] border-uni-line bg-white px-3.5 text-[14px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {faculties.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="tg" className="text-[12px] font-extrabold text-uni-muted">
                        Telegram
                      </Label>
                      <Input
                        id="tg"
                        placeholder="@ivan_p"
                        value={telegram}
                        onChange={(event) => setTelegram(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-[12px] font-extrabold text-uni-muted">
                        Город
                      </Label>
                      <div className="relative">
                        <Input
                          id="city"
                          value="Саратов"
                          readOnly
                          className={cn(inputClass, "bg-uni-soft pr-9 text-uni-muted")}
                        />
                        <MapPin
                          size={15}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-uni-brand-deep"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          <div className="h-3" />
        </div>

        <div className="relative z-10 shrink-0 border-t border-uni-line-soft bg-uni-bg/94 px-6 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur">
          {error && (
            <div className="mb-2.5 rounded-[14px] border border-[#F0C4C4] bg-[#FFF1F1] px-3.5 py-2.5 text-[12px] font-bold text-[#A33A3A]">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-uni-brand text-[15px] font-extrabold text-white shadow-[0_0_20px_rgba(124,92,224,0.22)] disabled:opacity-60"
          >
            {busy ? "Подключаемся…" : mode === "register" ? "Создать профиль" : "Войти"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void demo()}
            className="pressable mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[13px] border border-[#B9A2F0] bg-white text-[12px] font-extrabold text-uni-brand-deep"
          >
            <Sparkles size={14} />
            Демо-вход: Иван Петров · 320 XP
          </button>
          <p className="mt-2 text-center text-[10.5px] font-semibold text-uni-muted">
            {mode === "register" ? (
              <>
                Уже есть аккаунт?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-extrabold text-uni-brand-deep"
                >
                  Войти
                </button>
              </>
            ) : (
              <>
                Впервые здесь?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-extrabold text-uni-brand-deep"
                >
                  Создать профиль
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
