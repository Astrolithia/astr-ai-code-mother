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
import { useCurrentUser } from "@/lib/auth"
import { ChatPanel, type ChatMessage } from "@/app/apps/_components/chat-panel"
import { PreviewPanel } from "@/app/apps/_components/preview-panel"

const HISTORY_PAGE_SIZE = 10

let messageIdCounter = 0
function nextMessageId(): string {
  messageIdCounter += 1
  return `m${messageIdCounter}-${Date.now()}`
}

function toChatMessage(chatHistory: ChatHistory): ChatMessage {
  return {
    id: String(chatHistory.id),
    role: chatHistory.messageType === "ai" ? "assistant" : "user",
    content: chatHistory.message ?? "",
  }
}

export function AppChatPage({ appId }: { appId: string }) {
  const { user: currentUser } = useCurrentUser()
  const appQuery = useGetAppVOById({ id: asApiId(appId) })
  const app = appQuery.data?.data

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [streaming, setStreaming] = React.useState(false)
  const [streamError, setStreamError] = React.useState<string | null>(null)
  const [generationVersion, setGenerationVersion] = React.useState(0)
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

  const sendMessage = React.useCallback(
    (text: string) => {
      setStreamError(null)
      const userMessage: ChatMessage = { id: nextMessageId(), role: "user", content: text }
      const assistantMessage: ChatMessage = {
        id: nextMessageId(),
        role: "assistant",
        content: "",
        pending: true,
      }
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      streamChatToGenCode(
        appId,
        text,
        {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...m, content: m.content + chunk } : m)),
            )
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...m, pending: false } : m)),
            )
            setStreaming(false)
            setGenerationVersion((v) => v + 1)
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

  const displayedMessages = React.useMemo(
    () => [...historyMessages, ...messages],
    [historyMessages, messages],
  )

  async function handleDeploy() {
    if (!previewAvailable || deployMutation.isPending) return
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
            <h1 className="truncate text-lg font-medium">{app?.appName || "未命名应用"}</h1>
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
              disabled={!previewAvailable || deployMutation.isPending}
              onClick={handleDeploy}
              title={!previewAvailable ? "请先完成一次生成再部署" : undefined}
            >
              {deployMutation.isPending ? <Loader2 className="animate-spin" /> : <Rocket />}
              {deployMutation.isPending ? "部署中" : "部署"}
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
            onSend={sendMessage}
            hasMoreHistory={hasMoreHistory}
            loadingMoreHistory={loadingMoreHistory}
            onLoadMoreHistory={loadMoreHistory}
            historyPrependVersion={historyPrependVersion}
          />
        </div>
        <div className="flex min-h-[60vh] flex-col lg:min-h-0">
          <PreviewPanel
            appId={appId}
            codeGenType={app?.codeGenType}
            streaming={streaming}
            generationVersion={generationVersion}
            hasPriorGeneration={historyTotal >= 2}
            onAvailabilityChange={setPreviewAvailable}
          />
        </div>
      </div>
    </div>
  )
}
