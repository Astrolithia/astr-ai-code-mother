import { notFound } from "next/navigation"

import { RouteGuard } from "@/components/auth/route-guard"
import { AppChatPage } from "@/app/apps/_components/app-chat-page"

export default async function AppDetailPage({ params }: PageProps<"/apps/[id]">) {
  const { id } = await params
  // Kept as a string end-to-end: these are snowflake ids (e.g.
  // 459547437171974144), which exceed Number.MAX_SAFE_INTEGER — converting
  // with Number() silently corrupts the id.
  if (!/^\d+$/.test(id)) notFound()

  return (
    <RouteGuard>
      <AppChatPage appId={id} />
    </RouteGuard>
  )
}
