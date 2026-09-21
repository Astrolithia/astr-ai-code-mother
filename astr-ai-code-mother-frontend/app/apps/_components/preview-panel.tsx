"use client"

import * as React from "react"
import { Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAppPreviewUrl } from "@/lib/app-preview-url"

type PreviewState = "checking" | "available" | "unavailable" | "check-error"

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
  onAvailabilityChange,
}: {
  appId: string
  codeGenType?: string
  streaming: boolean
  generationVersion: number
  onAvailabilityChange: (available: boolean) => void
}) {
  const [state, setState] = React.useState<PreviewState>("checking")
  const previewUrl = codeGenType ? getAppPreviewUrl(codeGenType, appId) : null

  const checkAvailability = React.useCallback(async () => {
    if (!previewUrl) return
    setState("checking")
    try {
      const response = await fetch(previewUrl, { method: "GET", credentials: "include" })
      setState(response.ok ? "available" : "unavailable")
    } catch {
      setState("check-error")
    }
  }, [previewUrl])

  React.useEffect(() => {
    if (streaming || !previewUrl) return
    // generationVersion bump ⇒ a generation just finished ⇒ re-check + re-fetch,
    // which also busts any cached copy of the previous iframe contents.
    // Deferred a tick so checkAvailability's setState calls don't happen
    // synchronously inside the effect body itself (react-hooks/set-state-in-effect).
    queueMicrotask(() => void checkAvailability())
  }, [previewUrl, streaming, generationVersion, checkAvailability])

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
