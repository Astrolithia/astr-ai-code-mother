"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useRegisterUser, useUserLogin } from "@/lib/api/generated"
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

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const { user, isLoading: isLoadingUser } = useCurrentUser()
  const setCurrentUser = useSetCurrentUser()
  const registerMutation = useRegisterUser()
  const loginMutation = useUserLogin()

  const [userAccount, setUserAccount] = React.useState("")
  const [userPassword, setUserPassword] = React.useState("")
  const [checkPassword, setCheckPassword] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    userAccount?: string
    userPassword?: string
    checkPassword?: string
  }>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  const isSubmitting = registerMutation.isPending || loginMutation.isPending

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
      checkPassword:
        checkPassword !== userPassword ? "两次输入的密码不一致" : undefined,
    }
    setFieldErrors(errors)
    if (errors.userAccount || errors.userPassword || errors.checkPassword) return

    try {
      await registerMutation.mutateAsync({
        data: { userAccount, userPassword, checkPassword },
      })
    } catch (error) {
      setFormError(getErrorMessage(error, "注册失败，请稍后重试"))
      return
    }

    try {
      // Registration alone doesn't establish a session; log in right away so
      // "success" actually leaves the user signed in, per the login flow.
      const response = await loginMutation.mutateAsync({ data: { userAccount, userPassword } })
      setCurrentUser(response)
      router.push(redirectTo)
    } catch {
      router.push(withRedirectParam("/login", redirectTo))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">注册 Astr</CardTitle>
        <CardDescription>创建账号以开始使用</CardDescription>
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
              autoComplete="new-password"
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkPassword">确认密码</Label>
            <Input
              id="checkPassword"
              type="password"
              autoComplete="new-password"
              value={checkPassword}
              aria-invalid={!!fieldErrors.checkPassword}
              aria-describedby={fieldErrors.checkPassword ? "checkPassword-error" : undefined}
              onChange={(e) => setCheckPassword(e.target.value)}
              placeholder="再次输入密码"
            />
            {fieldErrors.checkPassword && (
              <p id="checkPassword-error" className="text-xs text-destructive">
                {fieldErrors.checkPassword}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            注册
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          已经有账号？{" "}
          <Link
            href={withRedirectParam("/login", redirectTo)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            去登录
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
