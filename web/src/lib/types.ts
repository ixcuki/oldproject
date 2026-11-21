export type Tone = "green" | "cyan" | "pink" | "purple" | "orange"

export interface Level {
  level: number
  name: string
  emoji: string
  min: number
  nextMin: number | null
  nextName: string | null
  span: number | null
  into: number
  toNext: number
  progress: number
  isMax: boolean
}

export interface UserMini {
  id: number
  username: string
  firstName: string
  lastName: string
  name: string
  university: string
  faculty: string
  avatar: string | null
  emoji: string
  levelNum: number
}

export interface Achievement {
  id: string
  title: string
  hint: string
  icon: string
  unlocked: boolean
  progress: number
}

export interface Counts {
  reviews: number
  statuses: number
  posts: number
  responses: number
  places: number
}

export interface UserProfile {
  id: number
  username: string
  firstName: string
  lastName: string
  name: string
  university: string
  faculty: string
  city: string
  avatar: string | null
  telegram: string
  github: string
  maxsite: string
  emoji: string
  xp: number
  level: Level
  levelShort: { level: number; name: string; emoji: string }
  counts: Counts
  createdAt: number
  isMe: boolean
}

export interface Me extends UserMini {
  telegram: string
  github: string
  maxsite: string
  emoji: string
  xp: number
  level: Level
  levelShort: { level: number; name: string; emoji: string }
  counts: Counts
  achievements: Achievement[]
  createdAt: number
  city: string
}

export interface LiveStatus {
  id: number
  placeId: number
  type: string
  typeLabel: string
  tone: Tone
  text: string
  spots: number | null
  createdAt: number
  expiresAt: number
  ttlMinutes: number
  secondsLeft: number
  minutesLeft: string
  author: UserMini
}

export interface Review {
  id: number
  rating: number
  comment: string
  createdAt: number
  author: UserMini
  isMine: boolean
}

export interface Place {
  id: number
  name: string
  kind: string
  kindLabel: string
  kindIcon: string
  description: string
  address: string
  university: string
  lat: number
  lng: number
  rating: number | null
  reviewCount: number
  status: LiveStatus | null
  distanceM: number | null
  reviews?: Review[]
}

export interface PostPlace {
  id: number
  name: string
  kind: string
  kindLabel: string
}

export interface Post {
  id: number
  category: string
  categoryLabel: string
  text: string
  createdAt: number
  expiresAt: number
  secondsLeft: number
  minutesLeft: string
  author: UserMini
  place: PostPlace | null
  responders: number
  responded: boolean
  isMine: boolean
  distanceM: number | null
}

export interface LeaderEntry {
  rank: number
  user: UserMini
  xp: number
  level: { level: number; name: string; emoji: string }
  isMe: boolean
}

export interface Leaderboard {
  entries: LeaderEntry[]
  me: LeaderEntry | null
  total: number
  university: string | null
}

export interface Meta {
  city: string
  campus: string
  universities: { short: string; full: string; name: string }[]
  faculties: Record<string, string[]>
  placeKinds: Record<string, { label: string; icon: string }>
  statusTypes: Record<string, { label: string; short: string; tone: Tone }>
  postCategories: Record<string, { label: string; hint: string }>
  xpRules: { kind: string; points: number; label: string }[]
  levels: { name: string; emoji: string; min: number }[]
  statusTtlChoices: number[]
  postTtlHours: number
  center: { lat: number; lng: number }
}

export interface PlanStep {
  time: string
  title: string
  detail: string
  placeId: number | null
  icon: string
}

export interface Plan {
  title: string
  intro?: string
  steps: PlanStep[]
  placeIds: number[]
  source: "llm" | "local"
  mode: "answer" | "plan"
  generatedAt: number
  budgetMinutes: number | null
}

export interface BootstrapResponse {
  now: number
  me: Me
  places: Place[]
  posts: Post[]
  leaderboard: Leaderboard
  meta: Meta
}

export interface LiveResponse {
  now: number
  me: Me
  places: Place[]
  posts: Post[]
}

export interface Position {
  lat: number
  lng: number
  accuracy?: number
}

export interface RegisterPayload {
  username: string
  password: string
  firstName: string
  lastName: string
  university: string
  faculty: string
  telegram: string
  avatar?: string | null
}
