import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useAuth, useClerk, RedirectToSignIn } from "@clerk/react";
import { Capacitor } from "@capacitor/core";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AgeGate } from "@/components/age-gate";
import { IntroSequence } from "@/components/intro-sequence";
import { RotatePrompt } from "@/components/rotate-prompt";
import { RatePrompt } from "@/components/rate-prompt";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { MusicProvider } from "@/contexts/music-context";
import { useAgeMode } from "@/hooks/use-age-mode";

// Pages
import { Home } from "@/pages/home";
import { Roster } from "@/pages/roster";
import { NewCharacter } from "@/pages/new-character";
import { Fights } from "@/pages/fights";
import { Admin } from "@/pages/admin";
import { Daily } from "@/pages/daily";
import { Tournaments } from "@/pages/tournaments";
import { Challenge } from "@/pages/challenge";
import { Profile } from "@/pages/profile";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { Privacy } from "@/pages/privacy";
import { Terms } from "@/pages/terms";
import { Marketing } from "@/pages/marketing";
import NotFound from "@/pages/not-found";

// Evaluated once at module load — Capacitor's isNativePlatform() is sync and
// stable for the lifetime of the JS runtime.
const isNative = Capacitor.isNativePlatform();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      // On native Capacitor: the auth token getter is wired via useLayoutEffect
      // (runs before useEffect), but if the very first query fires before auth
      // settles, retry once after a short delay so it picks up the token.
      ...(isNative && {
        retry: (count: number, err: unknown) =>
          count < 1 &&
          typeof err === "object" &&
          err !== null &&
          (err as { status?: number }).status === 401,
        retryDelay: 400,
      }),
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY env var");
}

// Clerk's routerPush/Replace callbacks pass full browser paths (including
// the artifact base prefix). Wouter's setLocation prepends the base again,
// so we strip it here to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// All authenticated routes are wrapped in this guard.
// While Clerk is loading it renders nothing (avoids flash). Once loaded, if
// the user is not signed in, Clerk's RedirectToSignIn sends them to the sign-in
// page and — crucially — preserves the current URL so they land back here after
// signing in (important for shared challenge links).
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes — no auth required */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/marketing/:n" component={Marketing} />
      {/* All other routes require sign-in */}
      <Route>
        <RequireAuth>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/roster" component={Roster} />
            <Route path="/new-character" component={NewCharacter} />
            <Route path="/fights" component={Fights} />
            <Route path="/daily" component={Daily} />
            <Route path="/tournaments" component={Tournaments} />
            <Route path="/admin" component={Admin} />
            <Route path="/challenge/:code" component={Challenge} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

// Wires Clerk's getToken() to the API client's auth token getter so that
// customFetch (React Query hooks) AND apiFetch (direct fetch calls) both
// attach a Bearer token on Capacitor native builds, where session cookies
// are not propagated across origins. No-ops entirely on web.
//
// Implementation notes:
// • useLayoutEffect is used instead of useEffect so the getter is registered
//   synchronously before React Query's useEffect-based queries fire in the
//   same commit cycle (all useLayoutEffects run before all useEffects).
// • Empty deps [] + mutable ref pattern: we register one stable getter
//   closure that always reads the latest auth state from the ref, avoiding
//   the de-registration / re-registration churn that [getToken, isSignedIn]
//   deps would cause — and avoiding setting getter to null during Clerk's
//   async init window when isSignedIn is briefly false/undefined.
function ClerkAuthBridge() {
  const { getToken, isSignedIn } = useAuth();

  // Mutable ref kept in sync synchronously during every render — safe because
  // updating a ref is not a side-effect that affects other components.
  const authRef = useRef({ getToken, isSignedIn });
  authRef.current.getToken = getToken;
  authRef.current.isSignedIn = isSignedIn;

  useLayoutEffect(() => {
    if (!isNative) return;

    // Register once. The closure reads authRef.current so it always gets the
    // latest token / sign-in state without needing to re-register.
    setAuthTokenGetter(async () => {
      if (!authRef.current.isSignedIn) return null;
      try {
        return await authRef.current.getToken();
      } catch {
        return null;
      }
    });

    return () => setAuthTokenGetter(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Clerk's session changes (sign-in / sign-out) should invalidate query cache
// so any data tied to the previous user (or guest) is refetched fresh.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// Module-level flag — resets on every fresh JS runtime load (= every real app launch).
// Avoids sessionStorage which can persist across TWA / Play Store app launches.
let _introPlayed = false;

// Orchestrates intro + age gate sequencing.
// Must be rendered INSIDE <ClerkProvider> so it can call useAuth().
//
// New order (sign-in is now mandatory, so the sign-in click gives us sticky
// user-activation for free):
//   1. User signs in  →  sticky activation granted by the sign-in button click
//   2. Intro plays immediately — AudioContext.resume() succeeds, no extra gesture
//   3. Intro finishes → age gate appears (if not yet answered)
//   4. User answers age gate → home page
//
// For returning users whose Clerk session is auto-restored (no sign-in click),
// the AudioContext falls back to the one-shot unlock listener that starts
// playback on the very first tap / click — still a big UX win vs. the old flow.
function IntroOrchestrator({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { mode: ageMode } = useAgeMode();

  // Start the intro as soon as we know the user is signed in.
  // useState initializer handles the fast path (session already cached);
  // useEffect handles the async path (Clerk resolves after render).
  const [showIntro, setShowIntro] = useState(
    () => isLoaded && !!isSignedIn && !_introPlayed,
  );
  const [introDone, setIntroDone] = useState(() => _introPlayed);

  useEffect(() => {
    if (isLoaded && isSignedIn && !_introPlayed && !showIntro) {
      setShowIntro(true);
    }
  }, [isLoaded, isSignedIn, showIntro]);

  const handleIntroDone = () => {
    _introPlayed = true;
    setShowIntro(false);
    setIntroDone(true);
  };

  // Age gate is shown only after the intro has finished (or been skipped on
  // subsequent visits) AND the user hasn't answered it yet.
  const showAgeGate = introDone && ageMode === null;

  return (
    <>
      {children}
      {showIntro && <IntroSequence onDone={handleIntroDone} />}
      {showAgeGate && <AgeGate />}
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/`}
      signUpFallbackRedirectUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkAuthBridge />
        <TooltipProvider>
          <IntroOrchestrator>
            <Layout>
              <Router />
            </Layout>
            <RotatePrompt />
            <RatePrompt />
            <Toaster />
          </IntroOrchestrator>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// Polls the service worker for updates so users always get the latest build.
// Checks on mount, on every window-focus, and every 60 s. When a new SW
// takes over (controllerchange) the page reloads automatically to serve the
// fresh bundle — the user just sees a normal page refresh.
//
// iOS Safari fix: we call navigator.serviceWorker.register() directly with
// updateViaCache:'none' instead of just reading the existing registration.
// iOS aggressively HTTP-caches sw.js, so a plain reg.update() always gets the
// stale copy and never detects a new deployment. updateViaCache:'none' forces
// the browser to bypass the HTTP cache every time it checks for a new SW —
// which is exactly what we need after a Replit republish.
function useSWAutoUpdate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    // Was the page already controlled by a SW when it loaded? If not, the very
    // first `controllerchange` is the *initial* install claim — reloading then
    // would yank a brand-new user out of whatever they were doing (looks like
    // a crash back to intro). Only reload on TRUE updates.
    const hadControllerOnLoad = !!navigator.serviceWorker.controller;

    const check = () => { reg?.update().catch(() => {}); };

    // BASE_URL always has a trailing slash (e.g. "/" or "/fight-club/").
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;

    // Calling register() again with the same URL updates the registration's
    // updateViaCache option in-place (per the SW spec). This means even if
    // VitePWA already registered the SW without this flag, our call upgrades
    // the existing registration to bypass iOS's HTTP cache going forward.
    navigator.serviceWorker
      .register(swUrl, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((r) => {
        reg = r;
        // If a new SW is already waiting (installed but not yet active —
        // common on iOS after a reload), activate it immediately.
        if (r.waiting) r.waiting.postMessage({ type: "SKIP_WAITING" });
        check();
      })
      .catch(() => {
        navigator.serviceWorker.getRegistration().then((r) => {
          if (!r) return;
          reg = r;
          check();
        }).catch(() => {});
      });

    const interval = setInterval(check, 60_000);
    window.addEventListener("focus", check);

    // When a new SW takes control, reload once so the fresh bundle is served.
    // BUT: skip the *initial* claim on first install (no prior controller) —
    // reloading then dumps a brand-new user back to the intro mid-onboarding.
    // For real updates, defer the reload until the page is hidden so we don't
    // nuke an in-flight fight/stream/pick. Fallback: reload after 5 min if the
    // user never backgrounds the tab, so they aren't stranded on a stale build.
    let reloaded = false;
    const doReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    const onController = () => {
      if (!hadControllerOnLoad) return; // first install — do nothing
      if (document.visibilityState === "hidden") {
        doReload();
        return;
      }
      const onHidden = () => {
        if (document.visibilityState === "hidden") doReload();
      };
      document.addEventListener("visibilitychange", onHidden);
      window.setTimeout(doReload, 5 * 60_000);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", check);
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);
}

function App() {
  useSWAutoUpdate();
  return (
    <WouterRouter>
      <MusicProvider>
        <ClerkProviderWithRoutes />
      </MusicProvider>
    </WouterRouter>
  );
}

export default App;
