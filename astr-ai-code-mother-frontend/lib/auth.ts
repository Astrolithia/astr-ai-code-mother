"use client"

import { useQueryClient } from "@tanstack/react-query"

import { getGetLoginUserQueryKey, useGetLoginUser } from "@/lib/api/generated"
import type { BaseResponseLoginUserVO, LoginUserVO } from "@/lib/api/generated/model"
import { ApiError, BUSINESS_ERROR_CODE } from "@/lib/api/mutator/custom-fetch"

export const CURRENT_USER_QUERY_KEY = getGetLoginUserQueryKey()

/** Current session's user, backed by GET /user/get/login. */
export function useCurrentUser() {
  const query = useGetLoginUser({
    query: {
      retry: false,
      staleTime: 60 * 1000,
    },
  })

  const notLoggedIn =
    query.error instanceof ApiError &&
    (query.error.body as { code?: number } | undefined)?.code ===
      BUSINESS_ERROR_CODE.NOT_LOGIN

  return {
    user: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError && !notLoggedIn,
    notLoggedIn,
    error: query.error,
    refetch: query.refetch,
  }
}

export function isAdmin(user?: LoginUserVO | null): boolean {
  return user?.userRole === "admin"
}

/**
 * Synchronously seeds the current-user cache with a fresh login/register
 * response, so every consumer (header, route guards, redirect-if-logged-in
 * checks) sees the new session immediately — no gap where a stale cached
 * value, or a "loading" flicker from a background refetch, could cause a
 * bounce back to /login.
 */
export function useSetCurrentUser() {
  const queryClient = useQueryClient()
  return (response: BaseResponseLoginUserVO) => {
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, response)
  }
}

/**
 * Synchronously drops the current-user cache after logout. Removing (not
 * just invalidating) matters: invalidate leaves the old "logged in" data in
 * place until the background refetch resolves, and code that runs
 * immediately after navigating to /login (e.g. the "already logged in,
 * bounce away" effect) would still see that stale user and redirect straight
 * back out.
 */
export function useClearCurrentUser() {
  const queryClient = useQueryClient()
  return () => queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
}
