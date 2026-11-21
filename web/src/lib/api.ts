import type {
  BootstrapResponse,
  LiveResponse,
  Me,
  Meta,
  Place,
  Plan,
  Post,
  RegisterPayload,
} from "./types"

const TOKEN_KEY = "unipulse_token"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

type Options = {
  method?: string
  body?: unknown
  lat?: number | null
  lng?: number | null
  query?: Record<string, string | number | null | undefined>
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const params = new URLSearchParams()
  if (options.lat != null && options.lng != null) {
    params.set("lat", String(options.lat))
    params.set("lng", String(options.lng))
  }
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value != null && value !== "") params.set(key, String(value))
    }
  }
  const query = params.toString()
  const token = tokenStore.get()
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`/api${path}${query ? `?${query}` : ""}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError("Нет связи с сервером. Проверь подключение.", 0)
  }

  const text = await response.text()
  let data: unknown = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = {}
    }
  }
  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail.length
          ? "Проверь заполненные поля"
          : "Не получилось выполнить запрос"
    throw new ApiError(message, response.status)
  }
  return data as T
}

export const api = {
  meta: () => request<Meta>("/meta"),

  login: (username: string, password: string) =>
    request<{ token: string; user: Me; meta: Meta }>("/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  register: (payload: RegisterPayload) =>
    request<{ token: string; user: Me; meta: Meta }>("/auth/register", {
      method: "POST",
      body: payload,
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<{ me: Me; now: number }>("/me"),

  updateMe: (payload: {
    firstName: string
    lastName: string
    faculty: string
    telegram: string
    github: string
    maxsite: string
    avatar?: string | null
  }) => request<{ me: Me }>("/me", { method: "PATCH", body: payload }),

  bootstrap: (lat?: number | null, lng?: number | null) =>
    request<BootstrapResponse>("/bootstrap", { lat, lng }),

  live: (lat?: number | null, lng?: number | null) =>
    request<LiveResponse>("/live", { lat, lng }),

  place: (id: number, lat?: number | null, lng?: number | null) =>
    request<{ now: number; place: Place }>(`/places/${id}`, { lat, lng }),

  createStatus: (
    placeId: number,
    payload: { type: string; text: string; spots?: number | null; ttlMinutes: number },
  ) =>
    request<{ status: unknown; place: Place; xpAwarded: number; me: Me }>(
      `/places/${placeId}/status`,
      { method: "POST", body: payload },
    ),

  createReview: (placeId: number, rating: number, comment: string) =>
    request<{ place: Place; xpAwarded: number; me: Me }>(`/places/${placeId}/reviews`, {
      method: "POST",
      body: { rating, comment },
    }),

  feed: (category?: string, lat?: number | null, lng?: number | null) =>
    request<{ now: number; posts: Post[]; me: Me }>("/feed", {
      lat,
      lng,
      query: { category },
    }),

  createPost: (payload: { category: string; text: string; placeId?: number | null }) =>
    request<{ post: Post; xpAwarded: number; me: Me }>("/posts", {
      method: "POST",
      body: payload,
    }),

  deletePost: (id: number) => request<{ ok: boolean }>(`/posts/${id}`, { method: "DELETE" }),

  respond: (id: number) =>
    request<{
      telegram: string
      telegramUrl: string
      author: { name: string; university: string; faculty: string }
      xpAwarded: number
      already: boolean
      me: Me
    }>(`/posts/${id}/respond`, { method: "POST" }),

  leaderboard: (university?: string) =>
    request<{ now: number; leaderboard: BootstrapResponse["leaderboard"]; me: Me }>(
      "/leaderboard",
      { query: { university } },
    ),

  aiPlan: (query: string, lat?: number | null, lng?: number | null) =>
    request<Plan>("/ai/plan", { method: "POST", body: { query, lat, lng } }),
}
