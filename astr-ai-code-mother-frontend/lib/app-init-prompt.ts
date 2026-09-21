// Hands the just-created app's initial prompt from the create form (on /apps)
// to the chat page (on /apps/[id]) across a client-side navigation, without a
// query param (which would survive refreshes/bookmarks and resend forever).
// The chat page removes the key the moment it reads it, so a Strict Mode
// double-effect or a page refresh both see it gone on the second pass.
const PREFIX = "app-init-prompt:"

export function appInitPromptStorageKey(appId: number | string): string {
  return `${PREFIX}${appId}`
}

export function consumeAppInitPrompt(appId: number | string): string | null {
  try {
    const key = appInitPromptStorageKey(appId)
    const value = sessionStorage.getItem(key)
    if (value !== null) sessionStorage.removeItem(key)
    return value
  } catch {
    return null
  }
}
