"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Sparkles } from "lucide-react"

import type { AppVO } from "@/lib/api/generated/model"
import { getAppPreviewUrl } from "@/lib/app-preview-url"

// The generated site is laid out at a desktop width, then scaled down to the card.
const SITE_WIDTH = 1280
const SITE_HEIGHT = (SITE_WIDTH * 4) / 3

/**
 * Card artwork for a featured app: its cover when one is set, otherwise the
 * generated site itself, shrunk into the card. The live site runs in a
 * sandbox without same-origin, so it can't reach the backend's cookies.
 */
export function AppThumbnail({ app }: { app: AppVO }) {
  const previewUrl = app.codeGenType && app.id != null ? getAppPreviewUrl(app.codeGenType, String(app.id)) : null
  // Vue apps only have a preview once built; don't frame a 404 page.
  const previewQuery = useQuery({
    queryKey: ["app-thumbnail-preview", previewUrl],
    queryFn: async ({ signal }) => (await fetch(previewUrl as string, { signal, cache: "no-store" })).ok,
    enabled: !app.cover && previewUrl !== null,
    staleTime: 5 * 60 * 1000,
  })

  const boxRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0)
  React.useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / SITE_WIDTH))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  if (app.cover) {
    return (
      // Real, user-provided cover URL — not a placeholder image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={app.cover} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
    )
  }

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden bg-muted">
      {previewQuery.data && scale > 0 ? (
        <iframe
          src={previewUrl as string}
          title={`${app.appName || "应用"}预览`}
          sandbox="allow-scripts"
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          // White like a browser's default canvas; sites assume it.
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white"
          style={{ width: SITE_WIDTH, height: SITE_HEIGHT, transform: `scale(${scale})` }}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Sparkles className="text-muted-foreground" size={20} />
        </div>
      )}
    </div>
  )
}
