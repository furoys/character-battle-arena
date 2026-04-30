import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/react";

export interface EnergyState {
  energy: number;
  max: number;
  msUntilNextRefill: number;
  fullAt: number | null;
  serverNow: number;
}

interface UseEnergyResult {
  state: EnergyState | null;
  isLoading: boolean;
  isSignedIn: boolean;
  // Force a fresh fetch from the server (used after a fight starts so the
  // local count drops to the truth, and after a refill cycle elapses so the
  // bar actually goes up).
  refetch: () => Promise<void>;
  // Apply an optimistic local decrement (used the moment we trigger a fight,
  // so the badge updates instantly without waiting for the round-trip).
  applyOptimisticConsume: () => void;
}

const REFILL_MS = 30 * 60 * 1000;

// Hook that mirrors the server's energy state for the signed-in user.
// Strategy: fetch on mount + focus + every 60s, run a 1Hz local timer that
// decrements msUntilNextRefill, and refetch from the server the moment a
// refill should have happened (server is the source of truth — we never
// fabricate a +1 on the client).
export function useEnergy(): UseEnergyResult {
  const { isSignedIn, isLoaded } = useUser();
  const [state, setState] = useState<EnergyState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Tracks the offset between server clock and local clock at the time of
  // the last fetch, so subsequent local ticks don't drift with system clock skew.
  const clockOffsetRef = useRef(0);
  // Guard so the auto-refetch on countdown=0 doesn't fire repeatedly.
  const refetchingForRefillRef = useRef(false);

  const fetchEnergy = useCallback(async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/me/energy", { credentials: "include" });
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const json = (await res.json()) as EnergyState;
      clockOffsetRef.current = json.serverNow - Date.now();
      refetchingForRefillRef.current = false;
      setState(json);
    } catch {
      // network blip — keep stale state
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // Initial fetch + refetch on focus / interval
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState(null);
      return;
    }
    void fetchEnergy();
    const onFocus = () => { void fetchEnergy(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const id = window.setInterval(() => { void fetchEnergy(); }, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(id);
    };
  }, [isLoaded, isSignedIn, fetchEnergy]);

  // Local 1Hz tick: count down msUntilNextRefill. When it reaches 0, refetch
  // from the server (which authoritatively decides the new energy value).
  useEffect(() => {
    if (!state) return;
    if (state.energy >= state.max) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        if (prev.energy >= prev.max) return prev;
        const elapsedSinceMeasured = Date.now() + clockOffsetRef.current - prev.serverNow;
        const newMsUntil = Math.max(0, prev.msUntilNextRefill - elapsedSinceMeasured);
        if (newMsUntil <= 0 && !refetchingForRefillRef.current) {
          refetchingForRefillRef.current = true;
          // Refetch on the next tick — don't await inside setState.
          void fetchEnergy();
        }
        return { ...prev, msUntilNextRefill: newMsUntil, serverNow: Date.now() + clockOffsetRef.current };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state?.serverNow, state?.energy, state?.max, fetchEnergy]);

  const applyOptimisticConsume = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.energy <= 0) return prev;
      const wasAtCap = prev.energy >= prev.max;
      const newEnergy = prev.energy - 1;
      const serverNow = Date.now() + clockOffsetRef.current;
      if (wasAtCap) {
        // Going from full → cap-1 starts the refill timer at "now".
        const refillsNeeded = prev.max - newEnergy;
        return {
          ...prev,
          energy: newEnergy,
          msUntilNextRefill: REFILL_MS,
          fullAt: serverNow + refillsNeeded * REFILL_MS,
          serverNow,
        };
      }
      return { ...prev, energy: newEnergy, serverNow };
    });
  }, []);

  return {
    state,
    isLoading,
    isSignedIn: !!isSignedIn,
    refetch: fetchEnergy,
    applyOptimisticConsume,
  };
}

// Format milliseconds as "MM:SS" — used in the badge tooltip / sub-label.
export function formatRefillCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
