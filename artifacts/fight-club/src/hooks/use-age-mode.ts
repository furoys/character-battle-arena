import { useEffect, useState, useCallback } from "react";

export type AgeMode = "adult" | "minor";
const KEY = "ava-age-mode";

function read(): AgeMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "adult" || v === "minor" ? v : null;
  } catch {
    return null;
  }
}

export function useAgeMode() {
  const [mode, setModeState] = useState<AgeMode | null>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setModeState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: AgeMode) => {
    try { localStorage.setItem(KEY, next); } catch {}
    setModeState(next);
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch {}
    setModeState(null);
  }, []);

  return { mode, setMode, reset, isMinor: mode === "minor" };
}
