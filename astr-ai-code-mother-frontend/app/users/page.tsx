import type { Metadata } from "next"

import { RouteGuard } from "@/components/auth/route-guard"
import { UsersManagement } from "@/app/users/_components/users-management"

export const metadata: Metadata = {
  title: "用户管理 · Astr",
}

export default function UsersPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RouteGuard adminOnly>
        <UsersManagement />
      </RouteGuard>
    </div>
  )
}
