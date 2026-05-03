import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { musicEngine, MusicTrack } from "@/lib/music-engine";

interface MusicContextValue {
  track: MusicTrack;
  muted: boolean;
  setTrack: (t: MusicTrack) => void;
  toggleMute: () => void;
  duck: (active: boolean) => void;
}

const MusicContext = createContext<MusicContextValue>({
  track: "off",
  muted: false,
  setTrack: () => {},
  toggleMute: () => {},
  duck: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [track, setTrackState] = useState<MusicTrack>("off");
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("ava_music_muted") === "true"; }
    catch { return false; }
  });

  const setTrack = useCallback((t: MusicTrack) => {
    setTrackState(t);
    musicEngine.setTrack(t);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !musicEngine.muted;
    musicEngine.setMuted(next);
    setMuted(next);
    try { localStorage.setItem("ava_music_muted", String(next)); } catch {}
  }, []);

  const duck = useCallback((active: boolean) => {
    musicEngine.duck(active);
  }, []);

  useEffect(() => {
    // Apply mute preference, but DON'T auto-start the lobby track here —
    // the intro sequence has its own dedicated music (intro-music.mp3) and
    // would clash with the lobby track. Pages that want background music
    // (e.g. home.tsx) call setTrack("lobby") in their own mount effect, so
    // the engine only kicks in once the user has actually landed in-arena.
    musicEngine.setMuted(muted);
  }, []);

  return (
    <MusicContext.Provider value={{ track, muted, setTrack, toggleMute, duck }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
