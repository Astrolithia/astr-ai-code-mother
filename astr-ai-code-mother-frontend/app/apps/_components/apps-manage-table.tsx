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
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import {
  listAppVOByPageByAdmin,
  useDeleteAppByAdmin,
  useUpdateAppByAdmin,
} from "@/lib/api/generated"
import type { AppQueryRequest, AppVO } from "@/lib/api/generated/model"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { asApiId } from "@/lib/app-id"
import { formatCodeGenType } from "@/lib/app-code-gen"
import { formatDateTime } from "@/lib/format"

const PAGE_SIZE = 20
const QUERY_KEY = "admin-apps-list"
const FEATURED_PRIORITY = 99

const CODE_GEN_TYPE_OPTIONS = [
  { value: "html", label: "原生 HTML 模式" },
  { value: "multi_file", label: "原生多文件模式" },
]

interface Filters {
  id: string
  appName: string
  userId: string
  codeGenType: string
  cover: string
  initPrompt: string
  deployKey: string
  priority: string
}

const EMPTY_FILTERS: Filters = {
  id: "",
  appName: "",
  userId: "",
  codeGenType: "all",
  cover: "",
  initPrompt: "",
  deployKey: "",
  priority: "",
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

// id/userId are snowflake ids — beyond Number.MAX_SAFE_INTEGER, so unlike
// priority above they must stay strings at runtime (see lib/app-id.ts).
function toOptionalIdFilter(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined
  return asApiId(trimmed)
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={6}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function AppsManageTable() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = React.useState(1)
  const [deleteTarget, setDeleteTarget] = React.useState<AppVO | null>(null)
  const [featuringId, setFeaturingId] = React.useState<number | null>(null)

  const deleteMutation = useDeleteAppByAdmin()
  const featureMutation = useUpdateAppByAdmin()

  const queryRequest: AppQueryRequest = {
    pageNum,
    pageSize: PAGE_SIZE,
    id: toOptionalIdFilter(applied.id),
    appName: applied.appName || undefined,
    userId: toOptionalIdFilter(applied.userId),
    codeGenType: applied.codeGenType === "all" ? undefined : applied.codeGenType,
    cover: applied.cover || undefined,
    initPrompt: applied.initPrompt || undefined,
    deployKey: applied.deployKey || undefined,
    priority: toOptionalNumber(applied.priority),
  }

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, queryRequest],
    queryFn: ({ signal }) => listAppVOByPageByAdmin(queryRequest, { signal }),
    placeholderData: keepPreviousData,
  })

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setApplied(draft)
    setPageNum(1)
  }

  function resetSearch() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPageNum(1)
  }

  const hasActiveFilters = JSON.stringify(applied) !== JSON.stringify(EMPTY_FILTERS)

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

  async function handleFeature(app: AppVO) {
    if (!app.id || featureMutation.isPending) return
    setFeaturingId(app.id)
    try {
      await featureMutation.mutateAsync({
        data: { id: app.id, appName: app.appName, cover: app.cover, priority: FEATURED_PRIORITY },
      })
      invalidateList()
    } catch {
      // Best-effort: surfaced nowhere specific, row simply doesn't update.
    } finally {
      setFeaturingId(null)
    }
  }

  const page = listQuery.data?.data
  const records = page?.records ?? []
  const totalRow = page?.totalRow ?? 0
  const totalPage = Math.max(Number(page?.totalPage ?? 1) || 1, 1)
  const isInitialLoading = listQuery.isLoading
  const isRefetching = listQuery.isFetching && !listQuery.isLoading

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">应用管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 <span className="font-mono">{totalRow}</span> 个应用
        </p>
      </div>

      <form
        onSubmit={applySearch}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4"
      >
        <div className="flex min-w-24 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-id" className="text-xs font-medium text-muted-foreground">应用 ID</label>
          <Input id="filter-id" inputMode="numeric" value={draft.id} onChange={(e) => setDraft((f) => ({ ...f, id: e.target.value }))} className="w-full sm:w-24 font-mono" />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-name" className="text-xs font-medium text-muted-foreground">名称</label>
          <Input id="filter-name" value={draft.appName} onChange={(e) => setDraft((f) => ({ ...f, appName: e.target.value }))} placeholder="按名称搜索" className="w-full sm:w-40" />
        </div>
        <div className="flex min-w-24 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-userid" className="text-xs font-medium text-muted-foreground">创建者 ID</label>
          <Input id="filter-userid" inputMode="numeric" value={draft.userId} onChange={(e) => setDraft((f) => ({ ...f, userId: e.target.value }))} className="w-full sm:w-28 font-mono" />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-gentype" className="text-xs font-medium text-muted-foreground">生成类型</label>
          <Select value={draft.codeGenType} onValueChange={(v) => setDraft((f) => ({ ...f, codeGenType: v ?? "all" }))}>
            <SelectTrigger id="filter-gentype" className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {CODE_GEN_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-cover" className="text-xs font-medium text-muted-foreground">封面关键字</label>
          <Input id="filter-cover" value={draft.cover} onChange={(e) => setDraft((f) => ({ ...f, cover: e.target.value }))} className="w-full sm:w-36" />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-prompt" className="text-xs font-medium text-muted-foreground">提示词关键字</label>
          <Input id="filter-prompt" value={draft.initPrompt} onChange={(e) => setDraft((f) => ({ ...f, initPrompt: e.target.value }))} className="w-full sm:w-40" />
        </div>
        <div className="flex min-w-28 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-deploykey" className="text-xs font-medium text-muted-foreground">部署 Key</label>
          <Input id="filter-deploykey" value={draft.deployKey} onChange={(e) => setDraft((f) => ({ ...f, deployKey: e.target.value }))} className="w-full sm:w-28 font-mono" />
        </div>
        <div className="flex min-w-20 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-priority" className="text-xs font-medium text-muted-foreground">优先级</label>
          <Input id="filter-priority" type="number" value={draft.priority} onChange={(e) => setDraft((f) => ({ ...f, priority: e.target.value }))} className="w-full sm:w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline">
            <Search />
            搜索
          </Button>
          <Button type="button" variant="ghost" onClick={resetSearch} disabled={!hasActiveFilters && JSON.stringify(draft) === JSON.stringify(EMPTY_FILTERS)}>
            <RotateCcw />
            重置
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border">
        {listQuery.isError ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <TriangleAlert className="text-muted-foreground" size={20} />
            <p className="text-sm text-muted-foreground">{getErrorMessage(listQuery.error, "加载应用列表失败")}</p>
            <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>重试</Button>
          </div>
        ) : !isInitialLoading && records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <Sparkles className="text-muted-foreground" size={20} />
            <p className="text-sm text-muted-foreground">{hasActiveFilters ? "没有找到匹配的应用" : "还没有应用"}</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetSearch}>清除筛选</Button>
            )}
          </div>
        ) : (
          <>
            <div className={`hidden sm:block ${isRefetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>应用</TableHead>
                    <TableHead>创建者</TableHead>
                    <TableHead>生成类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <SkeletonRows />
                  ) : (
                    records.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{app.appName || "未命名应用"}</p>
                            <p className="font-mono text-xs text-muted-foreground">#{app.id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {app.user?.userName || app.user?.userAccount || (app.userId ? `#${app.userId}` : "-")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatCodeGenType(app.codeGenType)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {app.priority === FEATURED_PRIORITY && (
                              <Badge variant="outline" className="border-transparent bg-foreground/10 text-foreground">精选</Badge>
                            )}
                            <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                              {app.deployKey ? "已部署" : "未部署"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {app.createTime ? formatDateTime(app.createTime) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label={`查看 ${app.appName ?? "应用"}`} nativeButton={false} render={<Link href={`/apps/${app.id}`} />}>
                              <SquareArrowOutUpRight />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`编辑 ${app.appName ?? "应用"}`} nativeButton={false} render={<Link href={`/apps/${app.id}/edit`} />}>
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`设为精选 ${app.appName ?? "应用"}`}
                              disabled={app.priority === FEATURED_PRIORITY || featuringId === app.id}
                              onClick={() => handleFeature(app)}
                            >
                              <Star />
                            </Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`删除 ${app.appName ?? "应用"}`} onClick={() => setDeleteTarget(app)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className={`divide-y divide-border sm:hidden ${isRefetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
              {isInitialLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))
                : records.map((app) => (
                    <div key={app.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{app.appName || "未命名应用"}</p>
                          <p className="font-mono text-xs text-muted-foreground">#{app.id}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {app.priority === FEATURED_PRIORITY && (
                            <Badge variant="outline" className="border-transparent bg-foreground/10 text-foreground">精选</Badge>
                          )}
                          <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                            {app.deployKey ? "已部署" : "未部署"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{app.user?.userName || app.user?.userAccount || "-"}</span>
                        <span>{formatCodeGenType(app.codeGenType)}</span>
                        {app.createTime && <span className="font-mono">{formatDateTime(app.createTime)}</span>}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`查看 ${app.appName ?? "应用"}`} nativeButton={false} render={<Link href={`/apps/${app.id}`} />}>
                          <SquareArrowOutUpRight />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`编辑 ${app.appName ?? "应用"}`} nativeButton={false} render={<Link href={`/apps/${app.id}/edit`} />}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`设为精选 ${app.appName ?? "应用"}`}
                          disabled={app.priority === FEATURED_PRIORITY || featuringId === app.id}
                          onClick={() => handleFeature(app)}
                        >
                          <Star />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`删除 ${app.appName ?? "应用"}`} onClick={() => setDeleteTarget(app)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </>
        )}
      </div>

      {!isInitialLoading && !listQuery.isError && records.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            第 <span className="font-mono">{pageNum}</span> / <span className="font-mono">{totalPage}</span> 页
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="上一页" disabled={pageNum <= 1 || isRefetching} onClick={() => setPageNum((p) => Math.max(1, p - 1))}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="下一页" disabled={pageNum >= totalPage || isRefetching} onClick={() => setPageNum((p) => Math.min(totalPage, p + 1))}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{deleteTarget?.appName || "该应用"}」？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，该应用已生成或部署的内容也会一并失效。</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isError && (
            <p role="alert" className="text-sm text-destructive">{getErrorMessage(deleteMutation.error, "删除失败")}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleteMutation.isPending} onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
