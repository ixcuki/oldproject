import type { LiveStatus } from "./types"

const PALETTES = [
  ["#D9CCFF", "#B7A0F7"],
  ["#BDEBFA", "#8EC9F5"],
  ["#FFD0E6", "#F2A7D0"],
  ["#FFE2B8", "#FFC38A"],
  ["#BFF0DC", "#8FD8B8"],
  ["#E6D6FF", "#C4AEF9"],
] as const

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return "UP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function avatarPalette(seed: string): { from: string; to: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  const [from, to] = PALETTES[hash % PALETTES.length]
  return { from, to }
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n))
  if (abs % 10 === 1 && abs % 100 !== 11) return one
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 12 || abs % 100 > 14)) return few
  return many
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return ""
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10
    return `${rounded} м`
  }
  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1).replace(".", ",").replace(",0", "")} км`
  }
  return `${Math.round(km)} км`
}

export function formatLeft(seconds: number): string {
  if (seconds <= 0) return "истёк"
  if (seconds < 60) return "<1 мин"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "только что"
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return "вчера"
  return `${days} ${plural(days, "день", "дня", "дней")} назад`
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? "час" : `${hours} ${plural(hours, "час", "часа", "часов")}`
  }
  return `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`
}

export function statusSummary(status: LiveStatus | null | undefined): string {
  if (!status) return "нет live-статуса"
  const spots = status.spots ?? 0
  switch (status.type) {
    case "free":
      if (spots > 0) {
        return `${spots} ${plural(spots, "свободное место", "свободных места", "свободных мест")}`
      }
      return "есть свободные места"
    case "quiet":
      return "тихо и спокойно"
    case "queue":
      return "есть очередь"
    case "players":
      return spots > 0 ? `ищут ${spots} ${plural(spots, "игрока", "игроков", "игроков")}` : "ищут игроков"
    case "event":
      return "здесь мероприятие"
    case "busy":
      return "всё занято"
    default:
      return status.typeLabel
  }
}

export function toneColor(tone: string): string {
  switch (tone) {
    case "cyan":
      return "#0F7B94"
    case "pink":
      return "#B03C86"
    case "purple":
      return "#6D4FD6"
    case "orange":
      return "#9A5A0C"
    default:
      return "#137A58"
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function readFileAsAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Выбери изображение"))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Файл больше 8 МБ"))
      return
    }
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const size = 256
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext("2d")
      if (!context) {
        URL.revokeObjectURL(url)
        reject(new Error("Не удалось обработать фото"))
        return
      }
      const side = Math.min(image.width, image.height)
      const sx = (image.width - side) / 2
      const sy = (image.height - side) / 2
      context.drawImage(image, sx, sy, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.84))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Не удалось прочитать изображение"))
    }
    image.src = url
  })
}

export function formatXp(xp: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(xp)))
}
