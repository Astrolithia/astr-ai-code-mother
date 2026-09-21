"use client"

import { listFeaturedAppVOByPage, listMyAppVOByPage } from "@/lib/api/generated"
import { AppListSection } from "@/app/apps/_components/app-list-section"
import { CreateAppForm } from "@/app/apps/_components/create-app-form"

export function AppsHome() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">AI 应用生成</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          用一句话描述你想要的应用，AI 会为你生成可预览、可部署的网站
        </p>
      </div>

      <CreateAppForm />

      <AppListSection
        title="我的应用"
        queryKeyBase="my-apps-list"
        manageable
        emptyMessage="还没有创建应用，在上方输入需求即可开始"
        emptySearchMessage="没有找到匹配的应用"
        searchPlaceholder="按名称搜索我的应用"
        fetchPage={(request, signal) => listMyAppVOByPage(request, { signal })}
      />

      <AppListSection
        title="精选应用"
        queryKeyBase="featured-apps-list"
        manageable={false}
        emptyMessage="暂无精选应用"
        emptySearchMessage="没有找到匹配的应用"
        searchPlaceholder="按名称搜索精选应用"
        fetchPage={(request, signal) => listFeaturedAppVOByPage(request, { signal })}
      />
    </div>
  )
}
