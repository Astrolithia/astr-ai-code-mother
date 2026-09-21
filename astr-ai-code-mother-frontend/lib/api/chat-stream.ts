import { API_BASE_URL } from "@/lib/api/mutator/custom-fetch"

/**
 * Manual SSE client for GET /app/chat/gen/code. Not Orval-generated: the
 * backend streams `text/event-stream` (AppController#chatToGenCode), and
 * customFetch's `response.json()` can't consume that. Each default ("message")
 * event carries `data: {"d":"<chunk>"}`; the stream ends with a named `done`
 * event (see AppController.java).
 */
export interface ChatStreamHandlers {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

function parseSseEvent(raw: string): { event: string; data: string } {
  let event = "message"
  const dataLines: string[] = []
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim())
  }
  return { event, data: dataLines.join("\n") }
}

export function streamChatToGenCode(
  // appId is the app's snowflake id as a decimal string (see AppChatPage) —
  // never a JS `number`, since these ids exceed Number.MAX_SAFE_INTEGER.
  appId: string,
  message: string,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): void {
  void (async () => {
    try {
      const url = `${API_BASE_URL}/app/chat/gen/code?${new URLSearchParams({
        appId,
        message,
      })}`
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal,
      })

      const contentType = response.headers.get("content-type") ?? ""
      if (!response.ok || !contentType.includes("text/event-stream")) {
        let errorMessage = `生成失败（状态码 ${response.status}）`
        try {
          const body = (await response.json()) as { message?: string } | undefined
          if (typeof body?.message === "string" && body.message) errorMessage = body.message
        } catch {
          // body wasn't JSON — keep the status-code fallback
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        handlers.onDone()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let separatorIndex: number
        while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex)
          buffer = buffer.slice(separatorIndex + 2)
          const { event, data } = parseSseEvent(rawEvent)

          if (event === "done") {
            handlers.onDone()
            return
          }
          if (data) {
            try {
              const parsed = JSON.parse(data) as { d?: string }
              if (typeof parsed.d === "string") handlers.onChunk(parsed.d)
            } catch {
              // malformed chunk — skip it, keep the stream alive
            }
          }
        }
      }

      // Connection closed without an explicit "done" event.
      handlers.onDone()
    } catch (error) {
      if (signal.aborted) return
      handlers.onError(error instanceof Error ? error.message : "生成失败，请稍后重试")
    }
  })()
}
