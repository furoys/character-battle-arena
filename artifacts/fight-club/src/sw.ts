/// <reference lib="webworker" />
// Custom service worker — augments the workbox precache (injected at build
// time) with web-push handlers so the creator can be notified when a friend
// accepts their challenge, even with the PWA closed.

import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

// __WB_MANIFEST is injected by VitePWA's `injectManifest` build step. Without
// this call the precache is empty and offline support breaks.
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// ── Push event ───────────────────────────────────────────────────────────────
// We always show *something* so the browser doesn't penalise us for "silent"
// pushes (which can revoke our push permission). The deep-link URL is stored
// in `data.url` for the click handler below.
self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  if (event.data) {
    try { payload = event.data.json() as PushPayload; }
    catch { payload = { title: "A.v.A", body: event.data.text() }; }
  }
  const title = payload.title ?? "A.v.A";
  const body = payload.body ?? "";
  const url = payload.url ?? "/";
  const tag = payload.tag ?? "ava-default";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      data: { url },
      requireInteraction: false,
    }),
  );
});

// ── Notification click ───────────────────────────────────────────────────────
// Focus an existing tab on the deep-link URL if there is one, otherwise open
// a new window. Path-prefixed (BASE_URL) so it works inside the artifact's
// preview path AND inside the production PWA.
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const rawUrl = data?.url ?? "";

  // The server sends *relative* URLs (e.g. "challenge/ABC123?creator=1") so
  // we resolve them against the service worker's scope. The scope is the
  // artifact's BASE_URL — root in production, prefixed under artifact preview.
  const resolved = new URL(rawUrl, self.registration.scope).toString();

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    // Prefer a tab already on our origin — focus it and navigate.
    for (const c of allClients) {
      try {
        const u = new URL(c.url);
        if (u.origin === self.location.origin) {
          await c.focus();
          if ("navigate" in c) {
            try { await c.navigate(resolved); } catch { /* cross-origin/etc */ }
          }
          return;
        }
      } catch { /* ignore bad URLs */ }
    }
    await self.clients.openWindow(resolved);
  })());
});
