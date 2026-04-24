// Tiny localStorage wrapper for the anonymous tokens the server hands out
// when you create or accept a challenge. The token is the only proof that
// "this browser owns the creator/joiner side of code XYZ", so all subsequent
// /ready and /push/subscribe calls send it along.

const KEY_PREFIX = "ava:challenge:";

interface StoredTokens {
  creator?: string;
  joiner?: string;
}

function read(code: string): StoredTokens {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + code.toUpperCase());
    if (!raw) return {};
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return {};
  }
}

function write(code: string, tokens: StoredTokens): void {
  try {
    localStorage.setItem(KEY_PREFIX + code.toUpperCase(), JSON.stringify(tokens));
  } catch {
    // Quota / private mode — silently skip; user just loses the role.
  }
}

export function setCreatorToken(code: string, token: string): void {
  const t = read(code);
  t.creator = token;
  write(code, t);
}

export function setJoinerToken(code: string, token: string): void {
  const t = read(code);
  t.joiner = token;
  write(code, t);
}

export function getCreatorToken(code: string): string | null {
  return read(code).creator ?? null;
}

export function getJoinerToken(code: string): string | null {
  return read(code).joiner ?? null;
}

// Returns the token for whichever side this browser owns, plus the side name.
// Preference: creator (since they own the challenge); a single browser
// occasionally ends up holding both tokens during local testing — creator wins.
export function getOwnedTokenForChallenge(code: string): { token: string; side: "creator" | "joiner" } | null {
  const t = read(code);
  if (t.creator) return { token: t.creator, side: "creator" };
  if (t.joiner) return { token: t.joiner, side: "joiner" };
  return null;
}
