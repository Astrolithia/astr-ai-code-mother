import type { Metadata } from "next"

import { LoginForm } from "@/app/login/_components/login-form"
import { sanitizeRedirectPath } from "@/lib/safe-redirect"

export const metadata: Metadata = {
  title: "登录 · Astr",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <LoginForm redirectTo={sanitizeRedirectPath(params.redirect)} />
    </div>
  )
}
