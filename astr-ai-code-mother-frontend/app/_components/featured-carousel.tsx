"use client"

import * as React from "react"
import Link from "next/link"

import type { AppVO } from "@/lib/api/generated/model"
import { formatCodeGenType } from "@/lib/app-code-gen"
import { AppThumbnail } from "@/app/_components/app-thumbnail"

// Fewer cards than this can't fill both sides of a loop without repeats,
// so they're laid out as a static arc instead.
const LOOP_MIN_CARDS = 5
// Centre-to-centre distance between neighbours, in card widths.
const SPACING = 1.08
// Release velocity (cards/s) is projected this far ahead to pick the card to settle on.
const FLING_SECONDS = 0.3
const DRAG_THRESHOLD_PX = 4
const WHEEL_SETTLE_MS = 120

const CARD_SIZE = "w-56 sm:w-64 lg:w-72"

function mod(value: number, n: number) {
  return ((value % n) + n) % n
}

/** Signed distance from `from` to `to` on a loop of n, in [-n/2, n/2). */
function loopDelta(to: number, from: number, n: number) {
  return mod(to - from + n / 2, n) - n / 2
}

/**
 * Cover-flow style carousel (see design.md「例外：落地页」). The position is a
 * float card index kept in a ref; per-frame transforms are written straight
 * to the DOM so dragging never re-renders React. State only tracks which
 * card is centred, for focus and aria.
 */
export function FeaturedCarousel({ apps }: { apps: AppVO[] }) {
  const n = apps.length
  const loop = n >= LOOP_MIN_CARDS

  const sizerRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLAnchorElement | null)[]>([])
  const dimRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const widthRef = React.useRef(0)
  const posRef = React.useRef(0)
  const targetRef = React.useRef<number | null>(null)
  const frameRef = React.useRef(0)
  const reducedMotionRef = React.useRef(false)
  const dragRef = React.useRef<{ startX: number; startPos: number; lastX: number; lastT: number; velocity: number } | null>(null)
  const draggedRef = React.useRef(false)
  const [active, setActive] = React.useState(0)

  const layout = React.useCallback(() => {
    const w = widthRef.current
    if (!w) return
    // A static arc is centred on its middle card(s).
    const centre = loop ? posRef.current : (n - 1) / 2
    for (let i = 0; i < n; i++) {
      const card = cardRefs.current[i]
      if (!card) continue
      const d = loop ? loopDelta(i, centre, n) : i - centre
      const a = Math.abs(d)
      // Outer cards close in on their neighbours, sit lower, shrink toward
      // their bottom edge and turn their outside edge toward the viewer.
      const x = d * w * SPACING - Math.sign(d) * Math.max(0, a - 1) * w * 0.14
      const y = a * a * w * 0.02
      const scale = Math.max(0.6, 1 - 0.13 * a)
      const rotate = Math.max(-24, Math.min(24, -d * 8))
      const opacity = loop ? Math.min(1, Math.max(0, 1 - (a - 1.5) / 1.5)) : 1
      card.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotateY(${rotate}deg) scale(${scale})`
      card.style.opacity = String(opacity)
      card.style.zIndex = String(100 - Math.round(a * 10))
      card.style.visibility = opacity === 0 ? "hidden" : "visible"
      const dim = dimRefs.current[i]
      if (dim) dim.style.opacity = String(Math.min(0.6, a * 0.22))
    }
  }, [loop, n])

  const settle = React.useCallback(() => {
    posRef.current = mod(Math.round(posRef.current), n)
    targetRef.current = null
    layout()
    setActive(posRef.current)
  }, [layout, n])

  const animateTo = React.useCallback(
    (target: number) => {
      cancelAnimationFrame(frameRef.current)
      targetRef.current = target
      // Focus and aria follow the user's intent right away, not the end of the motion.
      setActive(mod(Math.round(target), n))
      if (reducedMotionRef.current) {
        posRef.current = target
        settle()
        return
      }
      let last = performance.now()
      const tick = (now: number) => {
        const t = targetRef.current
        if (t === null) return
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const diff = t - posRef.current
        if (Math.abs(diff) < 0.005) {
          posRef.current = t
          settle()
          return
        }
        posRef.current += diff * (1 - Math.exp(-dt * 10))
        layout()
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
    },
    [layout, settle, n],
  )

  const step = React.useCallback(
    (by: number) => animateTo(Math.round(targetRef.current ?? posRef.current) + by),
    [animateTo],
  )

  // Measure the card width (it follows the breakpoint) and lay out before paint.
  React.useLayoutEffect(() => {
    const sizer = sizerRef.current
    if (!sizer) return
    posRef.current = 0
    targetRef.current = null
    const measure = () => {
      widthRef.current = sizer.offsetWidth
      layout()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sizer)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [layout])

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      reducedMotionRef.current = query.matches
    }
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  // Horizontal wheel / trackpad swipes. Native listener: React's onWheel is
  // passive, and the browser's back-swipe has to be prevented.
  React.useEffect(() => {
    const track = trackRef.current
    if (!track || !loop) return
    let settleTimer = 0
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      cancelAnimationFrame(frameRef.current)
      targetRef.current = null
      posRef.current += event.deltaX / (widthRef.current * SPACING || 1)
      layout()
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => animateTo(Math.round(posRef.current)), WHEEL_SETTLE_MS)
    }
    track.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      track.removeEventListener("wheel", onWheel)
      window.clearTimeout(settleTimer)
    }
  }, [loop, layout, animateTo])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!loop || event.button !== 0) return
    cancelAnimationFrame(frameRef.current)
    targetRef.current = null
    draggedRef.current = false
    dragRef.current = {
      startX: event.clientX,
      startPos: posRef.current,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const spacing = widthRef.current * SPACING || 1
    if (!draggedRef.current && Math.abs(event.clientX - drag.startX) > DRAG_THRESHOLD_PX) {
      draggedRef.current = true
      // Captured only once it's a real drag, so a plain click still reaches the card link.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (!draggedRef.current) return
    const dt = Math.max(1, event.timeStamp - drag.lastT) / 1000
    const instant = -(event.clientX - drag.lastX) / spacing / dt
    drag.velocity = drag.velocity * 0.7 + instant * 0.3
    drag.lastX = event.clientX
    drag.lastT = event.timeStamp
    posRef.current = drag.startPos - (event.clientX - drag.startX) / spacing
    layout()
  }

  function handlePointerUp() {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || !draggedRef.current) return
    const velocity = Math.max(-8, Math.min(8, drag.velocity))
    animateTo(Math.round(posRef.current + velocity * FLING_SECONDS))
  }

  function handleCardClick(event: React.MouseEvent, index: number) {
    if (draggedRef.current) {
      event.preventDefault()
      draggedRef.current = false
      return
    }
    // Side cards come to the centre first; only the centred one opens.
    if (loop && index !== active) {
      event.preventDefault()
      animateTo(Math.round(posRef.current) + loopDelta(index, Math.round(posRef.current), n))
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!loop) return
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      step(-1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      step(1)
    }
  }

  return (
    <div
      ref={trackRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={loop ? "精选应用，用左右方向键切换" : "精选应用"}
      tabIndex={loop ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full touch-pan-y pb-12 outline-none select-none perspective-distant focus-visible:ring-3 focus-visible:ring-ring/50 ${
        loop ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {/* In-flow stand-in that gives the track its height; the cards are absolute. */}
      <div ref={sizerRef} aria-hidden className={`invisible mx-auto aspect-3/4 ${CARD_SIZE}`} />
      {apps.map((app, i) => (
        <Link
          key={String(app.id)}
          ref={(el) => {
            cardRefs.current[i] = el
          }}
          href={`/apps/${app.id}`}
          draggable={false}
          tabIndex={!loop || i === active ? 0 : -1}
          aria-label={`${app.appName || "未命名应用"}，${formatCodeGenType(app.codeGenType)}，第 ${i + 1} 个，共 ${n} 个`}
          onClick={(event) => handleCardClick(event, i)}
          className={`absolute top-0 left-1/2 block aspect-3/4 origin-bottom overflow-hidden rounded-2xl bg-card shadow-2xl outline-none will-change-transform focus-visible:ring-3 focus-visible:ring-ring/50 ${CARD_SIZE}`}
        >
          <AppThumbnail app={app} />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/80 to-transparent px-4 pt-16 pb-4">
            <p className="text-xs text-muted-foreground">{formatCodeGenType(app.codeGenType)}</p>
            <p className="truncate text-sm font-medium text-foreground">{app.appName || "未命名应用"}</p>
          </div>
          <div
            ref={(el) => {
              dimRefs.current[i] = el
            }}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-background opacity-0"
          />
        </Link>
      ))}
    </div>
  )
}
