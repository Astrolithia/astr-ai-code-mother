const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8123/api";

export class ApiError<T = unknown> extends Error {
  status: number;
  body: T;

  constructor(status: number, body: T) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Orval calls this instead of the global `fetch` for every generated request
 * (wired up via `override.mutator` in orval.config.ts). Centralizes base URL,
 * credentials and error handling so generated hooks stay pure data-fetching.
 */
export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    // backend uses cookie-based session auth (Spring Session)
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const hasBody = !([204, 205, 304].includes(response.status)) && response.body;
  const data = hasBody ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
};

export default customFetch;

// Consumed by orval's generated react-query hooks for typing.
export type ErrorType<Error> = ApiError<Error>;
export type BodyType<BodyData> = BodyData;
