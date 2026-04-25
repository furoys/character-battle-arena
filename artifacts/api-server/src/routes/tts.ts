import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VALID_VOICES)[number];

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
    const audioBuffer = await textToSpeech(text.trim(), voice as Voice, "mp3");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(audioBuffer);
  } catch (err) {
    logger.error({ err }, "TTS generation failed");
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
