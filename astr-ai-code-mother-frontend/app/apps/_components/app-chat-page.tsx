"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2, Rocket } from "lucide-react"

import { useDeployApp, useGetAppVOById } from "@/lib/api/generated"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { streamChatToGenCode } from "@/lib/api/chat-stream"
import { asApiId } from "@/lib/app-id"
import { consumeAppInitPrompt } from "@/lib/app-init-prompt"
import { useCurrentUser } from "@/lib/auth"
import { ChatPanel, type ChatMessage } from "@/app/apps/_components/chat-panel"
import { PreviewPanel } from "@/app/apps/_components/preview-panel"

let messageIdCounter = 0
function nextMessageId(): string {
  messageIdCounter += 1
  return `m${messageIdCounter}-${Date.now()}`
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

  // Auto-send the initial prompt handed off by the create form, exactly once
  // per app id. consumeAppInitPrompt removes the sessionStorage entry as it
  // reads it, so a Strict Mode double-effect (or a later refresh) finds
  // nothing the second time and skips — no separate "have I sent" flag needed
  // beyond autoSentRef, which only guards against firing twice in one mount.
  React.useEffect(() => {
    if (autoSentRef.current) return
    const initPrompt = consumeAppInitPrompt(appId)
    if (!initPrompt) return
    autoSentRef.current = true
    // Deferred a tick so the state updates sendMessage kicks off don't happen
    // synchronously inside the effect body itself (react-hooks/set-state-in-effect).
    queueMicrotask(() => sendMessage(initPrompt))
  }, [appId, sendMessage])

  React.useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const isOwner =
    !!app?.user?.id && !!currentUser?.id && String(app.user.id) === String(currentUser.id)

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
          <ChatPanel
            messages={messages}
            streaming={streaming}
            streamError={streamError}
            disabled={!appQuery.isLoading && !isOwner}
            onSend={sendMessage}
          />
        </div>
        <div className="flex min-h-[60vh] flex-col lg:min-h-0">
          <PreviewPanel
            appId={appId}
            codeGenType={app?.codeGenType}
            streaming={streaming}
            generationVersion={generationVersion}
            onAvailabilityChange={setPreviewAvailable}
          />
        </div>
      </div>
    </div>
  )
}
