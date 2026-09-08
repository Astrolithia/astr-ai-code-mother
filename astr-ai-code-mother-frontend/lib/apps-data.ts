import raw from "@/evals/scenario-01-app-list/data.json"

export type AppStatus = "deployed" | "generating" | "failed" | "draft"

export interface AppItem {
  id: string
  name: string
  description: string
  status: AppStatus
  deployUrl: string | null
  visits: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface CurrentUser {
  name: string
  plan: string
}

export interface AppsData {
  user: CurrentUser
  apps: AppItem[]
}

const appsData = raw as AppsData

export function getAppsData(): AppsData {
  return appsData
}
