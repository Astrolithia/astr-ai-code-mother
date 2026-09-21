"use client"

import * as React from "react"
import Link from "next/link"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
  Sparkles,
  SquareArrowOutUpRight,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import { useDeleteApp } from "@/lib/api/generated"
import type { AppQueryRequest, AppVO, BaseResponsePageAppVO } from "@/lib/api/generated/model"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { formatCodeGenType } from "@/lib/app-code-gen"
import { formatDateTime } from "@/lib/format"

const PAGE_SIZE = 20

function SkeletonList() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function StatusBlock({
  icon: Icon,
  message,
  action,
  role,
}: {
  icon: React.ElementType
  message: string
  action?: React.ReactNode
  role?: "alert" | "status"
}) {
  return (
    <div role={role} className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <Icon className="text-muted-foreground" size={20} />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}

function AppRow({
  app,
  manageable,
  onDeleteRequest,
}: {
  app: AppVO
  manageable: boolean
  onDeleteRequest: (app: AppVO) => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {app.cover ? (
        // Real, user-provided cover URL — not a placeholder image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.cover}
          alt=""
          className="size-10 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          <Sparkles className="text-muted-foreground" size={16} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium">{app.appName || "未命名应用"}</p>
          {app.priority === 99 && (
            <Badge variant="outline" className="border-transparent bg-foreground/10 text-foreground">
              精选
            </Badge>
          )}
        </div>
        {app.initPrompt && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{app.initPrompt}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">#{app.id}</span>
          <span>{formatCodeGenType(app.codeGenType)}</span>
          {app.createTime && <span className="font-mono">{formatDateTime(app.createTime)}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/apps/${app.id}`} />}
        >
          <SquareArrowOutUpRight />
          进入
        </Button>
        {manageable && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`编辑 ${app.appName ?? "该应用"}`}
              nativeButton={false}
              render={<Link href={`/apps/${app.id}/edit`} />}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`删除 ${app.appName ?? "该应用"}`}
              onClick={() => onDeleteRequest(app)}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function AppListSection({
  title,
  emptyMessage,
  emptySearchMessage,
  searchPlaceholder,
  queryKeyBase,
  manageable,
  fetchPage,
}: {
  title: string
  emptyMessage: string
  emptySearchMessage: string
  searchPlaceholder: string
  queryKeyBase: string
  manageable: boolean
  fetchPage: (request: AppQueryRequest, signal?: AbortSignal) => Promise<BaseResponsePageAppVO>
}) {
  const queryClient = useQueryClient()
  const [draftName, setDraftName] = React.useState("")
  const [appliedName, setAppliedName] = React.useState("")
  const [pageNum, setPageNum] = React.useState(1)
  const [deleteTarget, setDeleteTarget] = React.useState<AppVO | null>(null)
  const deleteMutation = useDeleteApp()

  const queryRequest: AppQueryRequest = {
    pageNum,
    pageSize: PAGE_SIZE,
    appName: appliedName || undefined,
  }

  const listQuery = useQuery({
    queryKey: [queryKeyBase, queryRequest],
    queryFn: ({ signal }) => fetchPage(queryRequest, signal),
    placeholderData: keepPreviousData,
  })

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: [queryKeyBase] })
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setAppliedName(draftName.trim())
    setPageNum(1)
  }

  function resetSearch() {
    setDraftName("")
    setAppliedName("")
    setPageNum(1)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?.id) return
    try {
      await deleteMutation.mutateAsync({ data: { id: deleteTarget.id } })
      setDeleteTarget(null)
      if (records.length === 1 && pageNum > 1) {
        setPageNum((p) => p - 1)
      } else {
        invalidateList()
      }
    } catch {
      // Error surfaced inline via deleteMutation.isError below; keep dialog open.
    }
  }

  const page = listQuery.data?.data
  const records = page?.records ?? []
  const totalRow = page?.totalRow ?? 0
  const totalPage = Math.max(Number(page?.totalPage ?? 1) || 1, 1)
  const isInitialLoading = listQuery.isLoading
  const isRefetching = listQuery.isFetching && !listQuery.isLoading
  const hasActiveFilters = !!appliedName

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">
          共 <span className="font-mono">{totalRow}</span> 个
        </p>
      </div>

      <form onSubmit={applySearch} className="flex flex-wrap items-center gap-2">
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full sm:w-64"
          aria-label={searchPlaceholder}
        />
        <Button type="submit" variant="outline" size="sm">
          <Search />
          搜索
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetSearch}
          disabled={!hasActiveFilters && !draftName}
        >
          <RotateCcw />
          重置
        </Button>
      </form>

      <div className="rounded-lg border border-border">
        {isInitialLoading ? (
          <SkeletonList />
        ) : listQuery.isError ? (
          <StatusBlock
            role="alert"
            icon={TriangleAlert}
            message={getErrorMessage(listQuery.error, "加载失败")}
            action={
              <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                重试
              </Button>
            }
          />
        ) : records.length === 0 ? (
          <StatusBlock
            icon={Sparkles}
            message={hasActiveFilters ? emptySearchMessage : emptyMessage}
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetSearch}>
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={`divide-y divide-border ${isRefetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
            {records.map((app) => (
              <AppRow key={app.id} app={app} manageable={manageable} onDeleteRequest={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {!isInitialLoading && !listQuery.isError && records.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            第 <span className="font-mono">{pageNum}</span> / <span className="font-mono">{totalPage}</span> 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="上一页"
              disabled={pageNum <= 1 || isRefetching}
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="下一页"
              disabled={pageNum >= totalPage || isRefetching}
              onClick={() => setPageNum((p) => Math.min(totalPage, p + 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      {manageable && (
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{deleteTarget?.appName || "该应用"}」？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后无法恢复，该应用已生成或部署的内容也会一并失效。
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(deleteMutation.error, "删除失败")}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  )
}
