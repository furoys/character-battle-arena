import { getBaseUrl, getAuthTokenGetter } from "@workspace/api-client-react";

/**
 * Returns true when running inside a Capacitor native build (Android/iOS).
 * On native, relative URLs resolve to localhost which has no server, and
 * session cookies are not sent across origins — Bearer token auth is used
 * instead.
 */
export function isNativePlatform(): boolean {
  return !!getBaseUrl();
}

/**
 * Resolve an API path to an absolute URL when a base URL has been configured
 * (i.e. Capacitor native builds), or return it unchanged for web (where
 * relative paths work because the app and API share the same origin).
 */
export function resolveApiUrl(path: string): string {
  const base = getBaseUrl();
  if (base && path.startsWith("/")) return `${base}${path}`;
  return path;
}

/**
 * Return the app's public origin — the configured production URL on native
 * Capacitor builds, or window.location.origin on web.
 */
export function getAppOrigin(): string {
  const base = getBaseUrl();
  if (base) return base;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * Fetch wrapper for authenticated API calls.
 *
 * - Web: passes `credentials: "include"` so Clerk session cookies are sent
 *   automatically; any explicitly passed options are merged in.
 * - Native (Capacitor): attaches `Authorization: Bearer <token>` from the
 *   auth token getter wired to Clerk via ClerkAuthBridge. Session cookies are
 *   not sent — Bearer token is the sole auth mechanism for cross-origin calls.
 *
 * Returns the raw Response so callers can check `.ok`, call `.json()`, etc.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = resolveApiUrl(path);

  if (isNativePlatform()) {
    const getter = getAuthTokenGetter();
    const token = getter ? await getter() : null;
    const headers = new Headers(options?.headers);
    if (token && !headers.has("authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Strip `credentials` — cookies aren't useful on native and some WebViews
    // emit CORS warnings when credentials are sent cross-origin.
    const { credentials: _stripped, ...rest } = (options ?? {}) as RequestInit & { credentials?: string };
    return fetch(url, { ...rest, headers });
  }

  // Web: rely on session cookies.
  return fetch(url, { credentials: "include", ...options });
}
