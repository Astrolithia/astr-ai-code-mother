import type { Metadata } from "next"

import { RouteGuard } from "@/components/auth/route-guard"
import { AppBoard } from "@/app/apps/_components/app-board"

export const metadata: Metadata = {
  title: "应用画板 · Astr",
}

export default function AppBoardPage() {
  return (
    // Fills the viewport under the 3.5rem header, like the chat page.
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <RouteGuard>
        <AppBoard />
      </RouteGuard>
    </div>
  )
}
