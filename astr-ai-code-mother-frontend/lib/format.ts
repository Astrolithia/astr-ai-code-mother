export function formatVisits(visits: number): string {
  return visits.toLocaleString("en-US")
}

// Slices the ISO timestamp directly instead of using Date/Intl formatting so
// server and client render the exact same string regardless of timezone.
export function formatDateTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ")
}
