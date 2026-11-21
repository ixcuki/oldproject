import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar } from "@/components/Avatar"
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import { readFileAsAvatar } from "@/lib/format"

type EditProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Remove emoji and other non-letter/non-space characters from name fields. */
function stripEmoji(value: string): string {
  // Remove anything that is an emoji, pictograph, dingbat, or supplementary symbol.
  // Keep letters (any script), digits, spaces, hyphens, apostrophes.
  return value.replace(
    /[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu,
    "",
  )
}

function validateGithub(value: string): string | null {
  if (!value) return null
  if (
    !value.startsWith("https://github.com/") &&
    !value.startsWith("http://github.com/")
  ) {
    return "Ссылка GitHub должна начинаться с https://github.com/"
  }
  const path = value.replace(/^https?:\/\/github\.com\//, "").trim()
  if (!path || path.includes(" ")) return "Укажи корректный GitHub-профиль"
  return null
}

function validateMaxsite(value: string): string | null {
  if (!value) return null
  const isVk = value.startsWith("https://vk.com/") || value.startsWith("http://vk.com/")
  const isMax = value.startsWith("https://max.ru/") || value.startsWith("http://max.ru/")
  if (!isVk && !isMax) {
    return "Ссылка должна начинаться с https://vk.com/ или https://max.ru/"
  }
  return null
}

const EMOJI_OPTIONS = [
  "🔥", "⚡", "🎯", "🌟", "💡", "🚀", "🎵", "📚",
  "🌿", "🎨", "🤖", "🦊", "🐱", "🐸", "🌈", "☕",
  "🏆", "💎", "🎮", "🧩", "🌙", "✨", "🌊", "🍕",
]

export function EditProfileSheet({ open, onOpenChange }: EditProfileSheetProps) {
  const { me, meta, applyMe } = useApp()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [faculty, setFaculty] = useState("")
  const [telegram, setTelegram] = useState("")
  const [github, setGithub] = useState("")
  const [maxsite, setMaxsite] = useState("")
  const [emoji, setEmoji] = useState("")
  const [githubError, setGithubError] = useState<string | null>(null)
  const [maxsiteError, setMaxsiteError] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const userLevel = me?.level.level ?? 1

  useEffect(() => {
    if (!open || !me) return
    setFirstName(me.firstName)
    setLastName(me.lastName)
    setFaculty(me.faculty)
    setTelegram(me.telegram)
    setGithub(me.github ?? "")
    setMaxsite(me.maxsite ?? "")
    setEmoji(me.emoji ?? "")
    setGithubError(null)
    setMaxsiteError(null)
    setAvatar(me.avatar)
  }, [open, me])

  const faculties = meta?.faculties?.[me?.university ?? "СГУ"] ?? []

  const save = async () => {
    if (busy) return
    const ghErr = validateGithub(github.trim())
    const mxErr = validateMaxsite(maxsite.trim())
    setGithubError(ghErr)
    setMaxsiteError(mxErr)
    if (ghErr || mxErr) return
    setBusy(true)
    try {
      const response = await api.updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        faculty,
        telegram: telegram.trim(),
        github: github.trim(),
        maxsite: maxsite.trim(),
        emoji: userLevel >= 2 ? emoji : "",
        avatar,
      })
      applyMe(response.me)
      toast("Профиль обновлён", "success")
      onOpenChange(false)
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось сохранить", "error")
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

  const inputClass = "h-12 rounded-[14px] border-uni-line bg-white px-3.5 text-[14px] font-bold"

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
            Редактировать профиль
          </SheetTitle>
          <SheetDescription className="text-[13px] font-semibold text-uni-muted">
            {me?.university} · {me?.city} · уровень {me?.level.level}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3.5">
          <div className="flex items-center gap-3.5 rounded-[18px] border border-uni-line bg-uni-soft/50 p-3">
            <div className="relative">
              <Avatar
                name={`${firstName} ${lastName}`.trim() || me?.name || "Студент"}
                src={avatar}
                size={54}
                radius={18}
                fire={userLevel >= 4}
              />
              <button
                type="button"
                aria-label="Загрузить фото"
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
            <div>
              <div className="text-[13px] font-extrabold">Фото профиля</div>
              <p className="mt-0.5 text-[11px] font-semibold text-uni-muted">
                Без фото останется цветной бейдж по инициалам.
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

            <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-extrabold text-uni-muted">Имя</Label>
              <Input
                value={firstName}
                onChange={(event) => setFirstName(stripEmoji(event.target.value))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-extrabold text-uni-muted">Фамилия</Label>
              <Input
                value={lastName}
                onChange={(event) => setLastName(stripEmoji(event.target.value))}
                className={inputClass}
              />
            </div>
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

          <div className="space-y-1.5">
            <Label className="text-[12px] font-extrabold text-uni-muted">Ник в Telegram</Label>
            <Input
              value={telegram}
              onChange={(event) => setTelegram(event.target.value)}
              placeholder="@ivan_p"
              className={inputClass}
            />
          </div>

          {/* Emoji picker — level 2+ */}
          {userLevel >= 2 ? (
            <div className="rounded-[16px] border border-uni-line bg-uni-soft/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-extrabold tracking-[0.08em] text-uni-muted uppercase">
                  Эмодзи рядом с ником
                </div>
                {emoji && (
                  <button
                    type="button"
                    onClick={() => setEmoji("")}
                    className="text-[11px] font-extrabold text-uni-pink"
                  >
                    Убрать
                  </button>
                )}
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e === emoji ? "" : e)}
                    className={`flex h-9 w-full items-center justify-center rounded-[10px] border text-[18px] transition-all ${
                      emoji === e
                        ? "border-uni-brand bg-uni-soft shadow-[0_0_10px_rgba(124,92,224,0.2)]"
                        : "border-uni-line bg-white"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] font-semibold text-uni-muted/70">
                Эмодзи отображается рядом с твоим именем везде в приложении.
              </p>
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-uni-line bg-uni-soft/30 px-3.5 py-3 text-[11.5px] font-semibold text-uni-muted">
              🔒 Эмодзи рядом с ником откроется на уровне 2 — «Исследователь»
            </div>
          )}

          <div className="rounded-[16px] border border-uni-line bg-uni-soft/40 p-3 space-y-3">
            <div className="text-[11px] font-extrabold tracking-[0.08em] text-uni-muted uppercase">
              Ссылки
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-extrabold text-uni-muted">GitHub</Label>
              <Input
                value={github}
                onChange={(event) => {
                  setGithub(event.target.value)
                  setGithubError(null)
                }}
                onBlur={() => setGithubError(validateGithub(github.trim()))}
                placeholder="https://github.com/username"
                className={inputClass}
              />
              {githubError && (
                <p className="text-[11px] font-semibold text-uni-pink">{githubError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-extrabold text-uni-muted">VK / Max</Label>
              <Input
                value={maxsite}
                onChange={(event) => {
                  setMaxsite(event.target.value)
                  setMaxsiteError(null)
                }}
                onBlur={() => setMaxsiteError(validateMaxsite(maxsite.trim()))}
                placeholder="https://vk.com/username"
                className={inputClass}
              />
              {maxsiteError && (
                <p className="text-[11px] font-semibold text-uni-pink">{maxsiteError}</p>
              )}
            </div>
          </div>

          <Button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="pressable h-12 w-full rounded-[14px] bg-uni-brand text-[15px] font-extrabold text-white shadow-[0_0_20px_rgba(124,92,224,0.2)]"
          >
            {busy ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
