"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { LayoutList, Minus, Plus, RefreshCw, Search } from "lucide-react"

import { listMyAppVOByPage } from "@/lib/api/generated"
import type { AppVO } from "@/lib/api/generated/model"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { BoardCanvas, layoutBoard, type BoardCanvasHandle } from "@/app/apps/_components/board-canvas"

// The backend caps a page at 20. Each tile without a cover runs its site
// live, so the board stops at a few pages.
const PAGE_SIZE = 20
const BOARD_LIMIT = 60
const SEARCH_DEBOUNCE_MS = 300
const AURORA_MS = 2400

// Floating controls over the canvas (design.md「例外：应用画板」).
const PILL = "pointer-events-auto flex items-center rounded-full bg-foreground/60 text-background backdrop-blur-md"
const PILL_BUTTON = "text-background hover:bg-background/20 hover:text-background"

async function fetchBoardApps(signal: AbortSignal) {
  const apps: AppVO[] = []
  let total = 0
  for (let pageNum = 1; apps.length < BOARD_LIMIT; pageNum++) {
    const response = await listMyAppVOByPage({ pageNum, pageSize: PAGE_SIZE }, { signal })
    const records = response.data?.records ?? []
    total = response.data?.totalRow ?? apps.length + records.length
    apps.push(...records)
    if (records.length < PAGE_SIZE || apps.length >= total) break
  }
  return { apps: apps.slice(0, BOARD_LIMIT), total }
}

const subscribeNothing = () => () => {}
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform)

/** One sweep of soft colour across the board, played after each search. */
function Aurora({ playKey }: { playKey: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el || playKey === 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const animation = el.animate(
      [
        { opacity: 0, transform: "translateX(-25%)" },
        { opacity: 1, offset: 0.4 },
        { opacity: 0, transform: "translateX(25%)" },
      ],
      { duration: AURORA_MS, easing: "ease-in-out" },
    )
    return () => animation.cancel()
  }, [playKey])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute -inset-x-1/4 inset-y-0 opacity-0 mix-blend-multiply dark:mix-blend-screen"
    >
      <div className="absolute top-0 left-1/10 size-3/5 rounded-full bg-radial from-lime-300 to-transparent to-70% blur-3xl" />
      <div className="absolute top-1/4 left-7/20 size-3/5 rounded-full bg-radial from-sky-300 to-transparent to-70% blur-3xl" />
      <div className="absolute top-0 left-11/20 size-3/5 rounded-full bg-radial from-violet-400 to-transparent to-70% blur-3xl" />
      <div className="absolute bottom-0 left-9/20 size-3/5 rounded-full bg-radial from-pink-300 to-transparent to-70% blur-3xl" />
    </div>
  )
}

export function AppBoard() {
  const boardQuery = useQuery({
    queryKey: ["app-board"],
    queryFn: ({ signal }) => fetchBoardApps(signal),
  })
  const apps = boardQuery.data?.apps
  const tiles = React.useMemo(() => layoutBoard(apps ?? []), [apps])

  const canvasRef = React.useRef<BoardCanvasHandle>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [scale, setScale] = React.useState(1)
  const [query, setQuery] = React.useState("")
  const [term, setTerm] = React.useState("")
  const [auroraKey, setAuroraKey] = React.useState(0)
  const mac = React.useSyncExternalStore(subscribeNothing, isMac, () => false)

  // Debounced so the aurora plays once per search, not once per keystroke.
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim().toLowerCase()
      setTerm(next)
      if (next) setAuroraKey((k) => k + 1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  const matches = React.useMemo(() => {
    if (!term) return null
    return new Set(
      (apps ?? [])
        .filter((app) => `${app.appName ?? ""} ${app.initPrompt ?? ""}`.toLowerCase().includes(term))
        .map((app) => String(app.id)),
    )
  }, [apps, term])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && matches && matches.size > 0) {
      event.preventDefault()
      canvasRef.current?.fit([...matches])
    } else if (event.key === "Escape") {
      setQuery("")
      event.currentTarget.blur()
    }
  }

  const total = boardQuery.data?.total ?? 0
  // Search and zoom only exist when there's a canvas to act on.
  const hasBoard = tiles.length > 0

  return (
    <div className="relative flex-1 overflow-hidden">
      {boardQuery.isLoading ? (
        <Skeleton className="size-full rounded-none" />
      ) : boardQuery.isError ? (
        <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted">
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(boardQuery.error, "应用加载失败")}
          </p>
          <Button variant="outline" size="sm" onClick={() => void boardQuery.refetch()}>
            <RefreshCw />
            重试
          </Button>
        </div>
      ) : tiles.length === 0 ? (
        <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted">
          <p className="text-sm text-muted-foreground">还没有应用，创建第一个后会出现在画板上</p>
          <Button size="sm" nativeButton={false} render={<Link href="/apps" />}>
            <Plus />
            新建应用
          </Button>
        </div>
      ) : (
        <BoardCanvas ref={canvasRef} tiles={tiles} matches={matches} onZoomChange={setScale} />
      )}

      <Aurora playKey={auroraKey} />

      {/* Floating controls. The wrapper ignores the pointer so canvas drags
          pass between pills; flex-1 sides keep the middle pill centred. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 p-4">
        {/* Below sm the search drops to its own full-width row. */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex flex-1">
            <h1 className={`${PILL} h-9 shrink-0 gap-2 px-4 text-sm font-medium`}>
              我的应用画板
              {total > 0 && <span className="font-mono text-background/80">{total}</span>}
            </h1>
          </div>

          {hasBoard && (
            <div className={`${PILL} order-last h-9 w-full gap-2 px-3 sm:order-none sm:max-w-md`}>
              <Search className="shrink-0" size={16} />
              <Input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索应用名称或需求"
                aria-label="搜索应用，回车定位到匹配项"
                className="h-8 border-0 bg-transparent px-0 text-sm text-background shadow-none placeholder:text-background/70 focus-visible:ring-0 dark:bg-transparent"
              />
              {matches ? (
                <span aria-live="polite" className="shrink-0 font-mono text-xs text-background/80">
                  {matches.size > 0 ? `${matches.size} 个匹配` : "无匹配"}
                </span>
              ) : (
                <kbd className="hidden shrink-0 font-mono text-xs text-background/70 sm:inline">
                  {mac ? "⌘K" : "Ctrl K"}
                </kbd>
              )}
            </div>
          )}

          <div className="flex flex-1 justify-end">
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/apps" />}
              aria-label="列表视图"
              className={`${PILL} ${PILL_BUTTON} h-9 shrink-0 px-4`}
            >
              <LayoutList />
              <span className="hidden sm:inline">列表视图</span>
            </Button>
          </div>
        </div>

        {hasBoard && (
          <div className="flex items-end gap-3">
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/apps" />}
              className={`${PILL} ${PILL_BUTTON} h-9 px-4`}
            >
              <Plus />
              新建应用
            </Button>
            <div className="flex flex-1 justify-end">
              <div className={`${PILL} h-9 gap-1 px-1`}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="缩小"
                  className={`${PILL_BUTTON} rounded-full`}
                  onClick={() => canvasRef.current?.zoomBy(0.8)}
                >
                  <Minus />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`适应画布，当前缩放 ${Math.round(scale * 100)}%`}
                  className={`${PILL_BUTTON} rounded-full px-2 font-mono`}
                  onClick={() => canvasRef.current?.fit()}
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="放大"
                  className={`${PILL_BUTTON} rounded-full`}
                  onClick={() => canvasRef.current?.zoomBy(1.25)}
                >
                  <Plus />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
