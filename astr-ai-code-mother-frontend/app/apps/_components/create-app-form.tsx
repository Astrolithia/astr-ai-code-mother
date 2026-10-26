"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useAddApp } from "@/lib/api/generated"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { CreateAppMenu } from "./create-app-menu"

export function CreateAppForm() {
  const router = useRouter()
  const addAppMutation = useAddApp()

  const [prompt, setPrompt] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)
  const promptRef = React.useRef<HTMLTextAreaElement>(null)
  const submitting = React.useRef(false)

  async function createApp(codeGenType: string | undefined) {
    if (submitting.current || addAppMutation.isPending) return
    setFormError(null)

    const trimmed = prompt.trim()
    if (!trimmed) {
      setFormError("请输入你想要的应用需求")
      promptRef.current?.focus()
      return
    }
    submitting.current = true

    try {
      const response = await addAppMutation.mutateAsync({ data: { initPrompt: trimmed, codeGenType } })
      const appId = response.data
      if (appId == null) {
        setFormError("创建成功但未返回应用 ID，请刷新后重试")
        return
      }
      // No handoff needed: the chat page decides whether to auto-send by
      // checking the app's own initPrompt against its (empty, for a brand
      // new app) persisted chat history.
      router.push(`/apps/${appId}`)
    } catch (error) {
      setFormError(getErrorMessage(error, "创建应用失败，请稍后重试"))
    } finally {
      submitting.current = false
    }
  }

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-3 pb-4">
      {formError && (
        <p id="create-app-error" role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Textarea
        ref={promptRef}
        aria-label="应用需求"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想要的应用，例如：一个用于记录读书笔记的网站，支持按标签筛选"
        rows={3}
        aria-invalid={!!formError}
        aria-describedby={formError ? "create-app-error" : undefined}
        disabled={addAppMutation.isPending}
        className="text-sm"
      />
      <div className="flex justify-end">
        <div className="shrink-0">
          <CreateAppMenu
            onChoose={(codeGenType) => void createApp(codeGenType)}
            pending={addAppMutation.isPending}
          />
        </div>
      </div>
    </form>
  )
}
