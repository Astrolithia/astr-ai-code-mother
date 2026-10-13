"use client"

import { cn } from "cn"

import { Orb } from "@/components/orb"

/** The same Working orb as thinkingorbs.com, tinted by the current theme. */
export function PreviewLoading({
  message,
  className,
}: {
  message: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="preview-loading"
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-12 text-center",
        className,
      )}
    >
      <Orb state="working" size={96} className="shrink-0 text-foreground" />
      <p className="max-w-prose text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
