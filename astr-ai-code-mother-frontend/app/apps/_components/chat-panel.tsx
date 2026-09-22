"use client"

import * as React from "react"
import { Loader2, SendHorizontal, TriangleAlert } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  pending?: boolean
}

const NEAR_BOTTOM_THRESHOLD_PX = 96

// Hand-rolled Tailwind classes per element instead of @tailwindcss/typography's
// `prose` — that plugin injects its own font-size scale, which conflicts with
// design.md's "only text-xs/sm/base/lg/xl/2xl/3xl, no custom sizes" rule.
const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 text-sm first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-medium">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4 hover:text-foreground"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-sm first:mt-0 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-sm first:mt-0 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm">{children}</li>,
  h1: ({ children }) => <p className="mt-3 mb-2 text-sm font-medium first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-3 mb-2 text-sm font-medium first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</p>,
  h5: ({ children }) => <p className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</p>,
  h6: ({ children }) => <p className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 text-sm text-muted-foreground italic first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 first:mt-0 last:mb-0">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children).replace(/\n$/, "")
    const isInline = !className && !text.includes("\n")
    return isInline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm" {...props}>
        {text}
      </code>
    ) : (
      <code className="font-mono text-sm" {...props}>
        {text}
      </code>
    )
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto first:mt-0 last:mb-0">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
  th: ({ children }) => <th className="px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 align-top">{children}</td>,
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-foreground text-background"
            : "border border-border bg-background text-foreground"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
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
  hasMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  historyPrependVersion,
}: {
  messages: ChatMessage[]
  streaming: boolean
  streamError: string | null
  disabled?: boolean
  onSend: (text: string) => void
  hasMoreHistory?: boolean
  loadingMoreHistory?: boolean
  onLoadMoreHistory?: () => void
  /** Bumped by the parent each time older messages were prepended, so the
   *  scroll-position effect below can tell "older history just loaded"
   *  apart from "a new message arrived", which need opposite scroll
   *  handling (keep position vs. jump to bottom). */
  historyPrependVersion?: number
}) {
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const wasNearBottomRef = React.useRef(true)
  const prevScrollHeightRef = React.useRef(0)
  const prevPrependVersionRef = React.useRef(historyPrependVersion)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    wasNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX
  }

  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (historyPrependVersion !== prevPrependVersionRef.current) {
      // Older messages were just prepended above the current viewport —
      // keep the same content pinned in place instead of letting the
      // browser leave scrollTop unchanged (which would visually jump the
      // conversation down by the height of what was just inserted).
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current
      prevPrependVersionRef.current = historyPrependVersion
    } else if (wasNearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
    prevScrollHeightRef.current = el.scrollHeight
  }, [messages, historyPrependVersion])

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
        {hasMoreHistory && (
          <div className="flex justify-center pb-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingMoreHistory}
              onClick={onLoadMoreHistory}
            >
              {loadingMoreHistory && <Loader2 className="animate-spin" />}
              {loadingMoreHistory ? "加载中…" : "加载更多历史消息"}
            </Button>
          </div>
        )}
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
