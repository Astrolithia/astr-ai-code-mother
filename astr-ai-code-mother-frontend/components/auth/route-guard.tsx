"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { ShieldAlert, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { isAdmin, useCurrentUser } from "@/lib/auth"

/**
 * Gates a page behind login, and optionally admin role. Redirects anonymous
 * visitors to /login; shows an inline message (no redirect) for logged-in
 * users without the required role, since that's a real, explainable state
 * rather than a transient one.
 */
export function RouteGuard({
  adminOnly = false,
  children,
}: {
  adminOnly?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, isError, notLoggedIn, error, refetch } = useCurrentUser()

  React.useEffect(() => {
    if (!isLoading && notLoggedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isLoading, notLoggedIn, pathname, router])

  if (isLoading || notLoggedIn) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-border px-4 py-12 text-center"
      >
        <TriangleAlert className="text-muted-foreground" size={20} />
        <p className="text-sm text-muted-foreground">
          {getErrorMessage(error, "加载账号信息失败")}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          重试
        </Button>
      </div>
    )
  }

  if (adminOnly && !isAdmin(user)) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-border px-4 py-12 text-center"
      >
        <ShieldAlert className="text-muted-foreground" size={20} />
        <p className="text-sm text-muted-foreground">你没有权限访问此页面，需要管理员身份</p>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/apps" />}>
          返回我的应用
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
