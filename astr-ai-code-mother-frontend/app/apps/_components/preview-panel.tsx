"use client"

import * as React from "react"
import { Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { needsBuild } from "@/lib/app-code-gen"
import { getAppPreviewUrl } from "@/lib/app-preview-url"

type PreviewState = "checking" | "building" | "available" | "unavailable" | "check-error" | "build-failed"

// VueProjectBuilder allows 5 min for npm install + 3 min for npm run build.
const BUILD_TIMEOUT_MS = 9 * 60 * 1000
const BUILD_POLL_INTERVAL_MS = 3000

function StatusOverlay({
  icon: Icon,
  message,
  action,
  spin,
}: {
  icon: React.ElementType
  message: string
  action?: React.ReactNode
  spin?: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <Icon className={`text-muted-foreground ${spin ? "animate-spin" : ""}`} size={20} />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

export function PreviewPanel({
  appId,
  codeGenType,
  streaming,
  generationVersion,
  hasPriorGeneration,
  onAvailabilityChange,
}: {
  appId: string
  codeGenType?: string
  streaming: boolean
  generationVersion: number
  /** True once the app's chat history shows a completed generation round
   *  from a previous visit (>= 2 messages), so the very first availability
   *  check on page load is worth making even before this session streams
   *  anything. Ignored after generationVersion advances past 0. */
  hasPriorGeneration: boolean
  onAvailabilityChange: (available: boolean) => void
}) {
  const [state, setState] = React.useState<PreviewState>("checking")
  const previewUrl = codeGenType ? getAppPreviewUrl(codeGenType, appId) : null
  const buildRequired = needsBuild(codeGenType)
  // dist/index.html as it was before the current round started streaming
  // (null = no build yet). Vite fingerprints asset names into index.html, so
  // a changed body means the backend's async rebuild has finished — without
  // this, a regeneration would immediately "find" the previous build.
  const baselineRef = React.useRef<string | null>(null)

  const fetchPreview = React.useCallback(async () => {
    if (!previewUrl) return null
    const response = await fetch(previewUrl, { method: "GET", credentials: "include", cache: "no-store" })
    return response.ok ? await response.text() : null
  }, [previewUrl])

  const checkAvailability = React.useCallback(async () => {
    if (!previewUrl) return
    setState("checking")
    try {
      setState((await fetchPreview()) !== null ? "available" : "unavailable")
    } catch {
      setState("check-error")
    }
  }, [previewUrl, fetchPreview])

  React.useEffect(() => {
    if (!previewUrl) return
    if (streaming) {
      if (buildRequired) {
        baselineRef.current = null
        fetchPreview()
          .then((body) => { baselineRef.current = body })
          .catch(() => {})
      }
      return
    }
    // On the very first check (generationVersion still 0, nothing streamed
    // yet this session), only bother pinging the preview URL when history
    // says a previous visit already produced a site — otherwise a brand-new
    // app would show a pointless "checking…" flash before settling on
    // "nothing generated yet", which we already know without asking.
    // Deferred a tick so these setState calls don't happen synchronously
    // inside the effect body itself (react-hooks/set-state-in-effect).
    if (generationVersion === 0 && !hasPriorGeneration) {
      queueMicrotask(() => setState("unavailable"))
      return
    }
    if (buildRequired && generationVersion > 0) {
      // A round just finished: poll until the rebuilt dist shows up.
      let cancelled = false
      const deadline = Date.now() + BUILD_TIMEOUT_MS
      const baseline = baselineRef.current
      const poll = async () => {
        if (cancelled) return
        let body: string | null = null
        try {
          body = await fetchPreview()
        } catch {
          // transient network error — keep polling until the deadline
        }
        if (cancelled) return
        if (body !== null && body !== baseline) {
          setState("available")
        } else if (Date.now() >= deadline) {
          // Unchanged output (e.g. the round didn't touch any source) still
          // counts as a usable build; nothing at all means the build failed.
          setState(body !== null ? "available" : "build-failed")
        } else {
          window.setTimeout(() => void poll(), BUILD_POLL_INTERVAL_MS)
        }
      }
      queueMicrotask(() => {
        if (cancelled) return
        setState("building")
        void poll()
      })
      return () => {
        cancelled = true
      }
    }
    // generationVersion bump ⇒ a generation just finished ⇒ re-check + re-fetch,
    // which also busts any cached copy of the previous iframe contents.
    queueMicrotask(() => void checkAvailability())
  }, [previewUrl, streaming, generationVersion, hasPriorGeneration, buildRequired, fetchPreview, checkAvailability])

  React.useEffect(() => {
    onAvailabilityChange(!streaming && state === "available")
  }, [streaming, state, onAvailabilityChange])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {streaming ? (
        <StatusOverlay icon={Loader2} spin message="正在生成网站，完成后自动显示预览" />
      ) : !previewUrl ? (
        <StatusOverlay icon={Loader2} spin message="加载应用信息中…" />
      ) : state === "checking" ? (
        <StatusOverlay icon={Loader2} spin message="正在检查预览是否可用…" />
      ) : state === "building" ? (
        <StatusOverlay icon={Loader2} spin message="正在构建 Vue 项目，首次构建需安装依赖，可能需要几分钟…" />
      ) : state === "build-failed" ? (
        <StatusOverlay
          icon={TriangleAlert}
          message="Vue 项目构建失败或超时，可重新检查或再次发送需求"
          action={
            <Button variant="outline" size="sm" onClick={() => void checkAvailability()}>
              <RefreshCw />
              重新检查
            </Button>
          }
        />
      ) : state === "check-error" ? (
        <StatusOverlay
          icon={TriangleAlert}
          message="预览加载失败，请检查网络后重试"
          action={
            <Button variant="outline" size="sm" onClick={() => void checkAvailability()}>
              <RefreshCw />
              重试
            </Button>
          }
        />
      ) : state === "unavailable" ? (
        <StatusOverlay icon={Sparkles} message="还没有生成内容，发送需求开始生成" />
      ) : (
        <iframe
          key={generationVersion}
          src={`${previewUrl}?v=${generationVersion}`}
          title="应用预览"
          className="min-h-0 w-full flex-1 border-0"
        />
      )}
    </div>
  )
}
