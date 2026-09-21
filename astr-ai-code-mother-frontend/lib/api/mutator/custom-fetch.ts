export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8123/api";
const BASE_URL = API_BASE_URL;

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
// Backend wraps every controller response in this shape (see BaseResponse.java),
// except a handful of endpoints that return a raw primitive (e.g. POST /user/save).
interface BusinessEnvelope {
  code?: unknown;
  message?: unknown;
}

function isBusinessError(data: unknown): data is BusinessEnvelope & { code: number } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as BusinessEnvelope).code === "number" &&
    (data as BusinessEnvelope).code !== 0
  );
}

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

  // Business failures (e.g. not logged in, no permission, validation) come back
  // as HTTP 200 with a non-zero `code`, per BaseResponse/GlobalExceptionHandler.
  if (isBusinessError(data)) {
    throw new ApiError(response.status, data);
  }

  return data as T;
};

export default customFetch;

// Consumed by orval's generated react-query hooks for typing.
export type ErrorType<Error> = ApiError<Error>;
export type BodyType<BodyData> = BodyData;

/** Backend error codes from ErrorCode.java that the UI treats specially. */
export const BUSINESS_ERROR_CODE = {
  PARAMS_ERROR: 40000,
  NOT_LOGIN: 40100,
  NO_AUTH: 40101,
  NOT_FOUND: 40400,
} as const;

/** Extracts a user-facing message from any error thrown by customFetch. */
export function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试"): string {
  if (error instanceof ApiError) {
    const body = error.body as BusinessEnvelope | undefined;
    if (typeof body?.message === "string" && body.message) {
      return body.message;
    }
    return fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
