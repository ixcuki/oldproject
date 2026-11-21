import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"
import { api, ApiError, tokenStore } from "@/lib/api"
import type {
  BootstrapResponse,
  Leaderboard,
  Me,
  Meta,
  Place,
  Position,
  Post,
  RegisterPayload,
} from "@/lib/types"
import { useToast } from "@/components/ToastProvider"

const POSITION_KEY = "unipulse_position"
const POLL_MS = 20000

type AppContextValue = {
  token: string | null
  me: Me | null
  meta: Meta | null
  places: Place[]
  posts: Post[]
  leaderboard: Leaderboard | null
  position: Position | null
  ready: boolean
  error: string | null
  locate: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  applyMe: (me: Me) => void
  applyPlace: (place: Place) => void
  applyPost: (post: Post) => void
  removePost: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function readPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Position
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed
  } catch {
    /* ignore */
  }
  return null
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [token, setToken] = useState<string | null>(() => tokenStore.get())
  const [me, setMe] = useState<Me | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [position, setPosition] = useState<Position | null>(() => readPosition())
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const positionRef = useRef<Position | null>(position)
  const locatingRef = useRef(false)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  const applyBootstrap = useCallback((data: BootstrapResponse) => {
    setMe(data.me)
    setMeta(data.meta)
    setPlaces(data.places)
    setPosts(data.posts)
    setLeaderboard(data.leaderboard)
    setLoaded(true)
    setError(null)
  }, [])

  const applyLive = useCallback((data: { me: Me; places: Place[]; posts: Post[] }) => {
    setMe(data.me)
    setPlaces(data.places)
    setPosts(data.posts)
  }, [])

  const forceLogout = useCallback(() => {
    tokenStore.clear()
    setToken(null)
    setMe(null)
    setMeta(null)
    setPlaces([])
    setPosts([])
    setLeaderboard(null)
    setLoaded(false)
  }, [])

  const handleError = useCallback(
    (exception: unknown) => {
      if (exception instanceof ApiError && exception.status === 401) {
        forceLogout()
        return
      }
      const message =
        exception instanceof Error ? exception.message : "Не получилось загрузить кампус"
      setError(message)
    },
    [forceLogout],
  )

  const loadBootstrap = useCallback(
    async (activeToken: string) => {
      if (!activeToken) return
      try {
        const current = positionRef.current
        const data = await api.bootstrap(current?.lat, current?.lng)
        applyBootstrap(data)
      } catch (exception) {
        handleError(exception)
      }
    },
    [applyBootstrap, handleError],
  )

  useEffect(() => {
    if (!token) {
      setLoaded(false)
      return
    }
    void loadBootstrap(token)
  }, [token, position?.lat, position?.lng, loadBootstrap])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const tick = async () => {
      if (document.hidden) return
      try {
        const current = positionRef.current
        const data = await api.live(current?.lat, current?.lng)
        if (!cancelled) applyLive(data)
      } catch (exception) {
        if (exception instanceof ApiError && exception.status === 401) {
          forceLogout()
        }
      }
    }

    const interval = window.setInterval(tick, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void tick()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [token, applyLive, forceLogout])

  const loginWith = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password)
    tokenStore.set(response.token)
    setMe(response.user)
    setMeta(response.meta)
    setError(null)
    setToken(response.token)
  }, [])

  const login = useCallback(
    (username: string, password: string) => loginWith(username, password),
    [loginWith],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await api.register(payload)
      tokenStore.set(response.token)
      setMe(response.user)
      setMeta(response.meta)
      setError(null)
      setToken(response.token)
    },
    [],
  )

  const demoLogin = useCallback(() => loginWith("ivan_p", "secret123"), [loginWith])

  const logout = useCallback(() => {
    api.logout().catch(() => undefined)
    forceLogout()
    setError(null)
  }, [forceLogout])

  const refresh = useCallback(async () => {
    if (!token) return
    try {
      const current = positionRef.current
      if (!loaded) {
        const data = await api.bootstrap(current?.lat, current?.lng)
        applyBootstrap(data)
      } else {
        const data = await api.live(current?.lat, current?.lng)
        applyLive(data)
      }
    } catch (exception) {
      handleError(exception)
    }
  }, [token, loaded, applyBootstrap, applyLive, handleError])

  const locate = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      toast("Браузер не поддерживает геолокацию", "error")
      return
    }
    if (locatingRef.current) return
    locatingRef.current = true
    toast("Запрашиваю геопозицию…")
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          const next: Position = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
            accuracy: result.coords.accuracy,
          }
          setPosition(next)
          positionRef.current = next
          try {
            localStorage.setItem(POSITION_KEY, JSON.stringify(next))
          } catch {
            /* ignore */
          }
          toast("Ты на карте кампуса", "success")
          resolve()
        },
        (failure) => {
          const message =
            failure.code === failure.PERMISSION_DENIED
              ? "Доступ к геопозиции закрыт. Разреши его в настройках браузера."
              : failure.code === failure.TIMEOUT
                ? "Геолокация не ответила. Попробуй ещё раз."
                : "macOS не отдал координаты. Включи Location Services для браузера."
          toast(message, "error")
          resolve()
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      )
    })
    locatingRef.current = false
  }, [toast])

  const applyMe = useCallback((next: Me) => setMe(next), [])

  const applyPlace = useCallback((place: Place) => {
    setPlaces((previous) => previous.map((item) => (item.id === place.id ? place : item)))
  }, [])

  const applyPost = useCallback((post: Post) => {
    setPosts((previous) => {
      const exists = previous.some((item) => item.id === post.id)
      return exists
        ? previous.map((item) => (item.id === post.id ? post : item))
        : [post, ...previous]
    })
  }, [])

  const removePost = useCallback((id: number) => {
    setPosts((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      token,
      me,
      meta,
      places,
      posts,
      leaderboard,
      position,
      ready: loaded && Boolean(me && meta),
      error,
      locate,
      login,
      register,
      demoLogin,
      logout,
      refresh,
      applyMe,
      applyPlace,
      applyPost,
      removePost,
    }),
    [
      token,
      me,
      meta,
      places,
      posts,
      leaderboard,
      position,
      loaded,
      error,
      locate,
      login,
      register,
      demoLogin,
      logout,
      refresh,
      applyMe,
      applyPlace,
      applyPost,
      removePost,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used inside AppProvider")
  return context
}
