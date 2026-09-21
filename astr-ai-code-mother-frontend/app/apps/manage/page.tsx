import type { Metadata } from "next"

import { RouteGuard } from "@/components/auth/route-guard"
import { AppsManageTable } from "@/app/apps/_components/apps-manage-table"

export const metadata: Metadata = {
  title: "应用管理 · Astr",
}

export default function AppsManagePage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RouteGuard adminOnly>
        <AppsManageTable />
      </RouteGuard>
    </div>
  )
}
