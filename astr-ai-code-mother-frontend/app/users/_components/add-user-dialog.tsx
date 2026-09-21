"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { useAddUser } from "@/lib/api/generated"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch"

const ROLE_OPTIONS = [
  { value: "user", label: "普通用户" },
  { value: "admin", label: "管理员" },
]

function AddUserFields({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const addMutation = useAddUser()

  const [userAccount, setUserAccount] = React.useState("")
  const [userName, setUserName] = React.useState("")
  const [userRole, setUserRole] = React.useState("user")
  const [accountError, setAccountError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const nextAccountError = userAccount.trim() ? null : "请输入账号"
    setAccountError(nextAccountError)
    if (nextAccountError) return

    try {
      await addMutation.mutateAsync({
        data: {
          userAccount: userAccount.trim(),
          userName: userName.trim() || undefined,
          userRole,
        },
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      setFormError(getErrorMessage(error, "创建失败"))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>添加用户</DialogTitle>
        <DialogDescription>新用户的初始密码为 12345678，登录后可自行修改</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-userAccount">账号</Label>
          <Input
            id="add-userAccount"
            value={userAccount}
            aria-invalid={!!accountError}
            aria-describedby={accountError ? "add-userAccount-error" : undefined}
            onChange={(e) => setUserAccount(e.target.value)}
          />
          {accountError && (
            <p id="add-userAccount-error" className="text-xs text-destructive">
              {accountError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-userName">昵称（可选）</Label>
          <Input
            id="add-userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-userRole">角色</Label>
          <Select value={userRole} onValueChange={(value) => setUserRole(value ?? "user")}>
            <SelectTrigger id="add-userRole" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending && <Loader2 className="animate-spin" />}
          创建
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <AddUserFields key={open ? "open" : "closed"} onOpenChange={onOpenChange} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  )
}
