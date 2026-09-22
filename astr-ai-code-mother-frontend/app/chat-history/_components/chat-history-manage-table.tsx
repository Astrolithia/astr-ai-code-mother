"use client"

import * as React from "react"
import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SquareArrowOutUpRight,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import { listChatHistoryByPageByAdmin } from "@/lib/api/generated"
import type { ChatHistoryQueryRequest } from "@/lib/api/generated/model"
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
import { formatDateTime } from "@/lib/format"

const PAGE_SIZE = 20
const QUERY_KEY = "admin-chat-history-list"

const MESSAGE_TYPE_OPTIONS = [
  { value: "user", label: "用户" },
  { value: "ai", label: "AI" },
]

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  user: "用户",
  ai: "AI",
}

interface Filters {
  id: string
  appId: string
  userId: string
  messageType: string
  message: string
}

const EMPTY_FILTERS: Filters = {
  id: "",
  appId: "",
  userId: "",
  messageType: "all",
  message: "",
}

// id/appId/userId are snowflake ids — beyond Number.MAX_SAFE_INTEGER, so
// unlike a plain page number they must stay strings at runtime (see
// lib/app-id.ts).
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
          <TableCell colSpan={5}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function ChatHistoryManageTable() {
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS)
  const [pageNum, setPageNum] = React.useState(1)

  const queryRequest: ChatHistoryQueryRequest = {
    pageNum,
    pageSize: PAGE_SIZE,
    id: toOptionalIdFilter(applied.id),
    appId: toOptionalIdFilter(applied.appId),
    userId: toOptionalIdFilter(applied.userId),
    messageType: applied.messageType === "all" ? undefined : applied.messageType,
    message: applied.message || undefined,
  }

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, queryRequest],
    queryFn: ({ signal }) => listChatHistoryByPageByAdmin(queryRequest, { signal }),
    placeholderData: keepPreviousData,
  })

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

  const page = listQuery.data?.data
  const records = page?.records ?? []
  const totalRow = page?.totalRow ?? 0
  const totalPage = Math.max(Number(page?.totalPage ?? 1) || 1, 1)
  const isInitialLoading = listQuery.isLoading
  const isRefetching = listQuery.isFetching && !listQuery.isLoading

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">对话历史管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 <span className="font-mono">{totalRow}</span> 条对话记录
        </p>
      </div>

      <form
        onSubmit={applySearch}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4"
      >
        <div className="flex min-w-24 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-id" className="text-xs font-medium text-muted-foreground">记录 ID</label>
          <Input id="filter-id" inputMode="numeric" value={draft.id} onChange={(e) => setDraft((f) => ({ ...f, id: e.target.value }))} className="w-full sm:w-28 font-mono" />
        </div>
        <div className="flex min-w-24 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-appid" className="text-xs font-medium text-muted-foreground">应用 ID</label>
          <Input id="filter-appid" inputMode="numeric" value={draft.appId} onChange={(e) => setDraft((f) => ({ ...f, appId: e.target.value }))} className="w-full sm:w-28 font-mono" />
        </div>
        <div className="flex min-w-24 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-userid" className="text-xs font-medium text-muted-foreground">创建者 ID</label>
          <Input id="filter-userid" inputMode="numeric" value={draft.userId} onChange={(e) => setDraft((f) => ({ ...f, userId: e.target.value }))} className="w-full sm:w-28 font-mono" />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-type" className="text-xs font-medium text-muted-foreground">消息类型</label>
          <Select value={draft.messageType} onValueChange={(v) => setDraft((f) => ({ ...f, messageType: v ?? "all" }))}>
            <SelectTrigger id="filter-type" className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {MESSAGE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-message" className="text-xs font-medium text-muted-foreground">内容关键字</label>
          <Input id="filter-message" value={draft.message} onChange={(e) => setDraft((f) => ({ ...f, message: e.target.value }))} className="w-full sm:w-56" />
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
            <p className="text-sm text-muted-foreground">{getErrorMessage(listQuery.error, "加载对话历史失败")}</p>
            <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>重试</Button>
          </div>
        ) : !isInitialLoading && records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <Sparkles className="text-muted-foreground" size={20} />
            <p className="text-sm text-muted-foreground">{hasActiveFilters ? "没有找到匹配的对话记录" : "还没有对话记录"}</p>
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
                    <TableHead>消息</TableHead>
                    <TableHead>应用</TableHead>
                    <TableHead>创建者</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                    <SkeletonRows />
                  ) : (
                    records.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0 border-transparent bg-muted text-muted-foreground">
                              {MESSAGE_TYPE_LABEL[item.messageType ?? ""] ?? item.messageType ?? "-"}
                            </Badge>
                            <p className="min-w-0 max-w-md truncate text-sm">{item.message || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.appId}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{item.userId}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.createTime ? formatDateTime(item.createTime) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label={`查看应用 ${item.appId}`} nativeButton={false} render={<Link href={`/apps/${item.appId}`} />}>
                              <SquareArrowOutUpRight />
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
                : records.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <Badge variant="outline" className="shrink-0 border-transparent bg-muted text-muted-foreground">
                            {MESSAGE_TYPE_LABEL[item.messageType ?? ""] ?? item.messageType ?? "-"}
                          </Badge>
                          <p className="min-w-0 truncate text-sm">{item.message || "-"}</p>
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label={`查看应用 ${item.appId}`} nativeButton={false} render={<Link href={`/apps/${item.appId}`} />}>
                          <SquareArrowOutUpRight />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono">应用 #{item.appId}</span>
                        <span className="font-mono">创建者 #{item.userId}</span>
                        {item.createTime && <span className="font-mono">{formatDateTime(item.createTime)}</span>}
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
    </div>
  )
}
