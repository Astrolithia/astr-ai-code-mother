import type { Metadata } from "next"

import { RouteGuard } from "@/components/auth/route-guard"
import { AppsHome } from "@/app/apps/_components/apps-home"

export const metadata: Metadata = {
  title: "我的应用 · Astr",
}

export default function AppsPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RouteGuard>
        <AppsHome />
      </RouteGuard>
    </div>
  )
}
