"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useUserLogin } from "@/lib/api/generated"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"
import { useCurrentUser, useSetCurrentUser } from "@/lib/auth"
import { withRedirectParam } from "@/lib/safe-redirect"
import { validateAccount, validatePassword } from "@/lib/validation"

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const { user, isLoading: isLoadingUser } = useCurrentUser()
  const setCurrentUser = useSetCurrentUser()
  const loginMutation = useUserLogin()

  const [userAccount, setUserAccount] = React.useState("")
  const [userPassword, setUserPassword] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    userAccount?: string
    userPassword?: string
  }>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isLoadingUser && user) {
      router.replace(redirectTo)
    }
  }, [isLoadingUser, user, redirectTo, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const errors = {
      userAccount: validateAccount(userAccount),
      userPassword: validatePassword(userPassword),
    }
    setFieldErrors(errors)
    if (errors.userAccount || errors.userPassword) return

    try {
      const response = await loginMutation.mutateAsync({ data: { userAccount, userPassword } })
      setCurrentUser(response)
      router.push(redirectTo)
    } catch (error) {
      setFormError(getErrorMessage(error, "登录失败，请检查账号密码"))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">登录 Astr</CardTitle>
        <CardDescription>使用账号密码登录以继续</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="userAccount">账号</Label>
            <Input
              id="userAccount"
              autoComplete="username"
              value={userAccount}
              aria-invalid={!!fieldErrors.userAccount}
              aria-describedby={fieldErrors.userAccount ? "userAccount-error" : undefined}
              onChange={(e) => setUserAccount(e.target.value)}
              placeholder="至少 4 个字符"
            />
            {fieldErrors.userAccount && (
              <p id="userAccount-error" className="text-xs text-destructive">
                {fieldErrors.userAccount}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="userPassword">密码</Label>
            <Input
              id="userPassword"
              type="password"
              autoComplete="current-password"
              value={userPassword}
              aria-invalid={!!fieldErrors.userPassword}
              aria-describedby={fieldErrors.userPassword ? "userPassword-error" : undefined}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="至少 8 个字符"
            />
            {fieldErrors.userPassword && (
              <p id="userPassword-error" className="text-xs text-destructive">
                {fieldErrors.userPassword}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="mt-1 w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending && <Loader2 className="animate-spin" />}
            登录
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link
            href={withRedirectParam("/register", redirectTo)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            去注册
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
