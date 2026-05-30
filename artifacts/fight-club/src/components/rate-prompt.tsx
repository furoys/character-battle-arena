import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import {
  RATE_PROMPT_EVENT,
  recordNever,
  recordRated,
  recordSnooze,
} from "@/lib/rate-prompt";

// On-brand "Rate us on Google Play" bottom sheet. It renders nothing until the
// rate-prompt gating logic (see lib/rate-prompt.ts) decides a high-satisfaction
// moment has arrived and dispatches RATE_PROMPT_EVENT. Mounted once, globally,
// alongside the other app-wide overlays in App.tsx.
export function RatePrompt() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onShow = () => setShow(true);
    window.addEventListener(RATE_PROMPT_EVENT, onShow);
    return () => window.removeEventListener(RATE_PROMPT_EVENT, onShow);
  }, []);

  // Slide the sheet up on the frame after it mounts (no keyframes needed).
  useEffect(() => {
    if (!show) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;

  const close = () => setShow(false);
  const onRate = () => {
    recordRated();
    close();
  };
  const onLater = () => {
    recordSnooze();
    close();
  };
  const onNever = () => {
    recordNever();
    close();
  };

  return (
    <div
      data-testid="rate-prompt"
      className="fixed inset-0 z-[120] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-prompt-title"
      aria-describedby="rate-prompt-desc"
    >
      {/* Backdrop — tapping it counts as "maybe later", never a hard no. */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(2px)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.25s ease-out",
        }}
        onClick={onLater}
      />

      <div
        className="relative w-full max-w-md mx-auto px-6 pt-6 pb-8"
        style={{
          background: "linear-gradient(180deg, #15131f, #0a0810)",
          borderTop: "2px solid rgba(255,200,0,0.55)",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.25s ease-out",
        }}
      >
        <button
          onClick={onLater}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 active:scale-90 transition-transform"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center gap-1.5 mb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className="w-7 h-7"
              style={{ color: "#ffc800", fill: "#ffc800" }}
              aria-hidden="true"
            />
          ))}
        </div>

        <h2
          id="rate-prompt-title"
          className="font-display text-center uppercase"
          style={{
            color: "#ffc800",
            fontSize: 22,
            letterSpacing: "0.12em",
            lineHeight: 1.1,
          }}
        >
          Enjoying A.v.A?
        </h2>
        <p
          id="rate-prompt-desc"
          className="text-center mt-2 mx-auto"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: 300,
          }}
        >
          A 5-star rating on Google Play helps more fans find the Arena. It only
          takes a few seconds.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={onRate}
            className="w-full py-3 font-display uppercase active:scale-[0.98] transition-all"
            style={{
              background: "linear-gradient(135deg, #ffc800, #ff8a00)",
              color: "#1a1206",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "0.16em",
            }}
          >
            Rate on Google Play
          </button>
          <button
            onClick={onLater}
            className="w-full py-2.5 active:scale-[0.98] transition-all"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
          >
            MAYBE LATER
          </button>
          <button
            onClick={onNever}
            className="w-full py-1.5 active:scale-95 transition-all"
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.3)",
              fontSize: 11,
              letterSpacing: "0.12em",
            }}
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
