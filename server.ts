import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ALLOWED_VOICES = new Set(["Charon", "Fenrir", "Kore", "Puck", "Zephyr"]);
const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"] as const;

interface CachedAudio {
  audioBase64: string;
  mimeType: string;
  voiceName: string;
  model: string;
}

const ttsCache = new Map<string, CachedAudio>();
const modelCooldownUntil = new Map<string, number>();
const MAX_CACHE_ENTRIES = 60;

function parseRetryDelayMs(rawMessage: string): number {
  const secMatch = rawMessage.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(secs * 1000, 60 * 60 * 1000);
    }
  }
  return 10 * 60 * 1000;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function classifyGeminiError(err: unknown): { status: number; message: string; isQuota: boolean } {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    const isFreeTier = lower.includes("free_tier") || lower.includes("free tier");
    return {
      status: 429,
      isQuota: true,
      message: isFreeTier
        ? "This app's attached API key reached the Free Tier daily limit for TTS. If you upgraded your plan, open Settings > Secrets to attach your billing-enabled API key, or use Record Mic in the meantime."
        : "Gemini TTS rate limit or quota was reached. Please wait a moment and try again, or verify your billing-enabled API key in Settings > Secrets.",
    };
  }

  if (lower.includes("403") || lower.includes("permission_denied") || lower.includes("api_key_invalid")) {
    return {
      status: 403,
      isQuota: false,
      message:
        "The attached Gemini API key was rejected. Please select a valid API key in Settings > Secrets.",
    };
  }

  return {
    status: 500,
    isQuota: false,
    message: raw || "Failed to generate voiceover audio.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ttsConfigured: Boolean(getGeminiClient()) });
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, style, voiceName } = req.body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text is required for voiceover generation." });
      }
      if (text.length > 1500) {
        return res.status(400).json({ error: "Text exceeds maximum length of 1500 characters." });
      }

      const cleanText = text.trim();
      const cleanStyle = typeof style === "string" ? style.trim() : "";
      const selectedVoice =
        typeof voiceName === "string" && ALLOWED_VOICES.has(voiceName) ? voiceName : "Charon";

      const cacheKey = `${selectedVoice}::${cleanStyle}::${cleanText}`;
      const cached = ttsCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            "Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets, or record your own voice directly in the studio.",
        });
      }

      const part: { text: string; speechMetadata?: { style: string } } = {
        text: cleanText,
      };
      if (cleanStyle) {
        part.speechMetadata = { style: cleanStyle };
      }

      const now = Date.now();
      const availableModels = TTS_MODELS.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= now);
      const modelsToTry = availableModels.length > 0 ? availableModels : [...TTS_MODELS];

      let lastErr: unknown = null;
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [part],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          const base64Audio = inlineData?.data;
          if (!base64Audio) {
            lastErr = new Error("Voiceover model returned an empty audio response.");
            continue;
          }

          const payload: CachedAudio = {
            audioBase64: base64Audio,
            mimeType: inlineData?.mimeType || "audio/wav",
            voiceName: selectedVoice,
            model,
          };

          if (ttsCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = ttsCache.keys().next().value;
            if (oldestKey) ttsCache.delete(oldestKey);
          }
          ttsCache.set(cacheKey, payload);

          return res.json(payload);
        } catch (err: unknown) {
          lastErr = err;
          const classified = classifyGeminiError(err);
          if (classified.isQuota) {
            const rawMsg = err instanceof Error ? err.message : String(err ?? "");
            modelCooldownUntil.set(model, Date.now() + parseRetryDelayMs(rawMsg));
            continue;
          }
          return res.status(classified.status).json({ error: classified.message });
        }
      }

      const finalErr = classifyGeminiError(lastErr);
      return res.status(finalErr.status).json({ error: finalErr.message });
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      return res.status(classified.status).json({ error: classified.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Eastern Sky Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
