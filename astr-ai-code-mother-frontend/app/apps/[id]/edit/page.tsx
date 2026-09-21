import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RouteGuard } from "@/components/auth/route-guard"
import { AppEditForm } from "@/app/apps/_components/app-edit-form"

export const metadata: Metadata = {
  title: "编辑应用 · Astr",
}

export default async function AppEditPage({ params }: PageProps<"/apps/[id]/edit">) {
  const { id } = await params
  // Kept as a string end-to-end — see app/apps/[id]/page.tsx for why.
  if (!/^\d+$/.test(id)) notFound()

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RouteGuard>
        <h1 className="mb-6 text-2xl font-bold">编辑应用</h1>
        <AppEditForm appId={id} />
      </RouteGuard>
    </div>
  )
}
