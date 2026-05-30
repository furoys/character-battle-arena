// Smart "Rate us on Google Play" gating + trigger.
//
// The live Play listing is a TWA (app.replit.anyonevsanyone.twa) that loads the
// production website inside a Chrome WebView, so there is NO native in-app
// review bridge available to JavaScript. Instead we surface a custom, on-brand
// prompt at genuine high-satisfaction moments and deep-link to the Play Store
// listing. All timing/frequency state lives in localStorage so we never nag:
//   - never on first visit (generic moments must accumulate first)
//   - a perfect daily run always qualifies (rare peak moment)
//   - at most once per page session
//   - "Maybe later" snoozes for several days
//   - after a few dismissals, or once they rate / decline, we stop forever
//
// This works identically in the TWA, mobile browsers, and desktop — no native
// rebuild or Capacitor plugin required.

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.replit.anyonevsanyone.twa";

export const RATE_PROMPT_EVENT = "ava:show-rate-prompt";

const STORAGE_KEY = "ava:ratePrompt";

// Tunables.
const GOOD_MOMENTS_BEFORE_ASK = 3; // generic delight moments before first ask
const MAX_DISMISSALS = 3; // after this many "maybe later"s, stop asking
const SNOOZE_MS = 5 * 24 * 60 * 60 * 1000; // "Maybe later" → wait 5 days
const SHOW_DELAY_MS = 1400; // let the user savor the moment before we ask

type Status = "pending" | "rated" | "never";

interface RateState {
  status: Status;
  goodMoments: number;
  dismissals: number;
  snoozeUntil: number; // epoch ms; 0 = none
  lastShownAt: number;
  lastPerfectDate: string; // YYYY-MM-DD of the last perfect-day we counted
}

const DEFAULT_STATE: RateState = {
  status: "pending",
  goodMoments: 0,
  dismissals: 0,
  snoozeUntil: 0,
  lastShownAt: 0,
  lastPerfectDate: "",
};

// Once we've fired the prompt this page session we don't fire again, even if
// more good moments roll in.
let shownThisSession = false;

function readState(): RateState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<RateState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(state: RateState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage full — fail silent */
  }
}

export type GoodMoment = "perfect-day" | "fight-finished";

// Called from delight moments. Decides — purely client-side — whether now is a
// good, non-naggy time to surface the rating prompt and, if so, dispatches the
// window event the <RatePrompt/> overlay listens for.
export function signalGoodMoment(reason: GoodMoment): void {
  if (typeof window === "undefined") return;
  if (shownThisSession) return;

  const state = readState();
  if (state.status !== "pending") return;

  // A perfect day stays "true" across navigations/remounts all day, so dedupe
  // it per calendar day — otherwise revisiting the Daily page would re-count it.
  if (reason === "perfect-day") {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastPerfectDate === today) return;
    state.lastPerfectDate = today;
  }

  state.goodMoments += 1;

  const now = Date.now();
  // A perfect day is a rare, peak moment — it always qualifies. Generic fight
  // completions must accumulate so brand-new users aren't asked on arrival.
  const qualifies =
    reason === "perfect-day" || state.goodMoments >= GOOD_MOMENTS_BEFORE_ASK;
  const snoozed = state.snoozeUntil > now;

  writeState(state);

  if (!qualifies || snoozed) return;

  shownThisSession = true;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(RATE_PROMPT_EVENT));
  }, SHOW_DELAY_MS);
}

// User tapped "Rate on Google Play" — never ask again, then open the listing.
export function recordRated(): void {
  const state = readState();
  state.status = "rated";
  state.lastShownAt = Date.now();
  writeState(state);
  openPlayStore();
}

// User tapped "Maybe later" / dismissed — snooze and, after enough nudges, stop.
export function recordSnooze(): void {
  const state = readState();
  state.dismissals += 1;
  state.snoozeUntil = Date.now() + SNOOZE_MS;
  state.lastShownAt = Date.now();
  if (state.dismissals >= MAX_DISMISSALS) state.status = "never";
  writeState(state);
}

// User tapped "No thanks" — never ask again.
export function recordNever(): void {
  const state = readState();
  state.status = "never";
  state.lastShownAt = Date.now();
  writeState(state);
}

function openPlayStore(): void {
  try {
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  } catch {
    try {
      location.href = PLAY_STORE_URL;
    } catch {
      /* nothing more we can do */
    }
  }
}
