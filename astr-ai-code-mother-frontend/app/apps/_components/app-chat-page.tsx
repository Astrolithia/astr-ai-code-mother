"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2, Rocket } from "lucide-react"

import { useDeployApp, useGetAppVOById, listAppChatHistoryByPage } from "@/lib/api/generated"
import type { ChatHistory } from "@/lib/api/generated/model"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, BUSINESS_ERROR_CODE, getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { streamChatToGenCode } from "@/lib/api/chat-stream"
import { asApiId } from "@/lib/app-id"
import { CODE_GEN_TYPE, formatCodeGenType, needsBuild } from "@/lib/app-code-gen"
import { getAppPreviewUrl } from "@/lib/app-preview-url"
import { useCurrentUser } from "@/lib/auth"
import {
  buildVisualEditMessage,
  describeSelectedElement,
  parseVisualEditMessage,
  VisualEditMessageError,
} from "@/lib/visual-edit"
import { useVisualEditor } from "@/hooks/use-visual-editor"
import { ChatPanel, type ChatMessage } from "@/app/apps/_components/chat-panel"
import { PreviewPanel, type CodeFile } from "@/app/apps/_components/preview-panel"

const HISTORY_PAGE_SIZE = 10

let messageIdCounter = 0
function nextMessageId(): string {
  messageIdCounter += 1
  return `m${messageIdCounter}-${Date.now()}`
}

function toChatMessage(chatHistory: ChatHistory): ChatMessage {
  const role = chatHistory.messageType === "ai" ? "assistant" : "user"
  const content = chatHistory.message ?? ""
  // History stores the full visual-edit prompt; show only the user's words.
  const visualEdit = role === "user" ? parseVisualEditMessage(content) : null
  return {
    id: String(chatHistory.id),
    role,
    content: visualEdit?.text ?? content,
    target: visualEdit?.target ?? undefined,
  }
}

// Mirrors HtmlCodeParser / MultiFileCodeParser. `$` lets a block that is
// still streaming (no closing fence yet) show up as it grows.
const TEXT_CODE_FENCE = /```(html|css|js|javascript)\s*\n([\s\S]*?)(?:```|$)/gi
const TEXT_CODE_FILE_NAME: Record<string, string> = {
  html: "index.html",
  css: "style.css",
  js: "script.js",
}
// One match per file the Vue agent wrote (JsonMessageStreamHandler's TOOL_EXECUTED output).
const VUE_FILE_WRITE = /\[工具调用\] 写入文件 (\S+)\n```(\w*)\n([\s\S]*?)(?:\n```|$)/g

function extractCodeFiles(content: string, codeGenType?: string): CodeFile[] {
  const files = new Map<string, CodeFile>()
  if (codeGenType === CODE_GEN_TYPE.VUE_PROJECT) {
    // A file rewritten later in the same round keeps its tab position but shows the latest content.
    for (const [, path, language, code] of content.matchAll(VUE_FILE_WRITE)) {
      files.set(path, { path, language, code: code.trimEnd() })
    }
    return [...files.values()]
  }
  for (const [, rawLanguage, code] of content.matchAll(TEXT_CODE_FENCE)) {
    const language = rawLanguage.toLowerCase() === "javascript" ? "js" : rawLanguage.toLowerCase()
    if (codeGenType === CODE_GEN_TYPE.HTML && language !== "html") continue
    const path = TEXT_CODE_FILE_NAME[language]
    // The backend saves the first block of each language, so the tabs do too.
    if (!files.has(path)) files.set(path, { path, language, code: code.trimEnd() })
  }
  return [...files.values()]
}

export function AppChatPage({ appId }: { appId: string }) {
  const { user: currentUser } = useCurrentUser()
  const appQuery = useGetAppVOById({ id: asApiId(appId) })
  const app = appQuery.data?.data

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [streaming, setStreaming] = React.useState(false)
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [generationVersion, setGenerationVersion] = React.useState(0)
  // True once this round's files are saved, even if the AI is still streaming.
  const [filesReady, setFilesReady] = React.useState(false)
  const [previewAvailable, setPreviewAvailable] = React.useState(false)
  const [deployUrl, setDeployUrl] = React.useState<string | null>(null)

  // Cursor-paginated chat history, loaded oldest-first for display. The
  // cursor endpoint itself returns newest-first pages (see
  // ChatHistoryServiceImpl#listAppChatHistoryByPage), so each page is
  // reversed before being merged in here.
  const [historyMessages, setHistoryMessages] = React.useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = React.useState(false)
  const [historyTotal, setHistoryTotal] = React.useState(0)
  const [historyCursor, setHistoryCursor] = React.useState<string | undefined>(undefined)
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false)
  const [loadingMoreHistory, setLoadingMoreHistory] = React.useState(false)
  const [historyError, setHistoryError] = React.useState<string | null>(null)
  const [historyPrependVersion, setHistoryPrependVersion] = React.useState(0)

  const abortRef = React.useRef<AbortController | null>(null)
  const autoSentRef = React.useRef(false)
  const deployMutation = useDeployApp()

  // `text` is what the chat shows; `prompt` is what the backend receives
  // (the same, unless visual-edit context was attached).
  const sendMessage = React.useCallback(
    (text: string, prompt: string = text, target?: string) => {
      setStreamError(null)
      const userMessage: ChatMessage = { id: nextMessageId(), role: "user", content: text, target }
      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: "",
        pending: true,
      }
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setStreaming(true)
      setFilesReady(false)
      let previewRefreshed = false

      const controller = new AbortController()
      abortRef.current = controller

      streamChatToGenCode(
        appId,
        prompt,
        {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...m, content: m.content + chunk } : m)),
            )
          },
          onFilesReady: () => {
            previewRefreshed = true
            setFilesReady(true)
            setGenerationVersion((v) => v + 1)
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...m, pending: false } : m)),
            )
            setStreaming(false)
            // Already showing this round's files; reloading would only flicker.
            if (!previewRefreshed) setGenerationVersion((v) => v + 1)
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...m, pending: false } : m)),
            )
            setStreaming(false)
            setStreamError(message)
          },
        },
        controller.signal,
      )
    },
    [appId],
  )

  // Load the latest page of persisted chat history for this app, once per
  // app id. Resets all history state first so navigating between apps (id
  // changes without a full remount) doesn't leak the previous app's messages.
  React.useEffect(() => {
    let cancelled = false
    // Deferred a tick so these setState calls don't happen synchronously
    // inside the effect body itself (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      if (cancelled) return
      setHistoryLoaded(false)
      setHistoryMessages([])
      setHistoryTotal(0)
      setHistoryCursor(undefined)
      setHasMoreHistory(false)
      setHistoryError(null)
      setHistoryPrependVersion(0)
      autoSentRef.current = false
    })

    void (async () => {
      try {
        const response = await listAppChatHistoryByPage(asApiId(appId), { pageSize: HISTORY_PAGE_SIZE })
        if (cancelled) return
        const page = response.data
        const records = page?.records ?? []
        const ascending = [...records].reverse().map(toChatMessage)
        const total = page?.totalRow ?? records.length
        setHistoryMessages(ascending)
        setHistoryTotal(total)
        setHasMoreHistory(total > records.length)
        setHistoryCursor(records.length > 0 ? records[records.length - 1]?.createTime : undefined)
      } catch (error) {
        if (cancelled) return
        // A non-owner/non-admin visitor browsing someone else's app is
        // expected to be denied history (see ChatHistoryController) — that's
        // not a failure worth surfacing, the chat panel already explains
        // they can't participate. Anything else (network, 500s) gets shown.
        const isAuthError =
          error instanceof ApiError &&
          (error.body as { code?: number } | undefined)?.code === BUSINESS_ERROR_CODE.NO_AUTH
        if (!isAuthError) {
          setHistoryError(getErrorMessage(error, "对话历史加载失败"))
        }
      } finally {
        if (!cancelled) setHistoryLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [appId])

  const loadMoreHistory = React.useCallback(async () => {
    if (!hasMoreHistory || loadingMoreHistory || historyCursor === undefined) return
    setLoadingMoreHistory(true)
    setHistoryError(null)
    try {
      const response = await listAppChatHistoryByPage(asApiId(appId), {
        pageSize: HISTORY_PAGE_SIZE,
        lastCreateTime: historyCursor,
      })
      const page = response.data
      const records = page?.records ?? []
      const ascending = [...records].reverse().map(toChatMessage)
      const remainingBeforeCursor = page?.totalRow ?? 0
      setHistoryMessages((prev) => [...ascending, ...prev])
      setHasMoreHistory(remainingBeforeCursor > records.length)
      if (records.length > 0) {
        setHistoryCursor(records[records.length - 1]?.createTime)
      }
      setHistoryPrependVersion((v) => v + 1)
    } catch (error) {
      setHistoryError(getErrorMessage(error, "加载更多历史消息失败"))
    } finally {
      setLoadingMoreHistory(false)
    }
  }, [appId, hasMoreHistory, loadingMoreHistory, historyCursor])

  const isOwner =
    !!app?.user?.id && !!currentUser?.id && String(app.user.id) === String(currentUser.id)

  // Auto-send the app's own initPrompt as the first message, but only once
  // we know for certain — from persisted history, not a create-flow handoff
  // — that this owner has never had a conversation on this app yet.
  React.useEffect(() => {
    if (autoSentRef.current) return
    if (!historyLoaded || appQuery.isLoading) return
    if (!isOwner || historyTotal > 0) return
    const initPrompt = app?.initPrompt?.trim()
    if (!initPrompt) return
    autoSentRef.current = true
    // Deferred a tick so the state updates sendMessage kicks off don't happen
    // synchronously inside the effect body itself (react-hooks/set-state-in-effect).
    queueMicrotask(() => sendMessage(initPrompt))
  }, [historyLoaded, appQuery.isLoading, isOwner, historyTotal, app?.initPrompt, sendMessage])

  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const previewUrl = app?.codeGenType ? getAppPreviewUrl(app.codeGenType, appId) : null
  const visualEditor = useVisualEditor({
    previewUrl,
    previewVersion: generationVersion,
    canEdit: isOwner && previewAvailable && !streaming,
  })
  const visualEditUnavailableReason = !isOwner
    ? "只有应用所有者可以使用可视化编辑"
    : streaming
      ? "生成中，完成后可使用可视化编辑"
      : !previewAvailable
        ? "预览可用后才能使用可视化编辑"
        : null

  function handleSend(text: string): boolean {
    const selected = visualEditor.selected
    let prompt = text
    if (selected) {
      try {
        prompt = buildVisualEditMessage(appId, text, selected)
      } catch (error) {
        // Keep draft, selection and edit mode so the user can shorten and retry.
        setStreamError(error instanceof VisualEditMessageError ? error.message : "附带选中元素失败，请重试")
        return false
      }
    }
    visualEditor.exit()
    sendMessage(text, prompt, selected ? describeSelectedElement(selected) : undefined)
    return true
  }

  const displayedMessages = React.useMemo(
    () => [...historyMessages, ...messages],
    [historyMessages, messages],
  )

  // Files from the latest reply that produced code — a reply without code
  // (plain Q&A, or a new round that hasn't reached its code yet) keeps the
  // previous files on screen.
  const codeFiles = React.useMemo(() => {
    for (let i = displayedMessages.length - 1; i >= 0; i--) {
      const message = displayedMessages[i]
      if (message.role !== "assistant") continue
      const files = extractCodeFiles(message.content, app?.codeGenType)
      if (files.length > 0) return files
    }
    return []
  }, [displayedMessages, app?.codeGenType])

  async function handleDeploy() {
    if (!previewAvailable || streaming || deployMutation.isPending) return
    try {
      const response = await deployMutation.mutateAsync({ data: { appId: asApiId(appId) } })
      if (response.data) setDeployUrl(response.data)
    } catch {
      // surfaced via deployMutation.isError below
    }
  }

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="返回我的应用"
            nativeButton={false}
            render={<Link href="/apps" />}
          >
            <ArrowLeft />
          </Button>
          {appQuery.isLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : appQuery.isError ? (
            <span role="alert" className="text-sm text-destructive">
              {getErrorMessage(appQuery.error, "应用加载失败")}
            </span>
          ) : (
            <>
              <h1 className="truncate text-lg font-medium">{app?.appName || "未命名应用"}</h1>
              {app?.codeGenType && (
                <span className="shrink-0 text-sm text-muted-foreground">
                  {formatCodeGenType(app.codeGenType)}
                </span>
              )}
            </>
          )}
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {deployMutation.isError && (
              <span role="alert" className="text-sm text-destructive">
                {getErrorMessage(deployMutation.error, "部署失败")}
              </span>
            )}
            {deployUrl && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<a href={deployUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink />
                打开网站
              </Button>
            )}
            <Button
              size="sm"
              disabled={!previewAvailable || streaming || deployMutation.isPending}
              onClick={handleDeploy}
              title={!previewAvailable ? "请先完成一次生成再部署" : undefined}
            >
              {deployMutation.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
              {deployMutation.isPending ? (needsBuild(app?.codeGenType) ? "构建部署中" : "部署中") : "部署"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-2">
        <div className="flex min-h-[60vh] flex-col border-b border-border lg:min-h-0 lg:border-r lg:border-b-0">
          {historyError && (
            <p role="alert" className="border-b border-border px-4 py-2 text-sm text-destructive">
              {historyError}
            </p>
          )}
          <ChatPanel
            messages={displayedMessages}
            streaming={streaming}
            streamError={streamError}
            disabled={!appQuery.isLoading && !isOwner}
            onSend={handleSend}
            hasMoreHistory={hasMoreHistory}
            loadingMoreHistory={loadingMoreHistory}
            onLoadMoreHistory={loadMoreHistory}
            historyPrependVersion={historyPrependVersion}
            visualEdit={{
              status: visualEditor.status,
              unavailableReason: visualEditUnavailableReason,
              selected: visualEditor.selected,
              error: visualEditor.error,
              onToggle: visualEditor.toggle,
              onClearSelection: visualEditor.clearSelection,
            }}
          />
        </div>
        <div className="flex min-h-[60vh] flex-col lg:min-h-0">
          <PreviewPanel
            appId={appId}
            codeGenType={app?.codeGenType}
            // Files saved mid-stream are previewable right away.
            streaming={streaming && !filesReady}
            generationVersion={generationVersion}
            hasPriorGeneration={historyTotal >= 2}
            onAvailabilityChange={setPreviewAvailable}
            visualEditStatus={visualEditor.status}
            visualEditFrame={visualEditor.frame}
            visualEditFrameRef={visualEditor.iframeRef}
            onVisualEditPointerLeave={visualEditor.clearHover}
            codeFiles={codeFiles}
          />
        </div>
      </div>
    </div>
  )
}
