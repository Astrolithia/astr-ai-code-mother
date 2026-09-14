"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Users } from "lucide-react";

import { useUserLogout } from "@/lib/api/generated";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/mutator/custom-fetch";
import { isAdmin, useClearCurrentUser, useCurrentUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  user: "普通用户",
};

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2 py-2 text-sm font-medium transition-colors sm:px-3 ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export function AppHeader() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const clearCurrentUser = useClearCurrentUser();
  const logoutMutation = useUserLogout();
  const [logoutError, setLogoutError] = React.useState<string | null>(null);

  function handleLogout() {
    setLogoutError(null);
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearCurrentUser();
        router.push("/login");
      },
      onError: (error) => {
        setLogoutError(getErrorMessage(error, "退出登录失败，请重试"));
      },
    });
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/apps" className="text-base font-medium tracking-tight">
          Astr
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <NavLink href="/apps">我的应用</NavLink>
          {isAdmin(user) && <NavLink href="/users">用户管理</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="size-8 rounded-lg" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="gap-2 px-1.5"
                    aria-label={`${user.userName ?? user.userAccount} 账号菜单`}
                  />
                }
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {(user.userName ?? user.userAccount ?? "?").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.userName || user.userAccount}
                </span>
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {ROLE_LABEL[user.userRole ?? ""] ?? user.userRole}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/*
                  Plain caption, not Base UI's DropdownMenuLabel/Group: this
                  account name isn't an accessible label for the items below
                  it (they're unrelated actions, not "this account's items"),
                  it's just an informational heading. Styled to match
                  DropdownMenuLabel exactly.
                */}
                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                  {user.userAccount}
                </div>
                {isAdmin(user) && (
                  <DropdownMenuItem render={<Link href="/users" />}>
                    <Users />
                    用户管理
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={logoutMutation.isPending}
                  onClick={handleLogout}
                >
                  <LogOut />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              登录
            </Button>
          )}
        </div>
      </div>

      {logoutError && (
        <div className="border-t border-border bg-destructive/10 px-4 py-2 sm:px-6 lg:px-8">
          <p
            role="alert"
            className="mx-auto max-w-screen-2xl text-xs text-destructive"
          >
            {logoutError}
          </p>
        </div>
      )}
    </header>
  );
}
