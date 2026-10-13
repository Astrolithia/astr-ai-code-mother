"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, MousePointerClick, RefreshCw, Sparkles, TriangleAlert } from "lucide-react"

import { Orb } from "@/components/orb"
import { PreviewLoading } from "@/app/apps/_components/preview-loading"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { needsBuild } from "@/lib/app-code-gen"
import { getAppPreviewUrl } from "@/lib/app-preview-url"
import { VISUAL_EDIT_FRAME_SANDBOX } from "@/lib/visual-edit"
import type { VisualEditFrame, VisualEditorStatus } from "@/hooks/use-visual-editor"

type PreviewState = "checking" | "building" | "available" | "unavailable" | "check-error" | "build-failed"

// VueProjectBuilder allows 5 min for npm install + 3 min for npm run build.
const BUILD_TIMEOUT_MS = 9 * 60 * 1000
const BUILD_POLL_INTERVAL_MS = 3000

function StatusOverlay({
  icon: Icon,
  message,
  action,
}: {
  icon: React.ElementType
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <Icon className="text-muted-foreground" size={20} />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

/** Mount with a key for each preview URL/version or editing session, so a
 * previous iframe's load event cannot dismiss the next preview's loader. */
function LoadingPreviewFrame({
  frameRef,
  ...props
}: Pick<React.ComponentProps<"iframe">, "src" | "srcDoc" | "sandbox" | "title" | "onPointerLeave"> & {
  frameRef?: React.Ref<HTMLIFrameElement>
}) {
  const [loaded, setLoaded] = React.useState(false)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" aria-busy={!loaded}>
      {/* Keep the frame mounted while loading: hiding it with display:none
          would interfere with layout and the visual editor's measurements. */}
      <iframe
        {...props}
        ref={frameRef}
        onLoad={() => setLoaded(true)}
        aria-hidden={!loaded}
        tabIndex={loaded ? undefined : -1}
        className={`min-h-0 w-full flex-1 border-0 bg-white ${loaded ? "" : "invisible"}`}
      />
      {!loaded && (
        <PreviewLoading message="正在加载网页预览…" className="absolute inset-0" />
      )}
    </div>
  )
}

export interface CodeFile {
  /** index.html / style.css / script.js, or the Vue project's relative path. */
  path: string
  language: string
  code: string
}

function CodeFilesPanel({ files, streaming }: { files: CodeFile[]; streaming: boolean }) {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [collapsed, setCollapsed] = React.useState(false)
  // Until the user picks a tab, follow the file being written while
  // streaming, then settle on the first one (the entry HTML).
  const fallback = streaming ? files[files.length - 1] : files[0]
  const active = files.some((f) => f.path === selected) ? selected : fallback?.path

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        setSelected(String(value))
        setCollapsed(false)
      }}
      className="shrink-0 gap-0 border-b border-border"
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <TabsList className="min-w-0 flex-1 justify-start overflow-x-auto">
          {files.map((file) => (
            <TabsTrigger key={file.path} value={file.path} title={file.path} className="flex-none font-mono">
              {file.path.split("/").pop()}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "展开代码" : "收起代码"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>
      {!collapsed &&
        files.map((file) => (
          <TabsContent key={file.path} value={file.path} className="flex-none">
            <pre className="h-48 overflow-auto bg-muted px-4 py-3 lg:h-72">
              <code className="font-mono text-xs">{file.code}</code>
            </pre>
          </TabsContent>
        ))}
    </Tabs>
  )
}

export function PreviewPanel({
  appId,
  codeGenType,
  streaming,
  generationVersion,
  hasPriorGeneration,
  onAvailabilityChange,
  visualEditStatus = "off",
  visualEditFrame = null,
  visualEditFrameRef,
  onVisualEditPointerLeave,
  codeFiles = [],
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
  visualEditStatus?: VisualEditorStatus
  /** While set, the instrumented copy replaces the live preview. */
  visualEditFrame?: VisualEditFrame | null
  visualEditFrameRef?: React.Ref<HTMLIFrameElement>
  onVisualEditPointerLeave?: () => void
  /** Files from the latest reply that produced code, shown as tabs above the preview. */
  codeFiles?: CodeFile[]
}) {
  const [state, setState] = React.useState<PreviewState>("checking")
  const previewUrl = codeGenType ? getAppPreviewUrl(codeGenType, appId) : null
  const buildRequired = needsBuild(codeGenType)
  // Version of dist/index.html from before the current round started
  // streaming (null = no build yet). Vite rewrites dist on every build, so a
  // changed Last-Modified means the backend's async rebuild has finished —
  // even when the round left the output byte-identical. Without a baseline,
  // a regeneration would immediately "find" the previous build.
  const baselineRef = React.useRef<string | null>(null)

  // Resolves to the preview's version (Last-Modified, falling back to the
  // body), or null when there is nothing to preview yet.
  const fetchPreview = React.useCallback(async () => {
    if (!previewUrl) return null
    const response = await fetch(previewUrl, { method: "GET", credentials: "include", cache: "no-store" })
    if (!response.ok) return null
    return response.headers.get("Last-Modified") ?? (await response.text())
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
        let version: string | null = null
        try {
          version = await fetchPreview()
        } catch {
          // transient network error — keep polling until the deadline
        }
        if (cancelled) return
        if (version !== null && version !== baseline) {
          setState("available")
        } else if (Date.now() >= deadline) {
          // No rebuild landed (e.g. the build failed), but an earlier build
          // is still usable; nothing at all means there is no build.
          setState(version !== null ? "available" : "build-failed")
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
      {codeFiles.length > 0 && <CodeFilesPanel files={codeFiles} streaming={streaming} />}
      {streaming ? (
        <PreviewLoading message="正在生成网站，代码生成后自动显示预览" />
      ) : !previewUrl ? (
        <PreviewLoading message="加载应用信息中…" />
      ) : state === "checking" ? (
        <PreviewLoading message="正在检查预览是否可用…" />
      ) : state === "building" ? (
        <PreviewLoading message="正在构建 Vue 项目，首次构建需安装依赖，可能需要几分钟…" />
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
        <>
          {(visualEditStatus === "loading" || visualEditStatus === "ready") && (
            <p className="flex items-center gap-2 bg-muted px-4 py-2 text-sm text-muted-foreground">
              {visualEditStatus === "loading" ? (
                <Orb state="working" size={20} className="shrink-0 text-foreground" />
              ) : (
                <MousePointerClick className="shrink-0" size={16} />
              )}
              {visualEditStatus === "loading"
                ? "正在准备可视化编辑…"
                : "可视化编辑中，链接和表单暂不可用"}
            </p>
          )}
          {/* bg-white stands in for the browser's default canvas: an iframe is
              transparent, so sites without their own background would otherwise
              render on top of the dark theme. */}
          {visualEditFrame ? (
            <LoadingPreviewFrame
              key={`edit-${visualEditFrame.session}`}
              frameRef={visualEditFrameRef}
              srcDoc={visualEditFrame.srcDoc}
              sandbox={VISUAL_EDIT_FRAME_SANDBOX}
              onPointerLeave={onVisualEditPointerLeave}
              title="应用预览（可视化编辑）"
            />
          ) : (
            <LoadingPreviewFrame
              key={`${previewUrl}#${generationVersion}`}
              src={`${previewUrl}?v=${generationVersion}`}
              title="应用预览"
            />
          )}
        </>
      )}
    </div>
  )
}
