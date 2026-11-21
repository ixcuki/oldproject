import { avatarPalette, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type AvatarProps = {
  name: string
  src?: string | null
  size?: number
  radius?: number
  className?: string
  ring?: boolean
}

export function Avatar({ name, src, size = 40, radius = 14, className, ring }: AvatarProps) {
  const palette = avatarPalette(name || "nearby")
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-extrabold text-uni-ink",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        fontSize: Math.max(10, Math.round(size * 0.33)),
        boxShadow: ring ? "0 0 0 2px #F6F1FF" : undefined,
      }}
      role="img"
      aria-label={name || "Аватар"}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ letterSpacing: "-0.02em" }}>{initials(name || "UP")}</span>
      )}
    </div>
  )
}
