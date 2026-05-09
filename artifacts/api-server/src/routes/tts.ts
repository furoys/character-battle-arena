import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VALID_VOICES)[number];

// The Replit OpenAI proxy does not expose the dedicated /audio/speech endpoint,
// so TTS has to go through chat.completions with the gpt-audio model. That path
// is currently unstable upstream — it returns 500 (no body) after 50–90 seconds
// for every prompt, including innocuous ones like "Welcome to the arena". Until
// the proxy recovers (or we bring in a different TTS provider), wrap the call
// in a hard 15 s timeout so the request fails fast instead of leaving the user
// staring at a 90 s spinner. The frontend treats 503 as "TTS unavailable" and
// gracefully hides the narration UI for the rest of the session.
const TTS_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

router.post("/tts", async (req, res): Promise<void> => {
  const { text, voice = "onyx" } = req.body as { text?: string; voice?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  if (text.length > 4096) {
    res.status(400).json({ error: "text too long (max 4096 chars)" });
    return;
  }
  if (!VALID_VOICES.includes(voice as Voice)) {
    res.status(400).json({ error: `voice must be one of: ${VALID_VOICES.join(", ")}` });
    return;
  }

  try {
    const audioBuffer = await withTimeout(
      textToSpeech(text.trim(), voice as Voice, "mp3"),
      TTS_TIMEOUT_MS,
      "tts",
    );
    if (!audioBuffer || audioBuffer.length === 0) {
      logger.warn("TTS returned empty audio");
      res.status(503).json({ error: "TTS unavailable", retryable: false });
      return;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(audioBuffer);
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "tts-timeout";
    if (isTimeout) {
      logger.warn("TTS upstream timeout (proxy gpt-audio is slow/down)");
    } else {
      logger.error({ err }, "TTS generation failed");
    }
    // Use 503 so the client knows this is an upstream availability problem
    // rather than a request-shape problem, and can hide the narration UI.
    res.status(503).json({ error: "TTS unavailable", retryable: false });
  }
});

export default router;
