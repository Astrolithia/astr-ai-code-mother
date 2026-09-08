"use client"

import * as React from "react"
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  RotateCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AppItem, AppStatus } from "@/lib/apps-data"
import { formatDateTime, formatVisits } from "@/lib/format"

const GRID_COLS =
  "sm:grid-cols-[minmax(0,1fr)_112px_88px_148px_auto]"

const STATUS_META: Record<
  AppStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  deployed: {
    label: "已部署",
    icon: CheckCircle2,
    className: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
  },
  generating: {
    label: "生成中",
    icon: Loader2,
    className: "bg-amber-600/10 text-amber-600 dark:text-amber-400",
  },
  failed: {
    label: "生成失败",
    icon: XCircle,
    className: "bg-red-600/10 text-red-600 dark:text-red-400",
  },
  draft: {
    label: "草稿",
    icon: Circle,
    className: "bg-muted text-muted-foreground",
  },
}

function StatusBadge({ status }: { status: AppStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <Badge variant="outline" className={`border-transparent ${meta.className}`}>
      <Icon className={status === "generating" ? "animate-spin" : ""} />
      {meta.label}
    </Badge>
  )
}

type Action = "generate" | "retry" | "regenerate"

function PrimaryAction({
  app,
  onAction,
}: {
  app: AppItem
  onAction: (id: string, action: Action) => void
}) {
  if (app.status === "deployed" && app.deployUrl) {
    return (
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<a href={app.deployUrl} target="_blank" rel="noopener noreferrer" />}
      >
        <ExternalLink />
        打开
      </Button>
    )
  }

  if (app.status === "generating") {
    return (
      <Button size="sm" variant="outline" disabled>
        <Loader2 className="animate-spin" />
        生成中
      </Button>
    )
  }

  if (app.status === "failed") {
    return (
      <Button size="sm" variant="outline" onClick={() => onAction(app.id, "retry")}>
        <RotateCw />
        重试
      </Button>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => onAction(app.id, "generate")}>
      <Sparkles />
      生成
    </Button>
  )
}

function RowMenu({
  app,
  onAction,
  onDeleteRequest,
}: {
  app: AppItem
  onAction: (id: string, action: Action) => void
  onDeleteRequest: (app: AppItem) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${app.name} 更多操作`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {app.status === "deployed" && (
          <DropdownMenuItem onClick={() => onAction(app.id, "regenerate")}>
            <RefreshCw />
            重新生成
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => onDeleteRequest(app)}>
          <Trash2 />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppsList({ initialApps }: { initialApps: AppItem[] }) {
  const [apps, setApps] = React.useState(initialApps)
  const [deleteTarget, setDeleteTarget] = React.useState<AppItem | null>(null)

  function handleAction(id: string, action: Action) {
    if (action === "generate" || action === "retry" || action === "regenerate") {
      setApps((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                status: "generating",
                error: undefined,
                updatedAt: new Date().toISOString(),
              }
            : app
        )
      )
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setApps((prev) => prev.filter((app) => app.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  if (apps.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">还没有创建应用</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <div
        className={`hidden border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:items-center sm:gap-x-4 ${GRID_COLS}`}
      >
        <span>应用</span>
        <span>状态</span>
        <span className="text-right">访问量</span>
        <span>更新时间</span>
        <span className="sr-only">操作</span>
      </div>

      <div className="divide-y divide-border">
        {apps.map((app) => (
          <div
            key={app.id}
            className={`grid grid-cols-1 items-start gap-y-2 px-4 py-3 sm:items-center sm:gap-x-4 sm:gap-y-0 ${GRID_COLS}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{app.name}</p>
              {app.description && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {app.description}
                </p>
              )}
              {app.status === "failed" && app.error && (
                <p
                  className="mt-1 truncate text-xs text-red-600 dark:text-red-400"
                  title={app.error}
                >
                  {app.error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
              <StatusBadge status={app.status} />
              <span className="font-mono text-sm tabular-nums text-muted-foreground sm:text-right">
                {formatVisits(app.visits)}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatDateTime(app.updatedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <PrimaryAction app={app} onAction={handleAction} />
              <RowMenu app={app} onAction={handleAction} onDeleteRequest={setDeleteTarget} />
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{deleteTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复
              {deleteTarget?.status === "deployed" ? "，该应用的部署也会一并下线。" : "。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
