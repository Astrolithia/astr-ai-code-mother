import type { Metadata } from "next"

import { AppsList } from "@/app/apps/_components/apps-list"
import { getAppsData } from "@/lib/apps-data"

export const metadata: Metadata = {
  title: "我的应用 · Astr",
}

export default function AppsPage() {
  const { apps } = getAppsData()

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">我的应用</h1>
        <p className="text-sm text-muted-foreground">
          共 <span className="font-mono">{apps.length}</span> 个应用
        </p>
      </div>

      <AppsList initialApps={apps} />
    </div>
  )
}
