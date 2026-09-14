import type { Metadata } from "next"

import { RegisterForm } from "@/app/register/_components/register-form"
import { sanitizeRedirectPath } from "@/lib/safe-redirect"

export const metadata: Metadata = {
  title: "注册 · Astr",
}

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <RegisterForm redirectTo={sanitizeRedirectPath(params.redirect)} />
    </div>
  )
}
