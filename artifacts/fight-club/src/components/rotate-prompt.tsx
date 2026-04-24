import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  const isPhoneSized = window.innerHeight < 500 || window.innerWidth < 900;
  return isLandscape && isPhoneSized;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RotatePrompt() {
  const [show, setShow] = useState(() => shouldShow());
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const update = () => setShow(shouldShow());
    const updateMotion = () => setReducedMotion(prefersReducedMotion());

    const orientationMql = window.matchMedia("(orientation: landscape)");
    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

    orientationMql.addEventListener?.("change", update);
    motionMql.addEventListener?.("change", updateMotion);
    window.addEventListener("resize", update);

    return () => {
      orientationMql.removeEventListener?.("change", update);
      motionMql.removeEventListener?.("change", updateMotion);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      data-testid="rotate-prompt"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#030308] px-8 text-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rotate-prompt-title"
      aria-describedby="rotate-prompt-desc"
    >
      <RotateCcw
        className={`h-12 w-12 text-cyan-400 ${reducedMotion ? "" : "animate-[spin_2.5s_ease-in-out_infinite]"}`}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h2 id="rotate-prompt-title" className="text-xl font-semibold text-white">
        Rotate your device
      </h2>
      <p id="rotate-prompt-desc" className="max-w-xs text-sm text-zinc-400">
        A.v.A is built for portrait. Turn your phone upright to keep fighting.
      </p>
    </div>
  );
}
