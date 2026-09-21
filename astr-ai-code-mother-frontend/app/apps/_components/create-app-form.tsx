"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"

import { useAddApp } from "@/lib/api/generated"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { appInitPromptStorageKey } from "@/lib/app-init-prompt"

export function CreateAppForm() {
  const router = useRouter()
  const addAppMutation = useAddApp()

  const [prompt, setPrompt] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmed = prompt.trim()
    if (!trimmed) {
      setFormError("请输入你想要的应用需求")
      return
    }
    if (addAppMutation.isPending) return

    try {
      const response = await addAppMutation.mutateAsync({ data: { initPrompt: trimmed } })
      const appId = response.data
      if (appId == null) {
        setFormError("创建成功但未返回应用 ID，请刷新后重试")
        return
      }
      try {
        sessionStorage.setItem(appInitPromptStorageKey(appId), trimmed)
      } catch {
        // sessionStorage unavailable (private mode etc.) — the chat page will
        // just skip the auto-send instead of erroring.
      }
      router.push(`/apps/${appId}`)
    } catch (error) {
      setFormError(getErrorMessage(error, "创建应用失败，请稍后重试"))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="描述你想要的应用，例如：一个用于记录读书笔记的网站，支持按标签筛选"
        rows={3}
        aria-invalid={!!formError}
        aria-describedby={formError ? "create-app-error" : undefined}
        disabled={addAppMutation.isPending}
        className="text-sm"
      />
      <div className="flex items-center justify-between gap-4">
        {formError ? (
          <p id="create-app-error" role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={addAppMutation.isPending}>
          {addAppMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          生成应用
        </Button>
      </div>
    </form>
  )
}
