import { MixSettings, ReelAudioController } from "../audio/soundEngine";
import { ReelBeat, TOTAL_REEL_DURATION } from "../data/reelBlueprint";
import { renderReelFrame } from "./reelRenderer";

export interface ExportProgress {
  progress: number; // 0..1
  currentSec: number;
  totalSec: number;
}

export interface ExportedVideoResult {
  url: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

function pickSupportedMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

export async function exportReelVideo(params: {
  beats: ReelBeat[];
  images: Record<string, HTMLImageElement>;
  voiceBuffers: Record<string, AudioBuffer>;
  mix: MixSettings;
  audioController: ReelAudioController;
  resolution: "1080p" | "720p";
  signal: AbortSignal;
  onProgress: (p: ExportProgress) => void;
}): Promise<ExportedVideoResult> {
  const { beats, images, voiceBuffers, mix, audioController, resolution, signal, onProgress } = params;

  const width = resolution === "1080p" ? 1080 : 720;
  const height = resolution === "1080p" ? 1920 : 1280;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context for video export.");
  }

  // Ensure fonts are loaded before rendering export frames
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const videoStream = canvas.captureStream(30);
  const audioStream = audioController.startPlayback(beats, voiceBuffers, mix, 0, true);

  const combinedStream = new MediaStream();
  videoStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));
  if (audioStream) {
    audioStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
  }

  const { mimeType, extension } = pickSupportedMimeType();
  const chunks: BlobPart[] = [];

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: resolution === "1080p" ? 8_000_000 : 4_500_000,
      audioBitsPerSecond: 192_000,
    });
  } catch {
    recorder = new MediaRecorder(combinedStream);
  }

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  return new Promise<ExportedVideoResult>((resolve, reject) => {
    let rafId = 0;
    let finished = false;
    const startWallTime = performance.now();

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      audioController.stop();
      combinedStream.getTracks().forEach((t) => t.stop());
    };

    signal.addEventListener(
      "abort",
      () => {
        if (finished) return;
        finished = true;
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          // ignore
        }
        cleanup();
        reject(new Error("Export cancelled."));
      },
      { once: true }
    );

    recorder.onerror = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("Video recording failed in this browser."));
    };

    recorder.onstop = () => {
      if (finished) return;
      finished = true;
      cleanup();
      const actualMime = recorder.mimeType || mimeType;
      const actualExt = actualMime.includes("mp4") ? "mp4" : extension;
      const blob = new Blob(chunks, { type: actualMime });
      const url = URL.createObjectURL(blob);
      resolve({
        url,
        blob,
        filename: `why-didnt-anyone-tell-me-9x16.${actualExt}`,
        mimeType: actualMime,
        sizeBytes: blob.size,
      });
    };

    const tick = () => {
      if (signal.aborted || finished) return;
      const elapsedSec = (performance.now() - startWallTime) / 1000;
      const clampedSec = Math.min(elapsedSec, TOTAL_REEL_DURATION);

      renderReelFrame(ctx, {
        width,
        height,
        timeSec: clampedSec,
        beats,
        images,
        showSafeZones: false,
      });

      onProgress({
        progress: clampedSec / TOTAL_REEL_DURATION,
        currentSec: clampedSec,
        totalSec: TOTAL_REEL_DURATION,
      });

      if (elapsedSec >= TOTAL_REEL_DURATION) {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    // Draw initial frame at t=0 before starting MediaRecorder
    renderReelFrame(ctx, {
      width,
      height,
      timeSec: 0,
      beats,
      images,
      showSafeZones: false,
    });

    recorder.start(250);
    rafId = requestAnimationFrame(tick);
  });
}

export async function exportCoverThumbnailPng(params: {
  beats: ReelBeat[];
  images: Record<string, HTMLImageElement>;
  timeSec?: number;
}): Promise<Blob> {
  const { beats, images, timeSec = 39.5 } = params;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context for cover export.");
  }

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  renderReelFrame(ctx, {
    width: 1080,
    height: 1920,
    timeSec,
    beats,
    images,
    showSafeZones: false,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not encode cover PNG image."));
      }
    }, "image/png");
  });
}
