import { useCallback, useRef, useState } from "react";
import type { FightResult, FightRound, SimulateFightBody } from "@workspace/api-client-react";

// Mirror the API client's base URL resolution. The api-client-react package
// uses applyBaseUrl() under the hood; we read the same config so the streaming
// fetch hits the same origin as every other API call.
function resolveStreamUrl(): string {
  // Vite injects BASE_URL for the artifact prefix on the frontend; the API
  // server is mounted at /api on the same origin, so a root-relative URL is
  // correct in both dev and prod.
  return "/api/fights/stream";
}

interface InitPayload {
  team1: Array<{ id: number; name: string; imageUrl?: string | null }>;
  team2: Array<{ id: number; name: string; imageUrl?: string | null }>;
  winner: number;
  arena: { name: string; description: string; hazards?: string[] };
  rounds: Array<{
    round: number;
    attacker: 1 | 2;
    narrative: string;
    team1Hp: number;
    team2Hp: number;
  }>;
  settled?: boolean;
  rematchCount?: number;
}

interface UseSimulateFightStreamOptions {
  onError?: (err: Error) => void;
  onComplete?: (result: FightResult) => void;
}

interface MutateArgs {
  data: SimulateFightBody;
}

// Parse a chunked SSE buffer into discrete events. SSE messages are separated
// by a blank line; lines beginning with `event:` or `data:` carry payload.
// `data:` may span multiple lines for one event — concatenate them with \n.
function* parseSseEvents(buffer: string): Generator<{ event: string; data: string }, string> {
  let rest = buffer;
  while (true) {
    const splitAt = rest.indexOf("\n\n");
    if (splitAt === -1) return rest; // remainder for next chunk
    const block = rest.slice(0, splitAt);
    rest = rest.slice(splitAt + 2);
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue; // SSE comment / heartbeat
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (dataLines.length > 0) yield { event, data: dataLines.join("\n") };
  }
}

export function useSimulateFightStream(opts: UseSimulateFightStreamOptions = {}) {
  const [data, setData] = useState<FightResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [ready, setReady] = useState(false); // true once init arrived → arena/HP can render in background
  const [streaming, setStreaming] = useState(false); // true once first text chunk landed → UI can leave loading sequence
  const [completedSections, setCompletedSections] = useState<Set<string>>(() => new Set()); // section names (UPPERCASE) whose canonical content has finalized
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setData(null);
    setIsPending(false);
    setReady(false);
    setStreaming(false);
    setCompletedSections(new Set());
    setError(null);
  }, []);

  const mutate = useCallback((args: MutateArgs) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setData(null);
    setReady(false);
    setStreaming(false);
    setCompletedSections(new Set());
    setError(null);
    setIsPending(true);

    (async () => {
      try {
        const res = await fetch(resolveStreamUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify(args.data),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          let msg = `Stream failed with status ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch { /* ignore */ }
          throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Working copy of the result that we mutate as sections arrive.
        let working: FightResult | null = null;

        // Per-section live buffers fed by `delta` events. We accumulate here
        // and flush into React state at most once per animation frame so the
        // typewriter effect renders smoothly even at 50+ chunks/sec.
        const liveBuffers = new Map<string, string>();
        let rafScheduled = false;
        const scheduleFlush = () => {
          if (rafScheduled || !working) return;
          rafScheduled = true;
          const raf = typeof requestAnimationFrame === "function"
            ? requestAnimationFrame
            : ((cb: () => void) => setTimeout(cb, 16));
          raf(() => {
            rafScheduled = false;
            if (!working) return;
            setData({ ...working, rounds: [...working.rounds] });
          });
        };

        // Apply a name+content pair into the working result. Used by both
        // delta-flush and the canonical `section` event.
        const applyContent = (upper: string, content: string) => {
          if (!working) return;
          const trimmed = content.trim();
          if (!trimmed) return;

          const roundMatch = upper.match(/^ROUND\s+(\d+)$/);
          if (roundMatch) {
            const idx = Number(roundMatch[1]) - 1;
            if (working.rounds[idx]) {
              working.rounds[idx] = { ...working.rounds[idx], narrative: trimmed };
            }
            return;
          }
          if (upper === "SETTING") { working.arenaIntro = trimmed; return; }
          if (upper === "ENTRANCE" || upper === "COMBATANT ENTRANCE") { working.intro = trimmed; return; }
          if (upper === "RESULT") { working.summary = trimmed; return; }
          if (upper === "WHY THEY WON") {
            const lines: string[] = [];
            const sentenceRe = /\d+\.\s*([\s\S]*?)(?=\d+\.|$)/g;
            let m: RegExpExecArray | null;
            while ((m = sentenceRe.exec(trimmed)) !== null) {
              const s = m[1]?.trim();
              if (s) lines.push(s);
            }
            if (lines.length === 0) {
              trimmed.split(/\n+/).map(l => l.trim()).filter(Boolean).forEach(l => lines.push(l));
            }
            working.whyWon = lines;
            return;
          }
        };

        const handleEvent = (event: string, dataStr: string) => {
          let payload: unknown;
          try { payload = JSON.parse(dataStr); } catch { return; }

          if (event === "init") {
            const init = payload as InitPayload;
            // Build a stub FightResult. id/simulatedAt are placeholders until
            // the `complete` event arrives with the real saved record.
            const rounds: FightRound[] = init.rounds.map((r) => {
              const attackerName = r.attacker === 1
                ? (init.team1[0]?.name ?? "Team 1")
                : (init.team2[0]?.name ?? "Team 2");
              const defenderName = r.attacker === 1
                ? (init.team2[0]?.name ?? "Team 2")
                : (init.team1[0]?.name ?? "Team 1");
              return {
                round: r.round,
                attacker: attackerName,
                defender: defenderName,
                attackType: "",
                narrative: "", // filled by ROUND N section events
                team1Hp: r.team1Hp,
                team2Hp: r.team2Hp,
              };
            });
            working = {
              id: -1,
              team1: init.team1 as FightResult["team1"],
              team2: init.team2 as FightResult["team2"],
              winner: init.winner,
              rounds,
              summary: "",
              arenaIntro: "",
              intro: "",
              whyWon: [],
              settled: init.settled,
              rematchCount: init.rematchCount,
              simulatedAt: new Date().toISOString(),
            };
            setData(working);
            setReady(true);
            return;
          }

          if (event === "delta" && working) {
            const { name, append } = payload as { name: string; append: string };
            if (!append) return;
            const upper = name.toUpperCase().trim();
            // WHY THEY WON parses into a numbered list — only meaningful when
            // complete, so we skip mid-stream typewriting for that one section.
            if (upper === "WHY THEY WON") return;
            const cur = (liveBuffers.get(upper) ?? "") + append;
            liveBuffers.set(upper, cur);
            applyContent(upper, cur);
            // First real text chunk landed — let the UI leave the loader.
            setStreaming(true);
            scheduleFlush();
            return;
          }

          if (event === "section" && working) {
            const { name, content } = payload as { name: string; content: string };
            const upper = name.toUpperCase().trim();
            // Canonical final content for this section — overwrites any
            // delta-built buffer and flushes immediately.
            liveBuffers.set(upper, content);
            applyContent(upper, content);
            // Section landed (e.g. cache hit path with no preceding deltas).
            setStreaming(true);
            // Mark this section as canonically complete so the UI knows the
            // typewriter is finished and can show the next gating button.
            setCompletedSections(prev => {
              if (prev.has(upper)) return prev;
              const next = new Set(prev);
              next.add(upper);
              return next;
            });
            setData({ ...working, rounds: [...working.rounds] });
            return;
          }

          if (event === "complete") {
            const full = payload as FightResult;
            setData(full);
            // Cache-hit path may emit complete without ever sending a delta;
            // make sure the UI exits the loader in that case too.
            setStreaming(true);
            // Mark every section complete so any UI gating ("BEGIN MATCH",
            // "NEXT ROUND →") becomes immediately available — server payload
            // is canonical at this point.
            setCompletedSections(() => {
              const all = new Set<string>(["SETTING", "ENTRANCE", "COMBATANT ENTRANCE", "RESULT", "WHY THEY WON"]);
              full.rounds.forEach(r => all.add(`ROUND ${r.round}`));
              return all;
            });
            setIsPending(false);
            optsRef.current.onComplete?.(full);
          }

          if (event === "error") {
            const e = new Error((payload as { message?: string })?.message ?? "Fight stream error");
            setError(e);
            setIsPending(false);
            optsRef.current.onError?.(e);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const gen = parseSseEvents(buffer);
          let next = gen.next();
          while (!next.done) {
            handleEvent(next.value.event, next.value.data);
            next = gen.next();
          }
          buffer = next.value;
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          setIsPending(false);
          return;
        }
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setIsPending(false);
        optsRef.current.onError?.(e);
      }
    })();
  }, []);

  return { data, isPending, ready, streaming, completedSections, error, mutate, reset };
}
