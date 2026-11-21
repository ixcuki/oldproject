import { avatarPalette, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type AvatarProps = {
  name: string
  src?: string | null
  size?: number
  radius?: number
  className?: string
  ring?: boolean
  fire?: boolean
}

export function Avatar({ name, src, size = 40, radius = 14, className, ring, fire }: AvatarProps) {
  const palette = avatarPalette(name || "nearby")
  const borderWidth = fire ? Math.max(2, Math.round(size * 0.055)) : 0

  return (
    <div
      className={cn("shrink-0", fire && "fire-ring", className)}
      style={
        fire
          ? {
              padding: borderWidth,
              borderRadius: radius + borderWidth,
              background:
                "conic-gradient(from 0deg, #FF4E00, #FF9A00, #FFD500, #FF4E00)",
              width: size + borderWidth * 2,
              height: size + borderWidth * 2,
            }
          : undefined
      }
    >
      <div
        className="flex items-center justify-center overflow-hidden font-extrabold text-uni-ink"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
          fontSize: Math.max(10, Math.round(size * 0.33)),
          boxShadow: ring && !fire ? "0 0 0 2px #F6F1FF" : undefined,
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
    </div>
  )
}

