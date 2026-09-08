"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  Eye,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
} from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export type AppStatus = "draft" | "generating" | "deployed" | "failed"

export type AppRecord = {
  id: string
  name: string
  description: string
  status: AppStatus
  deployUrl: string | null
  visits: number
  createdAt: string
  updatedAt: string
  error?: string
}

const STATUS_LABEL: Record<AppStatus, string> = {
  draft: "草稿",
  generating: "生成中",
  deployed: "已部署",
  failed: "失败",
}

const STATUS_VARIANT: Record<
  AppStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  generating: "outline",
  deployed: "default",
  failed: "destructive",
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function AppsGrid({ initialApps }: { initialApps: AppRecord[] }) {
  const [apps, setApps] = useState(initialApps)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteTarget = apps.find((app) => app.id === deleteId) ?? null

  function handleRegenerate(id: string) {
    setApps((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status: "generating", error: undefined }
          : app
      )
    )
  }

  function handleConfirmDelete() {
    if (!deleteId) return
    setApps((prev) => prev.filter((app) => app.id !== deleteId))
    setDeleteId(null)
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <p className="text-sm">还没有应用</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <CardTitle className="truncate" title={app.name}>
                {app.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">
                {app.description || "暂无描述"}
              </CardDescription>
              <CardAction>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreVertical />
                    <span className="sr-only">操作</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleRegenerate(app.id)}
                    >
                      <RefreshCw />
                      重新生成
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteId(app.id)}
                    >
                      <Trash2 />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {app.status === "generating" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
                <Badge variant={STATUS_VARIANT[app.status]}>
                  {STATUS_LABEL[app.status]}
                </Badge>
              </div>

              {app.status === "failed" && app.error && (
                <div className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>{app.error}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {app.visits.toLocaleString("zh-CN")} 次访问
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(app.createdAt)}
                </span>
              </div>

              {app.status === "deployed" && app.deployUrl && (
                <a
                  href={app.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                >
                  {app.deployUrl}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{deleteTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复，该应用的部署也会失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
