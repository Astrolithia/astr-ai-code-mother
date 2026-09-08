import Link from "next/link"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getAppsData } from "@/lib/apps-data"

export function AppHeader() {
  const { user } = getAppsData()

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/apps" className="text-base font-medium tracking-tight">
          Astr
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <Link
            href="/apps"
            aria-current="page"
            className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground"
          >
            我的应用
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user.name}</span>
          <Badge variant="secondary">{user.plan}</Badge>
        </div>
      </div>
    </header>
  )
}
