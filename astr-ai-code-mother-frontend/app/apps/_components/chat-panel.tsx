"use client"

import * as React from "react"
import { Loader2, SendHorizontal, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  pending?: boolean
}

const NEAR_BOTTOM_THRESHOLD_PX = 96

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-foreground text-background"
            : "border border-border bg-background text-foreground"
        }`}
      >
        {message.content}
        {message.pending && (
          <span className="ml-0.5 inline-flex items-center gap-1 align-middle text-muted-foreground">
            <Loader2 className="animate-spin" size={14} />
            {!message.content && "正在生成…"}
          </span>
        )}
      </div>
    </div>
  )
}

export function ChatPanel({
  messages,
  streaming,
  streamError,
  disabled,
  onSend,
}: {
  messages: ChatMessage[]
  streaming: boolean
  streamError: string | null
  disabled?: boolean
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const wasNearBottomRef = React.useRef(true)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    wasNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX
  }

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || !wasNearBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || streaming || disabled) return
    wasNearBottomRef.current = true
    onSend(trimmed)
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            描述你想要的功能或改动，AI 会开始生成
          </p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <div className="border-t border-border p-3">
        {streamError && (
          <p role="alert" className="mb-2 flex items-start gap-1.5 text-sm text-destructive">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            {streamError}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "该应用不属于你，无法继续对话" : "描述你想要的改动，Enter 发送，Shift+Enter 换行"}
            rows={2}
            disabled={disabled || streaming}
            className="flex-1 text-sm"
          />
          <Button type="submit" disabled={disabled || streaming || !draft.trim()} aria-label="发送">
            {streaming ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
            {streaming ? "生成中" : "发送"}
          </Button>
        </form>
      </div>
    </div>
  )
}
