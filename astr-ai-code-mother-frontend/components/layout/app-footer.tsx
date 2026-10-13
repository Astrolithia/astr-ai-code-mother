"use client"

import { usePathname } from "next/navigation"

export function AppFooter() {
  const pathname = usePathname()
  return (
    // The landing page is always dark (design.md「例外：落地页」); match it.
    <footer className={`border-t border-border ${pathname === "/" ? "dark bg-background text-foreground" : ""}`}>
      <div className="mx-auto max-w-screen-2xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Astr. All rights reserved.
      </div>
    </footer>
  )
}
