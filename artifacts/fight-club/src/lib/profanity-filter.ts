// ─── Client-side profanity filter ────────────────────────────────────────────
// Pure presentation layer. Backend, AI prompts, and cache are untouched.
// When ageMode === "minor" we replace internal letters of swears with asterisks
// (keeping first + last char so the prose still scans naturally).

const SWEARS = [
  "fuck", "fucker", "fuckers", "fucking", "fucked", "fucks",
  "motherfucker", "motherfuckers", "motherfucking",
  "shit", "shitty", "shithead", "bullshit", "shitting", "shits",
  "bitch", "bitches", "bitchy", "bitching",
  "asshole", "assholes", "asshat",
  "bastard", "bastards",
  "damn", "damned", "goddamn", "goddamned",
  "cunt", "cunts",
  "twat", "twats",
  "prick", "pricks",
  "wanker", "wankers",
  "bollocks",
  "piss", "pissed", "pissing",
  "cock", "cocks", "cocksucker",
  "dickhead", "dickheads",
];

const SWEAR_RE = new RegExp(`\\b(${SWEARS.join("|")})\\b`, "gi");

function maskWord(w: string): string {
  if (w.length <= 2) return w[0] + "*";
  if (w.length === 3) return w[0] + "*" + w[w.length - 1];
  return w[0] + "*".repeat(w.length - 2) + w[w.length - 1];
}

export function censor(text: string | undefined | null): string {
  if (!text) return text ?? "";
  return text.replace(SWEAR_RE, (m) => maskWord(m));
}

// Recursively censor every string field on a fight result.
export function censorFightResult<T>(result: T): T {
  if (result == null) return result;
  if (typeof result === "string") return censor(result) as unknown as T;
  if (Array.isArray(result)) return result.map(censorFightResult) as unknown as T;
  if (typeof result === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
      out[k] = censorFightResult(v);
    }
    return out as T;
  }
  return result;
}
