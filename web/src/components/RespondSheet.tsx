import { useEffect, useState } from "react"
import { ExternalLink, Send, ShieldCheck } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/Avatar"
import { useApp } from "@/store/AppContext"
import { useToast } from "@/components/ToastProvider"
import { api } from "@/lib/api"
import type { Post } from "@/lib/types"

type RespondSheetProps = {
  post: Post | null
  onOpenChange: (open: boolean) => void
}

type Result = {
  telegram: string
  telegramUrl: string
  already: boolean
}

export function RespondSheet({ post, onOpenChange }: RespondSheetProps) {
  const { applyMe, applyPost } = useApp()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    setResult(null)
    setBusy(false)
  }, [post?.id])

  if (!post) return null

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      const response = await api.respond(post.id)
      setResult({
        telegram: response.telegram,
        telegramUrl: response.telegramUrl,
        already: response.already,
      })
      applyMe(response.me)
      if (!response.already) {
        applyPost({ ...post, responded: true, responders: post.responders + 1 })
        toast(`+${response.xpAwarded} XP за отклик`, "success")
      }
    } catch (exception) {
      toast(exception instanceof Error ? exception.message : "Не удалось откликнуться", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={Boolean(post)} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="sheet-surface mx-auto max-h-[90dvh] w-full max-w-[430px] gap-0 overflow-y-auto bg-white px-5 pt-2.5 pb-[max(22px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-uni-line" />
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.02em]">
            <Avatar name={post.author.name} src={post.author.avatar} size={38} />
            <span>
              {result ? "Контакты открыты" : "Откликнуться?"}
              <span className="block text-[11.5px] font-bold text-uni-muted">
                {post.author.name} · {post.author.university} · {post.author.faculty}
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 rounded-[14px] bg-uni-soft px-3.5 py-3 text-[14px] font-bold leading-snug text-uni-ink">
          {post.text}
        </div>

        {result ? (
          <>
            <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[#BDE8D6] bg-[#EFFAF5] px-3.5 py-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-uni-green" />
              <p className="text-[12px] font-semibold leading-snug text-[#23664F]">
                {result.already
                  ? "Ты уже откликался на этот запрос. Telegram автора:"
                  : "Отклик отправлен. Напиши автору в Telegram и договоритесь о встрече:"}
              </p>
            </div>
            <a
              href={result.telegramUrl}
              target="_blank"
              rel="noreferrer"
              className="pressable mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1678AF] text-[15px] font-extrabold text-white no-underline shadow-[0_0_18px_rgba(22,120,175,0.25)]"
            >
              <Send size={16} />
              @{result.telegram}
              <ExternalLink size={14} className="opacity-80" />
            </a>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2.5 h-11 w-full rounded-[14px] border border-uni-line bg-white text-[13px] font-extrabold text-uni-brand-deep hover:bg-uni-soft"
            >
              Готово
            </Button>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-start gap-2.5 text-[12px] font-semibold leading-snug text-uni-muted-2">
              <Send size={18} className="mt-0.5 shrink-0 text-[#1678AF]" />
              <p>
                После подтверждения откроется Telegram автора — <b>@{post.author.username}</b>.
                Отклик бесплатный и без обязательств.
              </p>
            </div>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="pressable mt-4 h-12 w-full rounded-[14px] bg-[#1678AF] text-[14.5px] font-extrabold text-white shadow-[0_0_20px_rgba(22,120,175,0.25)] hover:bg-[#126a9b]"
            >
              {busy ? "Открываем…" : "Подтвердить и открыть Telegram"}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2.5 h-11 w-full rounded-[14px] border border-uni-line bg-white text-[13px] font-extrabold text-uni-brand-deep hover:bg-uni-soft"
            >
              Отмена
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
