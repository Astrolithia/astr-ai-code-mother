"use client"

import * as React from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react"

import { listUserVOByPage, useDeleteUser } from "@/lib/api/generated"
import type { UserVO } from "@/lib/api/generated/model"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"

import { EditUserDialog } from "@/app/users/_components/edit-user-dialog"

const PAGE_SIZE = 10
const USERS_LIST_QUERY_KEY = "users-list"

const ROLE_META: Record<string, { label: string; className: string }> = {
  admin: { label: "管理员", className: "bg-foreground/10 text-foreground" },
  user: { label: "普通用户", className: "bg-muted text-muted-foreground" },
}

function RoleBadge({ role }: { role?: string }) {
  const meta = role ? ROLE_META[role] : undefined
  return (
    <Badge variant="outline" className={`border-transparent ${meta?.className ?? "bg-muted text-muted-foreground"}`}>
      {meta?.label ?? role ?? "未知"}
    </Badge>
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

function SkeletonList() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function UserRowActions({
  record,
  isSelf,
  onEdit,
  onDelete,
}: {
  record: UserVO
  isSelf: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`编辑 ${record.userName ?? record.userAccount}`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`删除 ${record.userName ?? record.userAccount}`}
        disabled={isSelf}
        title={isSelf ? "不能删除自己的账号" : undefined}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

export function UsersManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useCurrentUser()

  const [draftAccount, setDraftAccount] = React.useState("")
  const [draftName, setDraftName] = React.useState("")
  const [role, setRole] = React.useState("all")
  const [appliedAccount, setAppliedAccount] = React.useState("")
  const [appliedName, setAppliedName] = React.useState("")
  const [pageNum, setPageNum] = React.useState(1)

  const [editTarget, setEditTarget] = React.useState<UserVO | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<UserVO | null>(null)
  const deleteMutation = useDeleteUser()

  const hasActiveFilters = !!(appliedAccount || appliedName || role !== "all")

  const queryRequest = {
    pageNum,
    pageSize: PAGE_SIZE,
    userAccount: appliedAccount || undefined,
    userName: appliedName || undefined,
    userRole: role === "all" ? undefined : role,
  }

  const listQuery = useQuery({
    queryKey: [USERS_LIST_QUERY_KEY, queryRequest],
    queryFn: ({ signal }) => listUserVOByPage(queryRequest, { signal }),
    placeholderData: keepPreviousData,
  })

  function invalidateList() {
    queryClient.invalidateQueries({ queryKey: [USERS_LIST_QUERY_KEY] })
  }

  function handleEditSuccess() {
    invalidateList()
    // Editing yourself changes what the header/RouteGuard show (name, avatar,
    // role) — that's a separate cache from the users list, so refresh it too,
    // or a role downgrade wouldn't hide admin-only UI until an unrelated
    // refetch happened to occur.
    if (editTarget?.id != null && currentUser?.id != null && String(editTarget.id) === String(currentUser.id)) {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    }
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setAppliedAccount(draftAccount.trim())
    setAppliedName(draftName.trim())
    setPageNum(1)
  }

  function resetSearch() {
    setDraftAccount("")
    setDraftName("")
    setRole("all")
    setAppliedAccount("")
    setAppliedName("")
    setPageNum(1)
  }

  function handleRoleChange(value: string | null) {
    setRole(value ?? "all")
    setPageNum(1)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?.id) return
    try {
      await deleteMutation.mutateAsync({ data: { id: deleteTarget.id } })
      setDeleteTarget(null)
      // Back off a page if that was the last row on a page beyond the first.
      if (records.length === 1 && pageNum > 1) {
        setPageNum((p) => p - 1)
      } else {
        invalidateList()
      }
    } catch {
      // Keep the dialog open with the alert-level error already surfaced via mutation state.
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
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 <span className="font-mono">{totalRow}</span> 个用户
        </p>
      </div>

      <form
        onSubmit={applySearch}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4"
      >
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-account" className="text-xs font-medium text-muted-foreground">
            账号
          </label>
          <Input
            id="filter-account"
            value={draftAccount}
            onChange={(e) => setDraftAccount(e.target.value)}
            placeholder="按账号搜索"
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-name" className="text-xs font-medium text-muted-foreground">
            昵称
          </label>
          <Input
            id="filter-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="按昵称搜索"
            className="w-full sm:w-40"
          />
        </div>
        <div className="flex min-w-28 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="filter-role" className="text-xs font-medium text-muted-foreground">
            角色
          </label>
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger id="filter-role" className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="user">普通用户</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline">
            <Search />
            搜索
          </Button>
          <Button type="button" variant="ghost" onClick={resetSearch} disabled={!hasActiveFilters && !draftAccount && !draftName}>
            <RotateCcw />
            重置
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-border">
        {isInitialLoading ? (
          <SkeletonList />
        ) : listQuery.isError ? (
          <StatusBlock
            role="alert"
            icon={TriangleAlert}
            message={getErrorMessage(listQuery.error, "加载用户列表失败")}
            action={
              <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                重试
              </Button>
            }
          />
        ) : records.length === 0 ? (
          <StatusBlock
            icon={UserRound}
            message={hasActiveFilters ? "没有找到匹配的用户" : "还没有用户"}
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetSearch}>
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop / tablet: real table. */}
            <div className={`hidden sm:block ${isRefetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const isSelf = currentUser?.id != null && String(record.id) === String(currentUser.id)
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              {record.userAvatar && <AvatarImage src={record.userAvatar} alt="" />}
                              <AvatarFallback>{(record.userName ?? record.userAccount ?? "?").slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{record.userName || "无名"}</p>
                              <p className="truncate font-mono text-xs text-muted-foreground">
                                {record.userAccount}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={record.userRole} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {record.createTime ? formatDateTime(record.createTime) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <UserRowActions
                              record={record}
                              isSelf={isSelf}
                              onEdit={() => setEditTarget(record)}
                              onDelete={() => setDeleteTarget(record)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Narrow screens: stacked card list instead of a horizontally-scrolling table. */}
            <div className={`divide-y divide-border sm:hidden ${isRefetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
              {records.map((record) => {
                const isSelf = currentUser?.id != null && String(record.id) === String(currentUser.id)
                return (
                  <div key={record.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      {record.userAvatar && <AvatarImage src={record.userAvatar} alt="" />}
                      <AvatarFallback>{(record.userName ?? record.userAccount ?? "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{record.userName || "无名"}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{record.userAccount}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <RoleBadge role={record.userRole} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {record.createTime ? formatDateTime(record.createTime) : "-"}
                        </span>
                      </div>
                    </div>
                    <UserRowActions
                      record={record}
                      isSelf={isSelf}
                      onEdit={() => setEditTarget(record)}
                      onDelete={() => setDeleteTarget(record)}
                    />
                  </div>
                )
              })}
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

      <EditUserDialog
        user={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除「{deleteTarget?.userName || deleteTarget?.userAccount}」？
            </AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，该账号将无法再登录。</AlertDialogDescription>
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
    </div>
  )
}
