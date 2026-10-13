"use client"

import * as React from "react"

import {
  createClearHoverMessage,
  createClearSelectionMessage,
  createSelectionDocument,
  isVisualEditReadyMessage,
  isVisualEditUnloadMessage,
  parseVisualEditSelection,
  VISUAL_EDIT_FRAME_ORIGIN,
  type SelectedElement,
} from "@/lib/visual-edit"

export type VisualEditorStatus = "off" | "loading" | "ready" | "error"

// Covers fetching the preview HTML and the injected script's handshake.
const INIT_TIMEOUT_MS = 15_000

interface EditSession {
  id: string
  /** Preview the session was opened against; a new one ends the session. */
  scope: string
  status: Exclude<VisualEditorStatus, "off">
  srcDoc: string | null
  error: string | null
  selected: SelectedElement | null
}

export interface VisualEditFrame {
  session: string
  srcDoc: string
}

function createSessionId(): string {
  // randomUUID needs a secure context; plain-http LAN hosts don't have one.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

/**
 * Edit-mode state plus the iframe handshake (see lib/visual-edit.ts). Each
 * time edit mode is entered a fresh session id is minted; messages carrying
 * any other id, or coming from anything but the current edit iframe, are
 * ignored. The session ends — and its port is closed — on exit, when the
 * preview changes (new generation / other app), or when editing stops being
 * allowed (not owner, generating, preview unavailable).
 */
export function useVisualEditor({
  previewUrl,
  previewVersion,
  canEdit,
}: {
  previewUrl: string | null
  previewVersion: number
  canEdit: boolean
}) {
  const scope = `${previewUrl}#${previewVersion}`
  const [session, setSession] = React.useState<EditSession | null>(null)
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const portRef = React.useRef<MessagePort | null>(null)

  // Dropped during render rather than in an effect so a stale session is
  // never rendered against a newer preview; the effects below release its
  // fetch, timer, listener and port when its id goes away.
  if (session && (!canEdit || !previewUrl || session.scope !== scope)) {
    setSession(null)
  }

  const sessionId = session?.id
  const status = session?.status
  const hasDocument = session?.srcDoc != null

  const failSession = React.useCallback((id: string, error: string) => {
    setSession((s) => (s?.id === id && s.status !== "ready" ? { ...s, status: "error", error } : s))
  }, [])

  React.useEffect(() => {
    if (!sessionId || status !== "loading") return
    const timer = window.setTimeout(
      () => failSession(sessionId, "可视化编辑初始化超时或预览发生了跳转，请检查预览能否正常打开后重试"),
      INIT_TIMEOUT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [sessionId, status, failSession])

  // Fetch the preview and build the instrumented copy.
  React.useEffect(() => {
    if (!sessionId || status !== "loading" || hasDocument || !previewUrl) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch(previewUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`预览加载失败（状态码 ${response.status}）`)
        const srcDoc = createSelectionDocument(await response.text(), previewUrl, sessionId)
        setSession((s) => (s?.id === sessionId ? { ...s, srcDoc } : s))
      } catch (error) {
        if (controller.signal.aborted) return
        failSession(
          sessionId,
          `可视化编辑初始化失败：${error instanceof Error ? error.message : "无法加载预览"}`,
        )
      }
    })()
    return () => controller.abort()
  }, [sessionId, status, hasDocument, previewUrl, failSession])

  // Handshake: accept the port only from the current edit iframe, from the
  // sandbox's opaque origin, carrying this session's id.
  React.useEffect(() => {
    if (!sessionId || !hasDocument) return
    let port: MessagePort | null = null

    function handleWindowMessage(event: MessageEvent) {
      const frameWindow = iframeRef.current?.contentWindow
      if (!frameWindow || event.source !== frameWindow) return
      if (event.origin !== VISUAL_EDIT_FRAME_ORIGIN) return
      if (!sessionId || !isVisualEditReadyMessage(event.data, sessionId) || event.ports.length !== 1) return

      // A repeated handshake means the copy reloaded itself: drop the old
      // port and the selection it no longer highlights.
      port?.close()
      const nextPort = event.ports[0]
      port = nextPort
      portRef.current = nextPort
      nextPort.onmessage = (portEvent: MessageEvent) => {
        // Back to "loading": a reload re-handshakes, while a navigation away
        // from the copy never does and runs into the init timeout.
        if (isVisualEditUnloadMessage(portEvent.data, sessionId)) {
          setSession((s) => (s?.id === sessionId ? { ...s, status: "loading", selected: null } : s))
          return
        }
        const element = parseVisualEditSelection(portEvent.data, sessionId)
        if (!element) return
        setSession((s) => (s?.id === sessionId ? { ...s, selected: element } : s))
      }
      setSession((s) =>
        s?.id === sessionId ? { ...s, status: "ready", error: null, selected: null } : s,
      )
    }

    window.addEventListener("message", handleWindowMessage)
    return () => {
      window.removeEventListener("message", handleWindowMessage)
      if (port) {
        port.onmessage = null
        port.close()
        if (portRef.current === port) portRef.current = null
      }
    }
  }, [sessionId, hasDocument])

  const start = React.useCallback(() => {
    if (!canEdit || !previewUrl) return
    setSession({
      id: createSessionId(),
      scope,
      status: "loading",
      srcDoc: null,
      error: null,
      selected: null,
    })
  }, [canEdit, previewUrl, scope])

  const exit = React.useCallback(() => setSession(null), [])

  /** Off/error → (re)start; loading/ready → exit. */
  const toggle = React.useCallback(() => {
    if (session && session.status !== "error") exit()
    else start()
  }, [session, start, exit])

  const clearSelection = React.useCallback(() => {
    if (!sessionId) return
    setSession((s) => (s?.id === sessionId ? { ...s, selected: null } : s))
    try {
      portRef.current?.postMessage(createClearSelectionMessage(sessionId))
    } catch {
      // port already closed — the iframe is going away anyway
    }
  }, [sessionId])

  const clearHover = React.useCallback(() => {
    if (!sessionId) return
    try {
      portRef.current?.postMessage(createClearHoverMessage(sessionId))
    } catch {
      // port already closed — the iframe is going away anyway
    }
  }, [sessionId])

  const frame: VisualEditFrame | null =
    session && session.srcDoc !== null && session.status !== "error"
      ? { session: session.id, srcDoc: session.srcDoc }
      : null

  return {
    status: (session?.status ?? "off") as VisualEditorStatus,
    selected: session?.selected ?? null,
    error: session?.error ?? null,
    frame,
    /** Must be attached to the iframe rendering `frame`. */
    iframeRef,
    toggle,
    exit,
    clearSelection,
    /** Wire to the edit iframe's pointerleave. */
    clearHover,
  }
}
