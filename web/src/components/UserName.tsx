/**
 * UserName — renders a user's display name with level perks:
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

export function UserName({ name, emoji, level = 1, className, isMe }: UserNameProps) {
  const showEmoji = level >= 2 && emoji
  const isGold = level >= 3

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-extrabold",
        isGold && GOLD_NAME_CLASS,
        className,
      )}
    >
      {showEmoji && (
        <span className="select-none leading-none" aria-hidden="true">
          {emoji}
        </span>
      )}
      <span>{isMe ? "Вы" : name}</span>
    </span>
  )
}
