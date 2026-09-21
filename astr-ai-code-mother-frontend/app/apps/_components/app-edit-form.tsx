"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, ShieldAlert, TriangleAlert } from "lucide-react"

import {
  getGetAppVOByIdQueryKey,
  useGetAppVOById,
  useUpdateApp,
  useUpdateAppByAdmin,
} from "@/lib/api/generated"
import type { AppVO } from "@/lib/api/generated/model"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { asApiId } from "@/lib/app-id"
import { isAdmin, useCurrentUser } from "@/lib/auth"

function StatusBlock({
  icon: Icon,
  message,
  role,
}: {
  icon: React.ElementType
  message: string
  role?: "alert" | "status"
}) {
  return (
    <div role={role} className="flex flex-col items-center gap-3 rounded-lg border border-border px-4 py-12 text-center">
      <Icon className="text-muted-foreground" size={20} />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/apps" />}>
        返回我的应用
      </Button>
    </div>
  )
}

// Mounted fresh (keyed by app.id) once the app has loaded, so form fields can
// read their initial value straight from `app` via useState's lazy
// initializer — no effect needed to sync query data into local state.
function AppEditFields({
  appId,
  app,
  admin,
}: {
  appId: string
  app: AppVO
  admin: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const updateMutation = useUpdateApp()
  const updateByAdminMutation = useUpdateAppByAdmin()

  const [appName, setAppName] = React.useState(() => app.appName ?? "")
  const [cover, setCover] = React.useState(() => app.cover ?? "")
  const [priority, setPriority] = React.useState(() => (app.priority != null ? String(app.priority) : ""))
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmedName = appName.trim()
    const nextNameError = trimmedName ? null : "请输入应用名称"
    setNameError(nextNameError)
    if (nextNameError) return

    try {
      if (admin) {
        const trimmedPriority = priority.trim()
        const priorityValue = trimmedPriority === "" ? undefined : Number(trimmedPriority)
        if (priorityValue !== undefined && !Number.isFinite(priorityValue)) {
          setFormError("优先级必须是数字")
          return
        }
        await updateByAdminMutation.mutateAsync({
          data: { id: asApiId(appId), appName: trimmedName, cover: cover.trim(), priority: priorityValue },
        })
      } else {
        await updateMutation.mutateAsync({ data: { id: asApiId(appId), appName: trimmedName } })
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAppVOByIdQueryKey({ id: asApiId(appId) }) }),
        queryClient.invalidateQueries({ queryKey: ["my-apps-list"] }),
        queryClient.invalidateQueries({ queryKey: ["featured-apps-list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-apps-list"] }),
      ])
      router.push(`/apps/${appId}`)
    } catch (error) {
      setFormError(getErrorMessage(error, "保存失败"))
    }
  }

  const isSaving = updateMutation.isPending || updateByAdminMutation.isPending

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>应用 ID</Label>
        <p className="font-mono text-sm text-muted-foreground">{app.id}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="appName">应用名称</Label>
        <Input
          id="appName"
          value={appName}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "appName-error" : undefined}
          onChange={(e) => setAppName(e.target.value)}
        />
        {nameError && (
          <p id="appName-error" className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </div>

      {admin && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cover">封面链接（可选）</Label>
            <Input
              id="cover"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">优先级</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">设为 99 会展示在精选应用列表中</p>
          </div>
        </>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="animate-spin" />}
          保存
        </Button>
        <Button type="button" variant="ghost" nativeButton={false} render={<Link href={`/apps/${appId}`} />}>
          取消
        </Button>
      </div>
    </form>
  )
}

export function AppEditForm({ appId }: { appId: string }) {
  const { user: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const appQuery = useGetAppVOById({ id: asApiId(appId) })
  const app = appQuery.data?.data

  const admin = isAdmin(currentUser)
  const isOwner =
    !!app?.user?.id && !!currentUser?.id && String(app.user.id) === String(currentUser.id)
  const canEdit = admin || isOwner

  if (appQuery.isLoading || isLoadingUser) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    )
  }

  if (appQuery.isError) {
    return (
      <StatusBlock role="alert" icon={TriangleAlert} message={getErrorMessage(appQuery.error, "应用不存在或加载失败")} />
    )
  }

  if (!app) {
    return <StatusBlock icon={TriangleAlert} message="应用不存在" />
  }

  if (!canEdit) {
    return <StatusBlock role="status" icon={ShieldAlert} message="你没有权限编辑该应用" />
  }

  return <AppEditFields key={app.id} appId={appId} app={app} admin={admin} />
}
