import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Crosshair, Minus, Plus } from "lucide-react"
import type { Place, Position } from "@/lib/types"
import {
  escapeHtml,
  formatDistance,
  statusSummary,
  toneColor,
} from "@/lib/format"

export type MapFilter = "all" | "places" | "players" | "events"

type CampusMapProps = {
  places: Place[]
  position: Position | null
  selectedId: number | null
  focusIds: number[]
  filter: MapFilter
  center: { lat: number; lng: number }
  onSelect: (place: Place | null) => void
  onLocate: () => void
}

const KIND_STYLE: Record<string, { bg: string; fg: string; border: string }> = {
  library: { bg: "#BFF0DC", fg: "#137A58", border: "#9ADFC4" },
  study: { bg: "#EBE3FF", fg: "#6D4FD6", border: "#C9B8F5" },
  cafe: { bg: "#BDE4F2", fg: "#0F7B94", border: "#9ED7EC" },
  food: { bg: "#FFDDB0", fg: "#9A5A0C", border: "#F2C98E" },
  sport: { bg: "#FFC9E3", fg: "#B03C86", border: "#F2A9D2" },
  event: { bg: "#D9CCFF", fg: "#6D4FD6", border: "#B9A2F0" },
  rest: { bg: "#D5F3E6", fg: "#137A58", border: "#9ADFC4" },
}

const ICONS: Record<string, string> = {
  library:
    '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM8 7h8"/>',
  study:
    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  cafe:
    '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/>',
  food:
    '<path d="M6 2v20M3 2v6a3 3 0 0 0 6 0V2M17 2v20M14 8c0-3 2.5-5 5-5v10"/>',
  sport:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18"/>',
  event:
    '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  rest:
    '<path d="M12 22v-6M12 3l6 8h-4l4 5H6l4-5H6z"/>',
}

function iconSvg(kind: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind] ?? ICONS.event}</svg>`
}

function pinHtml(
  place: Place,
  options: { selected: boolean; hot: boolean; withLabel: boolean },
): string {
  const style = KIND_STYLE[place.kind] ?? KIND_STYLE.event
  const status = place.status
  const showPill = options.withLabel && Boolean(status)
  const classes = [
    "up-pin",
    showPill ? "" : "up-pin--compact",
    options.selected ? "up-pin--selected" : "",
    options.hot ? "up-pin--hot" : "",
  ]
    .filter(Boolean)
    .join(" ")
  const border = options.hot ? "#46C99A" : options.selected ? "#7C5CE0" : style.border
  if (!showPill) {
    return `<div class="${classes}" style="border-color:${border}">
      <span class="up-pin__ico" style="background:${style.bg};color:${style.fg}">${iconSvg(place.kind)}</span>
    </div>`
  }
  return `<div class="${classes}" style="border-color:${border}">
    <span class="up-pin__ico" style="background:${style.bg};color:${style.fg}">${iconSvg(place.kind)}</span>
    <span class="up-pin__txt">
      <b>${escapeHtml(place.name)}</b>
      <em style="color:${toneColor(status?.tone ?? "green")}">${escapeHtml(statusSummary(status))}</em>
    </span>
  </div>`
}

function clusterHtml(count: number, hasLive: boolean): string {
  return `<div class="up-cluster${hasLive ? " up-cluster--live" : ""}">${count}</div>`
}

export function filterPlaces(places: Place[], filter: MapFilter): Place[] {
  if (filter === "players") return places.filter((p) => p.status?.type === "players")
  if (filter === "events") return places.filter((p) => p.status?.type === "event")
  if (filter === "places") {
    return places.filter(
      (p) => !p.status || !["players", "event"].includes(p.status.type),
    )
  }
  return places
}

export function CampusMap({
  places,
  position,
  selectedId,
  focusIds,
  filter,
  center,
  onSelect,
  onLocate,
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const pinsRef = useRef<L.LayerGroup | null>(null)
  const userRef = useRef<L.LayerGroup | null>(null)
  const callbacks = useRef({ onSelect })
  const stateRef = useRef({ places, filter, selectedId, focusIds })
  const renderPinsRef = useRef<() => void>(() => undefined)
  const lastFocus = useRef("")
  const firstUserFix = useRef(false)

  useEffect(() => {
    callbacks.current = { onSelect }
  }, [onSelect])

  useEffect(() => {
    stateRef.current = { places, filter, selectedId, focusIds }
  }, [places, filter, selectedId, focusIds])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      minZoom: 12,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [
        [51.47, 45.88],
        [51.6, 46.11],
      ],
      maxBoundsViscosity: 0.85,
    })
    L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc",
      crossOrigin: true,
    }).addTo(map)
    pinsRef.current = L.layerGroup().addTo(map)
    userRef.current = L.layerGroup().addTo(map)
    map.on("click", () => callbacks.current.onSelect(null))
    map.on("moveend zoomend", () => renderPinsRef.current())
    mapRef.current = map

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      pinsRef.current = null
      userRef.current = null
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    const draw = () => {
      const map = mapRef.current
      const layer = pinsRef.current
      if (!map || !layer) return
      const state = stateRef.current
      layer.clearLayers()
      const shown = filterPlaces(state.places, state.filter)
      const zoom = map.getZoom()

      // --- clustering at zoom < 14 ---
      if (zoom < 14) {
        // Grid cell size in px for clustering
        const CELL = 72
        const cells = new Map<string, Place[]>()
        for (const place of shown) {
          const pt = map.latLngToContainerPoint([place.lat, place.lng])
          const key = `${Math.floor(pt.x / CELL)}_${Math.floor(pt.y / CELL)}`
          if (!cells.has(key)) cells.set(key, [])
          cells.get(key)!.push(place)
        }
        for (const [, group] of cells) {
          if (group.length === 1) {
            const place = group[0]
            const selected = place.id === state.selectedId
            const hot = state.focusIds.includes(place.id)
            const icon = L.divIcon({
              className: "up-pin-wrap",
              html: pinHtml(place, { selected, hot, withLabel: false }),
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })
            const marker = L.marker([place.lat, place.lng], {
              icon,
              zIndexOffset: selected ? 1000 : hot ? 500 : place.status ? 200 : 0,
              keyboard: false,
            })
            marker.on("click", (event) => {
              L.DomEvent.stopPropagation(event)
              callbacks.current.onSelect(place)
            })
            marker.addTo(layer)
          } else {
            // Find centroid
            const lat = group.reduce((s, p) => s + p.lat, 0) / group.length
            const lng = group.reduce((s, p) => s + p.lng, 0) / group.length
            const hasLive = group.some((p) => p.status)
            const icon = L.divIcon({
              className: "up-pin-wrap",
              html: clusterHtml(group.length, hasLive),
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })
            const marker = L.marker([lat, lng], { icon, zIndexOffset: 300, keyboard: false })
            marker.on("click", (event) => {
              L.DomEvent.stopPropagation(event)
              map.flyTo([lat, lng], map.getZoom() + 2, { duration: 0.5 })
            })
            marker.addTo(layer)
          }
        }
        return
      }

      // --- normal pin rendering at zoom >= 14 ---
      const ranked = [...shown].sort((a, b) => {
        const priority = (place: Place): number => {
          if (place.id === state.selectedId) return 100
          if (state.focusIds.includes(place.id)) return 90
          if (place.status) return 50 + Math.min(10, place.reviewCount)
          return place.rating ?? 0
        }
        return priority(b) - priority(a)
      })
      const occupied: { left: number; top: number; right: number; bottom: number }[] = []
      const fits = (rect: { left: number; top: number; right: number; bottom: number }) => {
        const pad = 3
        return !occupied.some(
          (other) =>
            rect.left < other.right + pad &&
            rect.right > other.left - pad &&
            rect.top < other.bottom + pad &&
            rect.bottom > other.top - pad,
        )
      }
      for (const place of ranked) {
        const selected = place.id === state.selectedId
        const hot = state.focusIds.includes(place.id)
        const point = map.latLngToContainerPoint([place.lat, place.lng])
        const wantsPill = Boolean(place.status)
        const pillRect = {
          left: point.x - 92,
          right: point.x + 92,
          top: point.y - 40,
          bottom: point.y,
        }
        const compactRect = {
          left: point.x - 18,
          right: point.x + 18,
          top: point.y - 36,
          bottom: point.y,
        }
        let withLabel = wantsPill && (selected || hot || fits(pillRect))
        if (!withLabel && selected) withLabel = true
        const rect = withLabel ? pillRect : compactRect
        if (!selected && !fits(rect)) continue
        occupied.push(rect)
        const icon = L.divIcon({
          className: "up-pin-wrap",
          html: pinHtml(place, { selected, hot, withLabel }),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        })
        const marker = L.marker([place.lat, place.lng], {
          icon,
          zIndexOffset: selected ? 1000 : hot ? 500 : place.status ? 200 : 0,
          keyboard: false,
        })
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event)
          callbacks.current.onSelect(place)
        })
        marker.addTo(layer)
      }
    }
    renderPinsRef.current = draw
    draw()
  }, [places, filter, selectedId, focusIds])

  useEffect(() => {
    const map = mapRef.current
    const layer = userRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!position) return
    const icon = L.divIcon({
      className: "up-pin-wrap",
      html: '<div class="up-user-dot"></div>',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
    L.marker([position.lat, position.lng], { icon, zIndexOffset: 800, keyboard: false }).addTo(layer)
    L.circle([position.lat, position.lng], {
      radius: Math.min(Math.max(position.accuracy ?? 40, 25), 120),
      color: "#7C5CE0",
      weight: 1,
      fillColor: "#7C5CE0",
      fillOpacity: 0.08,
    }).addTo(layer)
    if (!firstUserFix.current) {
      const campus = L.latLng(center.lat, center.lng)
      const fix = L.latLng(position.lat, position.lng)
      if (map.distance(campus, fix) > 1500) {
        map.flyToBounds(L.latLngBounds([campus, fix]), {
          padding: [48, 48],
          duration: 0.9,
          maxZoom: 15,
        })
      } else {
        map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { duration: 0.8 })
      }
      firstUserFix.current = true
    }
  }, [position, center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusIds.length) return
    const key = focusIds.join(",")
    if (lastFocus.current === key) return
    lastFocus.current = key
    const points = places
      .filter((place) => focusIds.includes(place.id))
      .map((place) => [place.lat, place.lng] as [number, number])
    if (points.length === 1) {
      map.flyTo(points[0], 16, { duration: 0.7 })
    } else if (points.length > 1) {
      map.flyToBounds(L.latLngBounds(points), {
        padding: [56, 56],
        duration: 0.7,
        maxZoom: 16,
      })
    }
  }, [focusIds, places])

  const zoom = (delta: number) => mapRef.current?.zoomIn(delta > 0 ? 1 : -1)
  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    if (position) map.flyTo([position.lat, position.lng], 16, { duration: 0.6 })
    else map.flyTo([center.lat, center.lng], 15, { duration: 0.6 })
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Карта кампуса СГУ" />

      <div className="absolute top-3 right-3 z-[800] flex flex-col items-end gap-2">
        <div className="flex flex-col overflow-hidden rounded-[13px] border border-uni-line bg-white/92 shadow-[0_6px_18px_rgba(124,92,224,0.16)] backdrop-blur">
          <button
            type="button"
            aria-label="Приблизить карту"
            onClick={() => zoom(1)}
            className="flex size-9 items-center justify-center text-uni-brand-deep active:bg-uni-soft"
          >
            <Plus size={17} strokeWidth={2.6} />
          </button>
          <div className="mx-2 h-px bg-uni-line-soft" />
          <button
            type="button"
            aria-label="Отдалить карту"
            onClick={() => zoom(-1)}
            className="flex size-9 items-center justify-center text-uni-brand-deep active:bg-uni-soft"
          >
            <Minus size={17} strokeWidth={2.6} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Показать моё местоположение"
          onClick={onLocate}
          className="flex size-10 items-center justify-center rounded-[13px] border border-[#9ED7EC] bg-white/95 text-uni-cyan shadow-[0_6px_18px_rgba(124,92,224,0.16)] backdrop-blur active:bg-[#EAF6FB]"
        >
          <Crosshair size={18} strokeWidth={2.3} />
        </button>
        <button
          type="button"
          aria-label="Вернуться к кампусу"
          onClick={recenter}
          className="rounded-[10px] border border-uni-line bg-white/90 px-2 py-1 text-[9px] font-extrabold text-uni-muted-2 shadow-sm"
        >
          ЦЕНТР
        </button>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-white/75 px-1.5 py-0.5 text-[8px] font-bold text-uni-muted no-underline"
        >
          © OpenStreetMap
        </a>
      </div>

      {!position && (
        <button
          type="button"
          onClick={onLocate}
          className="absolute top-3 left-3 z-[800] flex min-h-9 items-center gap-1.5 rounded-full border border-[#9ED7EC] bg-white/95 px-3 text-[11px] font-extrabold text-uni-cyan shadow-[0_6px_18px_rgba(124,92,224,0.14)] backdrop-blur"
        >
          <Crosshair size={14} strokeWidth={2.4} />
          Включить геопозицию
        </button>
      )}

      {position && (
        <div className="absolute top-3 left-3 z-[800] rounded-full border border-[#9ADFC4] bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-uni-green shadow-sm backdrop-blur">
          ты на карте
          {position.accuracy ? ` · ±${formatDistance(position.accuracy)}` : ""}
        </div>
      )}
    </div>
  )
}
