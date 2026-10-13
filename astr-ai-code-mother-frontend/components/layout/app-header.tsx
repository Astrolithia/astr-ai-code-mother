"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, LayoutGrid, LogOut, Menu, MessagesSquare, Users } from "lucide-react";

import { useUserLogout } from "@/lib/api/generated";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import styles from "./app-header.module.css";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  user: "普通用户",
};

function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={styles.menuLink}
    >
      {children}
    </Link>
  );
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
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

  const admin = isAdmin(user);
  const navigationLinks = [
    { href: "/apps", label: "我的应用", exact: true },
    { href: "/apps/board", label: "应用画板", exact: false },
    ...(admin
      ? [
          { href: "/apps/manage", label: "应用管理", exact: false },
          { href: "/chat-history/manage", label: "对话管理", exact: false },
          { href: "/users", label: "用户管理", exact: false },
        ]
      : []),
  ];

  return (
    <header
      className={`${styles.shell} ${pathname === "/" ? "dark bg-background text-foreground" : ""}`}
    >
      <div className={styles.navigation} data-admin={admin}>
        <Link href="/" className={styles.brand} aria-label="Astr 首页">
          <svg
            className={styles.brandMark}
            viewBox="0 0 46 46"
            fill="none"
            aria-hidden="true"
          >
            {Array.from({ length: 7 }, (_, i) => (
              <path
                key={i}
                d="M22.5499 1.63159V22.5"
                stroke="currentColor"
                strokeWidth="5"
                transform={`rotate(${(i * 360) / 7} 22.5499 22.5)`}
              />
            ))}
          </svg>
          <span className={styles.brandLabel}>Astr</span>
        </Link>

        <div className={styles.actions}>
          <nav className={styles.desktopNavigation} aria-label="主导航">
            {navigationLinks.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className={styles.mobileTrigger}
                  aria-label="打开导航菜单"
                />
              }
            >
              <Menu size={20} className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={12} className={styles.menuPanel}>
              {navigationLinks.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={
                      <Link href={item.href} aria-current={active ? "page" : undefined} />
                    }
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className={styles.accountSlot} aria-busy={isLoading}>
            {isLoading ? (
              <Skeleton className={styles.accountSkeleton} aria-label="正在加载账号" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className={styles.accountButton}
                      aria-label={`${user.userName || user.userAccount} 账号菜单`}
                    />
                  }
                >
                  <span className={styles.actionLabel}>
                    {user.userName || user.userAccount}
                  </span>
                  <ArrowRight size={20} className={`${styles.actionArrow} size-5`} aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className={styles.menuPanel}>
                  {/* Informational account caption, not a label for menu actions. */}
                  <div className={styles.accountCaption}>
                    <Avatar size="sm">
                      <AvatarFallback>
                        {(user.userName || user.userAccount || "?").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={styles.accountDetails}>
                      <p className={styles.accountName}>{user.userName || user.userAccount}</p>
                      <p className={styles.accountMeta}>
                        {user.userAccount} · {ROLE_LABEL[user.userRole ?? ""] ?? user.userRole}
                      </p>
                    </div>
                  </div>
                  {admin && (
                    <>
                      <DropdownMenuItem render={<Link href="/apps/manage" />}>
                        <LayoutGrid size={16} />
                        应用管理
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/chat-history/manage" />}>
                        <MessagesSquare size={16} />
                        对话管理
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/users" />}>
                        <Users size={16} />
                        用户管理
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={logoutMutation.isPending}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className={styles.accountButton}
                role="link"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                <span className={styles.actionLabel}>登录</span>
                <ArrowRight size={20} className={`${styles.actionArrow} size-5`} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {logoutError && (
        <div className={`${styles.logoutError} rounded-lg border border-border bg-background px-4 py-2`}>
          <p role="alert" className="text-xs text-destructive">
            {logoutError}
          </p>
        </div>
      )}
    </header>
  );
}
