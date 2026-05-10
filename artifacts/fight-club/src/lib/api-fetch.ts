import { getBaseUrl } from "@workspace/api-client-react";

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
