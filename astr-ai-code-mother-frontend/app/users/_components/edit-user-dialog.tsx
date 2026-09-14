"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { useUpdateUser } from "@/lib/api/generated"
import type { UserVO } from "@/lib/api/generated/model"
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

function EditUserFields({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserVO
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const updateMutation = useUpdateUser()

  const [userName, setUserName] = React.useState(user.userName ?? "")
  // Empty string is a real, meaningful value here (it clears the field on the
  // backend — see updateUser/BeanUtil.copyProperties) — never coerce it to
  // undefined, or "clear" silently turns into "leave unchanged".
  const [userAvatar, setUserAvatar] = React.useState(user.userAvatar ?? "")
  const [userProfile, setUserProfile] = React.useState(user.userProfile ?? "")
  const [userRole, setUserRole] = React.useState(user.userRole ?? "user")
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const nextNameError = userName.trim() ? null : "请输入昵称"
    setNameError(nextNameError)
    if (nextNameError) return

    try {
      await updateMutation.mutateAsync({
        data: {
          id: user.id,
          userName,
          userAvatar,
          userProfile,
          userRole,
        },
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      setFormError(getErrorMessage(error, "保存失败"))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>编辑用户</DialogTitle>
        <DialogDescription>修改该用户的资料与角色</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>账号</Label>
          <p className="font-mono text-sm text-muted-foreground">{user.userAccount}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userName">昵称</Label>
          <Input
            id="userName"
            value={userName}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "userName-error" : undefined}
            onChange={(e) => setUserName(e.target.value)}
          />
          {nameError && (
            <p id="userName-error" className="text-xs text-destructive">
              {nameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userRole">角色</Label>
          <Select value={userRole} onValueChange={(value) => setUserRole(value ?? "user")}>
            <SelectTrigger id="userRole" className="w-full">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userAvatar">头像链接（可选）</Label>
          <Input
            id="userAvatar"
            value={userAvatar}
            onChange={(e) => setUserAvatar(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userProfile">简介（可选）</Label>
          <Input
            id="userProfile"
            value={userProfile}
            onChange={(e) => setUserProfile(e.target.value)}
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="animate-spin" />}
          保存
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditUserDialog({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserVO | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const open = user !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {user && (
          <EditUserFields key={user.id} user={user} onOpenChange={onOpenChange} onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  )
}
