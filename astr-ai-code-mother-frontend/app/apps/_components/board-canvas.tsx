"use client"

import * as React from "react"
import Link from "next/link"

import type { AppVO } from "@/lib/api/generated/model"
import { formatCodeGenType } from "@/lib/app-code-gen"
import { AppThumbnail } from "@/app/_components/app-thumbnail"

// World-space grid the tiles are scattered over.
const CELL_WIDTH = 360
const CELL_HEIGHT = 400
const TILE_WIDTHS = [200, 240, 280]
const TILE_ASPECTS = [4 / 3, 3 / 4, 1] // height / width
const MIN_SCALE = 0.1
const MAX_SCALE = 2
const FIT_PADDING = 96
const DRAG_THRESHOLD_PX = 4
const KEY_PAN_PX = 80

export interface BoardTile {
  app: AppVO
  x: number
  y: number
  width: number
  height: number
}

interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** FNV-1a, so each app keeps the same spot and size on every visit. */
function hash(value: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Loose grid with per-app jitter and size, like a hand-arranged moodboard. */
export function layoutBoard(apps: AppVO[]): BoardTile[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(apps.length * 1.5)))
  return apps.map((app, index) => {
    const h = hash(String(app.id))
    const width = TILE_WIDTHS[h % TILE_WIDTHS.length]
    const height = Math.round(width * TILE_ASPECTS[(h >>> 4) % TILE_ASPECTS.length])
    const column = index % columns
    const row = Math.floor(index / columns)
    const jitterX = ((h >>> 8) % 1000) / 1000
    const jitterY = ((h >>> 18) % 1000) / 1000
    return {
      app,
      width,
      height,
      x: column * CELL_WIDTH + jitterX * (CELL_WIDTH - width - 24),
      y: row * CELL_HEIGHT + jitterY * Math.max(0, CELL_HEIGHT - height - 24),
    }
  })
}

function boundsOf(tiles: BoardTile[]): Rect | null {
  if (tiles.length === 0) return null
  return {
    minX: Math.min(...tiles.map((t) => t.x)),
    minY: Math.min(...tiles.map((t) => t.y)),
    maxX: Math.max(...tiles.map((t) => t.x + t.width)),
    maxY: Math.max(...tiles.map((t) => t.y + t.height)),
  }
}

export interface BoardCanvasHandle {
  zoomBy: (factor: number) => void
  /** Fits the given app ids, or every tile when omitted. */
  fit: (appIds?: string[]) => void
}

/**
 * Pan/zoom canvas (see design.md「例外：应用画板」). The view transform lives
 * in a ref and is written straight to the world element, so dragging and
 * wheel zooming never re-render React; only the displayed zoom percentage
 * goes through `onZoomChange`.
 */
export const BoardCanvas = React.forwardRef<
  BoardCanvasHandle,
  {
    tiles: BoardTile[]
    /** App ids matching the current search; null when not searching. */
    matches: Set<string> | null
    onZoomChange: (scale: number) => void
  }
>(function BoardCanvas({ tiles, matches, onZoomChange }, ref) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const worldRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef({ x: 0, y: 0, scale: 1 })
  const reducedMotionRef = React.useRef(false)
  const dragRef = React.useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const draggedRef = React.useRef(false)

  const apply = React.useCallback(
    (animate = false) => {
      const world = worldRef.current
      if (!world) return
      const { x, y, scale } = viewRef.current
      world.style.transition = animate && !reducedMotionRef.current ? "transform 200ms ease-out" : "none"
      world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      // Lets tile captions counter-scale to a constant on-screen size.
      world.style.setProperty("--board-scale", String(scale))
      onZoomChange(scale)
    },
    [onZoomChange],
  )

  /** Zoom keeping the world point under (cx, cy) — viewport coords — fixed. */
  const zoomAt = React.useCallback(
    (factor: number, cx: number, cy: number, animate = false) => {
      const view = viewRef.current
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
      const ratio = scale / view.scale
      viewRef.current = { scale, x: cx - (cx - view.x) * ratio, y: cy - (cy - view.y) * ratio }
      apply(animate)
    },
    [apply],
  )

  const fitRect = React.useCallback(
    (rect: Rect, animate: boolean) => {
      const viewport = viewportRef.current
      if (!viewport) return
      const width = viewport.clientWidth
      const height = viewport.clientHeight
      const scale = Math.min(
        1,
        Math.max(
          MIN_SCALE,
          Math.min(
            (width - FIT_PADDING * 2) / Math.max(1, rect.maxX - rect.minX),
            (height - FIT_PADDING * 2) / Math.max(1, rect.maxY - rect.minY),
          ),
        ),
      )
      viewRef.current = {
        scale,
        x: width / 2 - ((rect.minX + rect.maxX) / 2) * scale,
        y: height / 2 - ((rect.minY + rect.maxY) / 2) * scale,
      }
      apply(animate)
    },
    [apply],
  )

  React.useImperativeHandle(
    ref,
    () => ({
      zoomBy: (factor) => {
        const viewport = viewportRef.current
        if (viewport) zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2, true)
      },
      fit: (appIds) => {
        const subset = appIds ? tiles.filter((t) => appIds.includes(String(t.app.id))) : tiles
        const rect = boundsOf(subset)
        if (rect) fitRect(rect, true)
      },
    }),
    [tiles, zoomAt, fitRect],
  )

  // Fit everything before first paint and whenever the set of tiles changes.
  React.useLayoutEffect(() => {
    const rect = boundsOf(tiles)
    if (rect) fitRect(rect, false)
  }, [tiles, fitRect])

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      reducedMotionRef.current = query.matches
    }
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  // Trackpad two-finger scroll pans; pinch (ctrl+wheel) and cmd/ctrl+wheel zoom.
  // Native listener: React's onWheel is passive and can't stop page zoom.
  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        const box = viewport.getBoundingClientRect()
        // Pinch deltas are a few px; a mouse wheel notch is ~100. Clamp so one
        // notch zooms ~1.6x instead of jumping straight to the limit.
        const delta = Math.max(-50, Math.min(50, event.deltaY))
        zoomAt(Math.exp(-delta * 0.01), event.clientX - box.left, event.clientY - box.top)
      } else {
        viewRef.current = { ...viewRef.current, x: viewRef.current.x - event.deltaX, y: viewRef.current.y - event.deltaY }
        apply()
      }
    }
    viewport.addEventListener("wheel", onWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", onWheel)
  }, [zoomAt, apply])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    draggedRef.current = false
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!draggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      draggedRef.current = true
      // Captured only once it's a real drag, so a plain click still reaches the tile link.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (!draggedRef.current) return
    viewRef.current = { ...viewRef.current, x: drag.originX + dx, y: drag.originY + dy }
    apply()
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Only when the canvas itself has focus; tiles keep normal link behaviour.
    if (event.target !== event.currentTarget) return
    const viewport = event.currentTarget
    const pan = (dx: number, dy: number) => {
      viewRef.current = { ...viewRef.current, x: viewRef.current.x + dx, y: viewRef.current.y + dy }
      apply(true)
    }
    const handled: Record<string, () => void> = {
      ArrowLeft: () => pan(KEY_PAN_PX, 0),
      ArrowRight: () => pan(-KEY_PAN_PX, 0),
      ArrowUp: () => pan(0, KEY_PAN_PX),
      ArrowDown: () => pan(0, -KEY_PAN_PX),
      "+": () => zoomAt(1.25, viewport.clientWidth / 2, viewport.clientHeight / 2, true),
      "=": () => zoomAt(1.25, viewport.clientWidth / 2, viewport.clientHeight / 2, true),
      "-": () => zoomAt(0.8, viewport.clientWidth / 2, viewport.clientHeight / 2, true),
      "0": () => {
        const rect = boundsOf(tiles)
        if (rect) fitRect(rect, true)
      },
    }
    const action = handled[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  /** Tabbing to an off-screen tile brings it into view. */
  function handleTileFocus(tile: BoardTile) {
    const viewport = viewportRef.current
    if (!viewport) return
    const { x, y, scale } = viewRef.current
    const left = x + tile.x * scale
    const top = y + tile.y * scale
    const inView =
      left >= 0 &&
      top >= 0 &&
      left + tile.width * scale <= viewport.clientWidth &&
      top + tile.height * scale <= viewport.clientHeight
    if (inView) return
    viewRef.current = {
      scale,
      x: viewport.clientWidth / 2 - (tile.x + tile.width / 2) * scale,
      y: viewport.clientHeight / 2 - (tile.y + tile.height / 2) * scale,
    }
    apply(true)
  }

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label="应用画板：拖动或方向键平移，+ / - 缩放，0 适应画布"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative size-full cursor-grab touch-none overflow-hidden bg-muted outline-none select-none active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <div ref={worldRef} className="absolute top-0 left-0 origin-top-left">
        {tiles.map((tile) => {
          const id = String(tile.app.id)
          const dimmed = matches !== null && !matches.has(id)
          const name = tile.app.appName || "未命名应用"
          return (
            <Link
              key={id}
              href={`/apps/${id}`}
              draggable={false}
              aria-label={`${name}，${formatCodeGenType(tile.app.codeGenType)}`}
              onFocus={() => handleTileFocus(tile)}
              onClick={(event) => {
                if (draggedRef.current) event.preventDefault()
              }}
              className={`group absolute block overflow-hidden rounded-md bg-card shadow-sm outline-none transition-opacity duration-200 focus-visible:ring-3 focus-visible:ring-ring ${
                dimmed ? "opacity-20" : "opacity-100"
              }`}
              style={{ left: tile.x, top: tile.y, width: tile.width, height: tile.height }}
            >
              <AppThumbnail app={tile.app} />
              {/* Counter-scaled so the name stays readable at any zoom. */}
              <span
                className="absolute bottom-0 left-0 origin-bottom-left truncate bg-foreground/60 px-2 py-1 text-xs text-background opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{
                  width: "calc(100% * var(--board-scale, 1))",
                  transform: "scale(calc(1 / var(--board-scale, 1)))",
                }}
              >
                {name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
})
