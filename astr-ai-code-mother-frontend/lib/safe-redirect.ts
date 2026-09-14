const DEFAULT_REDIRECT = "/apps"

/**
 * Validates a user-supplied `redirect` value (from a query string) down to a
 * same-origin, in-app path. Used by /login and /register so the post-auth
 * destination can't be hijacked to an external site.
 *
 * Rejects:
 * - anything containing a backslash — browsers/URL parsers treat `\` as an
 *   alternative path/authority separator for special schemes (http/https),
 *   so `/\evil.example` can resolve exactly like `//evil.example`.
 * - protocol-relative URLs (`//evil.example`).
 * - anything that, once resolved against a fixed internal origin, doesn't
 *   round-trip to that same origin (catches embedded scheme/host tricks the
 *   two checks above might miss).
 */
export function sanitizeRedirectPath(
  value: string | string[] | undefined | null,
  fallback: string = DEFAULT_REDIRECT,
): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate) return fallback
  if (candidate.includes("\\")) return fallback
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback

  try {
    const base = "http://internal.invalid"
    const resolved = new URL(candidate, base)
    if (resolved.origin !== base) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback
  } catch {
    return fallback
  }
}

/** Appends a validated `redirect` param to an in-app auth link, when set. */
export function withRedirectParam(path: string, redirectTo: string): string {
  const sanitized = sanitizeRedirectPath(redirectTo)
  if (sanitized === DEFAULT_REDIRECT) return path
  return `${path}?redirect=${encodeURIComponent(sanitized)}`
}
