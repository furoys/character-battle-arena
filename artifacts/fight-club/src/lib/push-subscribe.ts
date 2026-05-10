// Browser-side push notification subscription helper.
// Asks for permission, registers (via the SW) a PushSubscription with the
// VAPID server key fetched from /api/push/vapid-public-key, then POSTs the
// resulting subscription back to the server tied to a challenge code + token.
//
// Designed to be safe to call from any UI handler — every step that can fail
// (permission denied, no SW, no PushManager, no VAPID) returns null silently
// rather than throwing, so the caller can fall back to in-app polling.

import { resolveApiUrl } from "@/lib/api-fetch";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Synchronous (returns a Promise but with NO awaits before the request) helper
// to ask for notification permission. MUST be called from a click/tap handler
// directly — iOS Safari and Chrome Android suppress the prompt if requested
// after an `await`, because the user-gesture context is lost. Returns the
// resolved permission state, or "unsupported" / "denied" when push isn't
// available. Safe to call when permission is already granted/denied.
export function requestNotificationPermissionFromGesture(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return Promise.resolve("unsupported");
  if (Notification.permission !== "default") {
    return Promise.resolve(Notification.permission);
  }
  try {
    const p = Notification.requestPermission();
    // Some old browsers return undefined and use the callback form; treat as
    // "default" so we don't crash on .then.
    if (p && typeof (p as Promise<NotificationPermission>).then === "function") {
      return (p as Promise<NotificationPermission>).catch(() => "denied" as NotificationPermission);
    }
    return Promise.resolve(Notification.permission);
  } catch {
    return Promise.resolve("denied");
  }
}

async function getReg(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    // Wait briefly for the SW to install the first time the user runs the PWA.
    const reg = await navigator.serviceWorker.ready;
    return reg ?? null;
  } catch {
    return null;
  }
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const r = await fetch(resolveApiUrl("/api/push/vapid-public-key"));
    if (!r.ok) return null;
    const j = await r.json() as { key?: string };
    return j.key ?? null;
  } catch {
    return null;
  }
}

export interface SubscribeForChallengeOpts {
  code: string;
  token: string;
  // If true and permission is "default", we'll prompt the user. If false, we
  // only subscribe when permission is already "granted".
  prompt?: boolean;
}

export async function subscribeForChallenge(opts: SubscribeForChallengeOpts): Promise<boolean> {
  if (!pushSupported()) return false;

  let permission = Notification.permission;
  if (permission === "default" && opts.prompt) {
    try { permission = await Notification.requestPermission(); }
    catch { return false; }
  }
  if (permission !== "granted") return false;

  const reg = await getReg();
  if (!reg || !reg.pushManager) return false;

  const vapid = await fetchVapidKey();
  if (!vapid) return false;

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
    }
  } catch {
    return false;
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;

  try {
    const r = await fetch(resolveApiUrl("/api/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: opts.code, token: opts.token, subscription: json }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
