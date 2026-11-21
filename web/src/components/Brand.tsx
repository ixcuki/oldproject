import { cn } from "@/lib/utils"

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{ filter: "drop-shadow(0 0 7px rgba(150,80,255,.45))" }}
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

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-extrabold tracking-[-0.03em]", className)}>
      near<span className="text-[#8B6CF0]">by</span>
    </span>
  )
}

export function Skyline({ className, opacity = 0.55 }: { className?: string; opacity?: number }) {
  return (
    <svg
      viewBox="0 0 390 110"
      preserveAspectRatio="xMidYMax slice"
      className={cn("pointer-events-none", className)}
      style={{ opacity }}
      aria-hidden="true"
    >
      <g fill="#D8CCF8">
        <rect x="0" y="70" width="40" height="40" />
        <rect x="48" y="52" width="30" height="58" />
        <path d="M90 110V66l30-20 30 20v44z" />
        <rect x="160" y="60" width="26" height="50" />
        <rect x="196" y="78" width="40" height="32" />
        <rect x="246" y="48" width="24" height="62" />
        <rect x="280" y="64" width="34" height="46" />
        <rect x="324" y="56" width="30" height="54" />
        <rect x="360" y="74" width="30" height="36" />
      </g>
      <path d="M0 100Q60 60 120 100T240 100T360 100" fill="none" stroke="#B7A7E8" strokeWidth="3" />
      <g fill="#FFFFFF" opacity="0.8">
        <rect x="56" y="62" width="4" height="5" />
        <rect x="66" y="74" width="4" height="5" />
        <rect x="118" y="72" width="5" height="6" />
        <rect x="168" y="70" width="4" height="5" />
        <rect x="252" y="58" width="4" height="5" />
        <rect x="290" y="76" width="4" height="5" />
        <rect x="332" y="66" width="4" height="5" />
      </g>
    </svg>
  )
}

export function SkylinePulse({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 390 110"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
    >
      <path
        d="M0 100Q60 60 120 100T240 100T360 100"
        fill="none"
        stroke="#B7A7E8"
        strokeWidth="3"
      />
      <g fill="#FFFFFF" opacity="0.9">
        <circle cx="40" cy="30" r="2" />
        <circle cx="120" cy="18" r="1.5" />
        <circle cx="200" cy="42" r="1.5" />
        <circle cx="286" cy="24" r="2" />
        <circle cx="350" cy="48" r="1.5" />
      </g>
      <g fill="#D8CCF8" opacity="0.7">
        <rect x="0" y="80" width="34" height="30" />
        <rect x="58" y="70" width="26" height="40" />
        <rect x="302" y="72" width="30" height="38" />
        <rect x="352" y="82" width="38" height="28" />
      </g>
    </svg>
  )
}
