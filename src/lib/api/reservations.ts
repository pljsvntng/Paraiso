export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
  method = "POST",
  options?: { signal?: AbortSignal },
): Promise<T> {
  const [pathname, query] = path.split("?");
  const response = await fetch(
    `/api/reservations/${pathname}/${query ? `?${query}` : ""}`,
    {
      ...(data !== undefined
        ? {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        : {}),
      cache: "no-store",
      signal: options?.signal,
    },
  );
  const result = await response.json().catch(() => {
    throw new Error(
      "The server returned an unreadable response. Please try again.",
    );
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session has expired. Sign in again to continue."
        : result?.error || "Something went wrong. Please try again.",
    );
  return result;
}
