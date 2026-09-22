import type { Metadata } from "next"

import { RouteGuard } from "@/components/auth/route-guard"
import { ChatHistoryManageTable } from "@/app/chat-history/_components/chat-history-manage-table"

export const metadata: Metadata = {
  title: "对话历史管理 · Astr",
}

export default function ChatHistoryManagePage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RouteGuard adminOnly>
        <ChatHistoryManageTable />
      </RouteGuard>
    </div>
  )
}
