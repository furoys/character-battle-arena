import { Router } from "express";
import path from "path";
import fs from "fs";

const router = Router();

const INTRO_FILE = path.resolve(
  process.cwd(),
  "../../artifacts/fight-club/public/ava-cinematic-intro.html",
);

router.get("/download/intro", (_req, res) => {
  if (!fs.existsSync(INTRO_FILE)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ava-cinematic-intro.html"',
  );
  fs.createReadStream(INTRO_FILE).pipe(res);
});

export default router;
