"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Blocks, Menu } from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import data from "@/evals/scenario-01-app-list/data.json"

const NAV_ITEMS = [
  { label: "我的应用", href: "/apps" },
  { label: "模板市场", href: "/templates" },
  { label: "文档", href: "/docs" },
]

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase()
}

export function AppHeader() {
  const pathname = usePathname()
  const user = data.user

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Blocks className="size-5" />
          <span className="font-heading text-base font-semibold">Astr</span>
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {NAV_ITEMS.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  active={pathname.startsWith(item.href)}
                  className={navigationMenuTriggerStyle()}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar size="sm">
              <AvatarFallback>{getInitial(user.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
          </div>

          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
            >
              <Menu />
              <span className="sr-only">打开菜单</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="px-4 pt-4">菜单</SheetTitle>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <SheetClose
                    key={item.href}
                    render={<Link href={item.href} />}
                    className="rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {item.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-2 border-t p-4">
                <Avatar size="sm">
                  <AvatarFallback>{getInitial(user.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
