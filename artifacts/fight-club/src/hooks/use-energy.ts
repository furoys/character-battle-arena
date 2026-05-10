import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

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
const ENERGY_QUERY_KEY = ["energy"] as const;

// Hook that mirrors the server's energy state for the signed-in user.
// All consumers share the same react-query cache (keyed by ["energy"]) so an
// optimistic decrement made by one component (e.g. handleFight in Home) is
// instantly visible to every other consumer (e.g. the badge in the header).
//
// Strategy: react-query handles the fetch + cache + focus refetch + 60s poll.
// A 1Hz local timer just decrements msUntilNextRefill in cache so the
// countdown looks live; when it hits 0 we let react-query refetch (server is
// the authority for the actual energy value — we never fabricate a +1).
export function useEnergy(): UseEnergyResult {
  const { isSignedIn, isLoaded } = useUser();
  const queryClient = useQueryClient();
  // Tracks the offset between server clock and local clock so the local
  // 1Hz tick doesn't drift with system clock skew.
  const clockOffsetRef = useRef(0);
  // Guard so the auto-refetch on countdown=0 fires once per cycle, not every
  // tick after the timer hits 0.
  const refetchingForRefillRef = useRef(false);

  const query = useQuery<EnergyState | null>({
    queryKey: ENERGY_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch("/api/me/energy");
      if (!res.ok) return null;
      const json = (await res.json()) as EnergyState;
      clockOffsetRef.current = json.serverNow - Date.now();
      refetchingForRefillRef.current = false;
      return json;
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const state = query.data ?? null;

  // Local 1Hz tick: count down msUntilNextRefill in cache. When it reaches 0,
  // refetch from the server (which authoritatively decides the new value).
  useEffect(() => {
    if (!state) return;
    if (state.energy >= state.max) return;
    const id = window.setInterval(() => {
      queryClient.setQueryData<EnergyState | null>(ENERGY_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        if (prev.energy >= prev.max) return prev;
        const elapsedSinceMeasured = Date.now() + clockOffsetRef.current - prev.serverNow;
        const newMsUntil = Math.max(0, prev.msUntilNextRefill - elapsedSinceMeasured);
        if (newMsUntil <= 0 && !refetchingForRefillRef.current) {
          refetchingForRefillRef.current = true;
          void queryClient.invalidateQueries({ queryKey: ENERGY_QUERY_KEY });
        }
        return {
          ...prev,
          msUntilNextRefill: newMsUntil,
          serverNow: Date.now() + clockOffsetRef.current,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state?.serverNow, state?.energy, state?.max, queryClient]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ENERGY_QUERY_KEY });
  }, [queryClient]);

  const applyOptimisticConsume = useCallback(() => {
    queryClient.setQueryData<EnergyState | null>(ENERGY_QUERY_KEY, (prev) => {
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
  }, [queryClient]);

  // When the user signs out, drop the cached state so a new sign-in starts
  // fresh and a stale value doesn't briefly leak into the next session.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      queryClient.setQueryData(ENERGY_QUERY_KEY, null);
    }
  }, [isLoaded, isSignedIn, queryClient]);

  return {
    state,
    isLoading: query.isLoading,
    isSignedIn: !!isSignedIn,
    refetch,
    applyOptimisticConsume,
  };
}

// Format milliseconds as "MM:SS" — used in the badge tooltip / sub-label
// and the OUT OF ENERGY button countdown.
export function formatRefillCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
