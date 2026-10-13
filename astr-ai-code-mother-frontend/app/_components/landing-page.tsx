"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, RefreshCw } from "lucide-react"

import { listFeaturedAppVOByPage } from "@/lib/api/generated"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FeaturedCarousel } from "@/app/_components/featured-carousel"

// Each card without a cover runs its generated site live; keep the count modest.
const FEATURED_LIMIT = 12

/** Public landing page. Always dark — see design.md「例外：落地页」. */
export function LandingPage() {
  const featuredQuery = useQuery({
    queryKey: ["landing-featured-apps"],
    queryFn: ({ signal }) => listFeaturedAppVOByPage({ pageNum: 1, pageSize: FEATURED_LIMIT }, { signal }),
  })
  const apps = featuredQuery.data?.data?.records ?? []

  return (
    // Clipped at the viewport, not the padded container, so side cards run off the screen edge.
    <div className="dark flex flex-1 flex-col overflow-x-clip bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-prose">
          <h1 className="text-3xl font-bold">AI 应用生成</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            用一句话描述你想要的应用，AI 会为你生成可预览、可部署的网站
          </p>
          <Button className="mt-6" nativeButton={false} render={<Link href="/apps" />}>
            开始创建
            <ArrowRight />
          </Button>
        </div>

        <section aria-labelledby="featured-apps-heading" className="flex flex-1 flex-col justify-center gap-4">
          <h2 id="featured-apps-heading" className="text-sm text-muted-foreground">
            精选应用
          </h2>
          {featuredQuery.isLoading ? (
            <Skeleton className="mx-auto aspect-3/4 w-56 rounded-2xl sm:w-64 lg:w-72" />
          ) : featuredQuery.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(featuredQuery.error, "精选应用加载失败")}
              </p>
              <Button variant="outline" size="sm" onClick={() => void featuredQuery.refetch()}>
                <RefreshCw />
                重试
              </Button>
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">还没有精选应用，先去创建一个吧</p>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/apps" />}>
                去创建应用
              </Button>
            </div>
          ) : (
            <FeaturedCarousel apps={apps} />
          )}
        </section>
      </div>
    </div>
  )
}
