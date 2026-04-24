import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env["VAPID_PUBLIC_KEY"];
const VAPID_PRIVATE_KEY = process.env["VAPID_PRIVATE_KEY"];
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] ?? "mailto:noreply@anyonevsanyone.replit.app";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("VAPID keys not configured — push notifications disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Send a push notification to every stored subscription for a given challenge
// + role pair. Cleans up subscriptions whose endpoint returns 410 Gone (the
// browser unsubscribed or uninstalled the PWA), so the table doesn't bloat.
export async function sendPushToChallengeRole(
  challengeCode: string,
  role: "creator" | "joiner",
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!ensureConfigured()) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(and(
      eq(pushSubscriptionsTable.challengeCode, challengeCode),
      eq(pushSubscriptionsTable.role, role),
    ));

  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, body);
      sent++;
    } catch (e) {
      failed++;
      const err = e as { statusCode?: number; message?: string };
      // 404 / 410 → endpoint dead, drop it. Anything else: log and keep.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.delete(pushSubscriptionsTable)
          .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
      } else {
        logger.warn({ err: err.message, statusCode: err.statusCode }, "push send failed");
      }
    }
  }));

  // Always log the outcome so we can diagnose silent push failures by reading
  // the deployment logs after the fact.
  logger.info({ challengeCode, role, total: subs.length, sent, failed }, "push send complete");
  return { sent, failed };
}
