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
 * Build a fetch RequestInit with an AbortController that fires after
 * `timeoutMs` milliseconds. Returns the init merged with the signal, and a
 * cleanup function that must be called whether or not the fetch succeeds, so
 * the internal timeout is cleared and the controller is not leaked.
 */
function withTimeout(
  options: RequestInit | undefined,
  timeoutMs: number,
): { init: RequestInit; cleanup: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const cleanup = () => clearTimeout(id);
  const init: RequestInit = { ...(options ?? {}), signal: controller.signal };
  return { init, cleanup };
}

/**
 * Attempt one native fetch, attaching a fresh Bearer token from the auth
 * getter registered by ClerkAuthBridge. Returns the raw Response.
 *
 * Exported so profile.tsx can call it directly with a fresh AbortController.
 */
async function nativeFetchOnce(url: string, options?: RequestInit): Promise<Response> {
  const getter = getAuthTokenGetter();
  // Wait up to 3 s for the token — on Android, getToken() can be slow on
  // first call while Clerk hydrates the session.
  const token = getter ? await Promise.race([
    getter(),
    new Promise<null>((r) => setTimeout(() => r(null), 3000)),
  ]) : null;

  const headers = new Headers(options?.headers);
  if (token && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Strip `credentials` — cookies aren't useful on native and some WebViews
  // emit CORS warnings when credentials are sent cross-origin.
  const { credentials: _stripped, ...rest } = (options ?? {}) as RequestInit & { credentials?: string };
  return fetch(url, { ...rest, headers });
}

/**
 * Fetch wrapper for authenticated API calls.
 *
 * - Web: passes `credentials: "include"` so Clerk session cookies are sent
 *   automatically; any explicitly passed options are merged in.
 * - Native (Capacitor): attaches `Authorization: Bearer <token>` from the
 *   auth token getter wired to Clerk via ClerkAuthBridge. Session cookies are
 *   not sent — Bearer token is the sole auth mechanism for cross-origin calls.
 *   On 401, retries once after a short delay with a fresh token (handles the
 *   window where Clerk is signed-in but getToken() hasn't hydrated yet).
 *
 * A 15-second AbortController timeout prevents the call from hanging forever
 * on Android when the network is flaky or the server is unreachable.
 *
 * Returns the raw Response so callers can check `.ok`, call `.json()`, etc.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = resolveApiUrl(path);

  if (isNativePlatform()) {
    const { init, cleanup } = withTimeout(options, 15_000);
    let res: Response;
    try {
      res = await nativeFetchOnce(url, init);
    } catch (err) {
      cleanup();
      throw err;
    }
    cleanup();

    // Retry once on 401 — Clerk's getToken() on Android can return null/stale
    // on the very first call while the session hydrates; a brief wait + fresh
    // call usually succeeds.
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 600));
      const { init: init2, cleanup: cleanup2 } = withTimeout(options, 15_000);
      try {
        res = await nativeFetchOnce(url, init2);
      } catch (err) {
        cleanup2();
        throw err;
      }
      cleanup2();
    }

    return res;
  }

  // Web: rely on session cookies.
  const { init, cleanup } = withTimeout(options, 15_000);
  try {
    return await fetch(url, { credentials: "include", ...init });
  } finally {
    cleanup();
  }
}
