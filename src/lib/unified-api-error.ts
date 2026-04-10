/**
 * Structured errors from unified API `fetch` calls (status, optional `code`, e.g. LIMIT_REACHED).
 */
export class UnifiedAPIError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    payload: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "UnifiedAPIError";
    this.status = status;
    this.payload = payload;
    const c = payload.code;
    if (typeof c === "string") this.code = c;
  }

  static fromResponse(status: number, body: unknown): UnifiedAPIError {
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : { error: String(body) };
    const msg = String(
      payload.message ?? payload.error ?? `Request failed (${status})`,
    );
    return new UnifiedAPIError(msg, status, payload);
  }
}

export function isUnifiedAPIError(e: unknown): e is UnifiedAPIError {
  return e instanceof UnifiedAPIError;
}

export function isLikelyNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && /network|fetch|load failed/i.test(e.message))
  );
}
