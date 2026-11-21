/**
 * UserName — renders a user's display name with level perks:
 *   Level 1+: nearby logo shown before the name (default badge)
 *   Level 2+: custom emoji shown before the name
 *   Level 3+: gold name colour
 *   Level 4+: fire ring on the accompanying Avatar (handled by Avatar's `fire` prop)
 */
import { cn } from "@/lib/utils"

type UserNameProps = {
  name: string
  emoji?: string
  level?: number
  className?: string
  /** Set to true when this is the "Вы" / "me" label instead of the real name */
  isMe?: boolean
}

/** Colour token for a gold username (level 3+) */
export const GOLD_NAME_CLASS = "text-[#C6922A]"

/** The default logo emoji sentinel returned by the backend for users with no custom emoji */
const DEFAULT_EMOJI_SENTINEL = "📍"

function NearbyLogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        d="M16 2a11 11 0 0 1 11 11c0 7.5-11 17-11 17S5 20.5 5 13A11 11 0 0 1 16 2z"
        fill="#FFFFFF"
        stroke="#7C5CE0"
        strokeWidth="2"
      />
      <path
        d="M9 13h4l2-4.5 3 9 2-4.5h3"
        fill="none"
        stroke="#6D4FD6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function UserName({ name, emoji, level = 1, className, isMe }: UserNameProps) {
  const isGold = level >= 3
  const isDefaultEmoji = !emoji || emoji === DEFAULT_EMOJI_SENTINEL
  const hasCustomEmoji = level >= 2 && !isDefaultEmoji

  // Estimate icon size from font size in className (fallback to 14px)
  const fontSizeMatch = className?.match(/text-\[(\d+(?:\.\d+)?)px\]/)
  const iconSize = fontSizeMatch ? Math.round(Number(fontSizeMatch[1]) * 1.1) : 15

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-extrabold",
        isGold && GOLD_NAME_CLASS,
        className,
      )}
    >
      {hasCustomEmoji ? (
        <span className="select-none leading-none" aria-hidden="true">
          {emoji}
        </span>
      ) : (
        <NearbyLogo size={iconSize} />
      )}
      <span>{isMe ? "Вы" : name}</span>
    </span>
  )
}
