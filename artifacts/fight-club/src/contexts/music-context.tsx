import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { musicEngine, MusicTrack } from "@/lib/music-engine";

interface MusicContextValue {
  track: MusicTrack;
  muted: boolean;
  setTrack: (t: MusicTrack) => void;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  track: "off",
  muted: false,
  setTrack: () => {},
  toggleMute: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [track, setTrackState] = useState<MusicTrack>("lobby");
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

  useEffect(() => {
    musicEngine.setMuted(muted);
    if (!muted) {
      musicEngine.setTrack("lobby");
    }
  }, []);

  return (
    <MusicContext.Provider value={{ track, muted, setTrack, toggleMute }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
