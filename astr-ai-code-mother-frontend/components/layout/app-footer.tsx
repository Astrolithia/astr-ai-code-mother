export function AppFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Astr. All rights reserved.
      </div>
    </footer>
  )
}
