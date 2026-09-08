import { AppsGrid, type AppRecord } from "@/app/apps/_components/apps-grid"
import data from "@/evals/scenario-01-app-list/data.json"

const apps = data.apps as AppRecord[]

export default function AppsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">我的应用</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理你创建的所有应用，共 {apps.length} 个
        </p>
      </div>
      <AppsGrid initialApps={apps} />
    </div>
  )
}
