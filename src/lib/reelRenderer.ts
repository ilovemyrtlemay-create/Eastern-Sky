import { ReelBeat, TOTAL_REEL_DURATION } from "../data/reelBlueprint";

export interface RenderFrameOptions {
  width: number;
  height: number;
  timeSec: number;
  beats: ReelBeat[];
  images: Record<string, HTMLImageElement>;
  showSafeZones?: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  alpha = 1
) {
  if (!img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = w / h;
  let drawW = w;
  let drawH = h;
  if (imgAspect > canvasAspect) {
    drawH = h;
    drawW = h * imgAspect;
  } else {
    drawW = w;
    drawH = w / imgAspect;
  }
  drawW *= scale;
  drawH *= scale;
  const x = (w - drawW) / 2 + offsetX * w;
  const y = (h - drawH) / 2 + offsetY * h;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

function drawVaporWisps(ctx: CanvasRenderingContext2D, w: number, h: number, timeSec: number) {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const phase = (timeSec * 0.14 + i * 0.19) % 1;
    const x = w * (0.15 + ((i * 0.17) % 0.7)) + Math.sin(timeSec * 0.6 + i) * w * 0.04;
    const y = h * (0.85 - phase * 0.55);
    const radius = w * (0.28 + (i % 3) * 0.08);
    const alpha = Math.sin(phase * Math.PI) * 0.12;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(215, 226, 238, ${alpha})`);
    grad.addColorStop(1, "rgba(215, 226, 238, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCelestialRays(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  ctx.save();
  const originX = w * 0.52;
  const originY = h * 0.34;
  const rayCount = 8;
  for (let i = 0; i < rayCount; i++) {
    const angle = -Math.PI * 0.12 + (i / (rayCount - 1)) * Math.PI * 1.24 + Math.sin(progress * 2.5 + i) * 0.03;
    const rayAlpha = (0.08 + 0.12 * progress) * (i % 2 === 0 ? 1 : 0.65);
    const grad = ctx.createLinearGradient(originX, originY, originX + Math.cos(angle) * h, originY + Math.sin(angle) * h);
    grad.addColorStop(0, `rgba(255, 232, 175, ${rayAlpha})`);
    grad.addColorStop(0.55, `rgba(242, 183, 5, ${rayAlpha * 0.35})`);
    grad.addColorStop(1, "rgba(242, 183, 5, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(angle - 0.06) * h * 1.2, originY + Math.sin(angle - 0.06) * h * 1.2);
    ctx.lineTo(originX + Math.cos(angle + 0.06) * h * 1.2, originY + Math.sin(angle + 0.06) * h * 1.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGoldenEmbers(ctx: CanvasRenderingContext2D, w: number, h: number, timeSec: number) {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const seed = i * 17.31;
    const life = (timeSec * 0.11 + (seed % 1)) % 1;
    const x = w * ((Math.sin(seed) * 0.5 + 0.5) * 0.9 + 0.05) + Math.sin(timeSec * 0.8 + i) * w * 0.025;
    const y = h * (0.95 - life * 0.88);
    const size = (1.5 + (i % 3) * 1.1) * (w / 1080);
    const alpha = Math.sin(life * Math.PI) * 0.55;
    ctx.fillStyle = `rgba(242, 196, 95, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHighlightedTextLines(
  ctx: CanvasRenderingContext2D,
  beat: ReelBeat,
  w: number,
  h: number,
  beatProgress: number,
  elapsedInBeat: number
) {
  const hasHeadline = beat.headlineLines.length > 0;
  const hasSubline = Boolean(beat.subline);
  const hasScripture = Boolean(beat.scriptureRef);
  if (!hasHeadline && !hasSubline && !hasScripture) return;

  const enterAlpha = easeOutCubic(elapsedInBeat / 0.48);
  const exitTimeRemaining = beat.endSec - beat.startSec - elapsedInBeat;
  const exitAlpha = exitTimeRemaining < 0.25 ? clamp(exitTimeRemaining / 0.25, 0, 1) : 1;
  const alpha = enterAlpha * exitAlpha;
  if (alpha <= 0.01) return;

  const scaleFactor = w / 1080;
  const yOffset = (1 - enterAlpha) * 24 * scaleFactor;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "middle";

  const highlightSet = new Set(beat.highlightWords.map((word) => word.toUpperCase()));
  const fontSize = Math.round((beat.visualMode === "salvation_black" ? 86 : 82) * scaleFactor);
  const lineHeight = fontSize * 1.14;
  const fontSpec = `700 ${fontSize}px "Oswald", sans-serif`;
  ctx.font = fontSpec;

  const centerY =
    beat.visualMode === "salvation_black"
      ? h * 0.45
      : beat.visualMode === "eastern_sky_split"
      ? h * 0.54
      : h * 0.57;

  const totalTextHeight = beat.headlineLines.length * lineHeight;
  let currentY = centerY - totalTextHeight / 2 + yOffset;

  // Soft radial backdrop scrim behind typography for guaranteed legibility
  const scrimGrad = ctx.createLinearGradient(0, currentY - 140 * scaleFactor, 0, currentY + totalTextHeight + 200 * scaleFactor);
  scrimGrad.addColorStop(0, "rgba(5, 6, 8, 0)");
  scrimGrad.addColorStop(0.28, "rgba(5, 6, 8, 0.58)");
  scrimGrad.addColorStop(0.75, "rgba(5, 6, 8, 0.62)");
  scrimGrad.addColorStop(1, "rgba(5, 6, 8, 0)");
  ctx.fillStyle = scrimGrad;
  ctx.fillRect(0, currentY - 150 * scaleFactor, w, totalTextHeight + 360 * scaleFactor);

  // Subtle scale pulse on dramatic beats
  const pulse =
    beat.visualMode === "eastern_sky_split" ? 1 + Math.sin(beatProgress * Math.PI) * 0.035 : 1;

  ctx.save();
  ctx.translate(w / 2, currentY + totalTextHeight / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-w / 2, -(currentY + totalTextHeight / 2));

  beat.headlineLines.forEach((line, idx) => {
    const words = line.split(" ");
    ctx.font = fontSpec;
    const spaceWidth = ctx.measureText(" ").width;
    const wordWidths = words.map((word) => ctx.measureText(word).width);
    const totalLineW = wordWidths.reduce((a, b) => a + b, 0) + spaceWidth * Math.max(0, words.length - 1);

    let cursorX = (w - totalLineW) / 2;
    const lineY = currentY + idx * lineHeight + lineHeight / 2;

    words.forEach((word, wIdx) => {
      const upper = word.toUpperCase();
      const isGold = highlightSet.has(upper) || highlightSet.has(upper.replace(/[^A-Z0-9'?!.]/g, ""));
      ctx.shadowColor = isGold ? "rgba(242, 183, 5, 0.45)" : "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = (isGold ? 28 : 18) * scaleFactor;
      ctx.fillStyle = isGold ? "#F5C451" : "#F7F4ED";
      ctx.fillText(word, cursorX, lineY);
      cursorX += wordWidths[wIdx] + spaceWidth;
    });
  });
  ctx.restore();

  let belowY = currentY + totalTextHeight + 34 * scaleFactor;

  if (beat.subline) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 12 * scaleFactor;
    ctx.font = `500 ${Math.round(36 * scaleFactor)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = "rgba(244, 242, 237, 0.9)";
    ctx.textAlign = "center";
    ctx.fillText(beat.subline, w / 2, belowY);
    belowY += 54 * scaleFactor;
  }

  if (beat.scriptureRef) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 10 * scaleFactor;
    ctx.font = `italic 600 ${Math.round(38 * scaleFactor)}px "Cormorant Garamond", serif`;
    ctx.fillStyle = "#E5A93C";
    ctx.textAlign = "center";
    ctx.fillText(`— ${beat.scriptureRef}`, w / 2, belowY);
  }

  ctx.restore();
}

export function renderReelFrame(ctx: CanvasRenderingContext2D, opts: RenderFrameOptions): void {
  const { width: w, height: h, timeSec, beats, images, showSafeZones } = opts;
  const clampedTime = clamp(timeSec, 0, TOTAL_REEL_DURATION);

  const beatIndex = beats.findIndex((b) => clampedTime >= b.startSec && clampedTime < b.endSec);
  const activeBeat = beatIndex >= 0 ? beats[beatIndex] : beats[beats.length - 1];
  const duration = Math.max(0.1, activeBeat.endSec - activeBeat.startSec);
  const elapsed = clampedTime - activeBeat.startSec;
  const progress = clamp(elapsed / duration, 0, 1);

  ctx.save();
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, w, h);

  // Camera shake during Eastern Sky Split crescendo (last 6s of Beat 6)
  let shakeX = 0;
  let shakeY = 0;
  if (activeBeat.visualMode === "eastern_sky_split" && progress > 0.2) {
    const intensity = Math.pow((progress - 0.2) / 0.8, 1.5) * 6.5 * (w / 1080);
    shakeX = Math.sin(timeSec * 47) * intensity;
    shakeY = Math.cos(timeSec * 53) * intensity * 0.7;
  }
  ctx.translate(shakeX, shakeY);

  // Render scene background
  if (activeBeat.visualMode === "salvation_black") {
    const glow = ctx.createRadialGradient(w / 2, h * 0.44, 0, w / 2, h * 0.44, w * 0.72);
    glow.addColorStop(0, "rgba(229, 169, 60, 0.14)");
    glow.addColorStop(0.55, "rgba(120, 75, 18, 0.06)");
    glow.addColorStop(1, "rgba(5, 6, 8, 1)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    drawGoldenEmbers(ctx, w, h, timeSec);
  } else if (activeBeat.imageUrl && images[activeBeat.imageUrl]) {
    const img = images[activeBeat.imageUrl];
    let scale = 1.04;
    let ox = 0;
    let oy = 0;

    switch (activeBeat.visualMode) {
      case "vapor_hourglass":
        scale = 1.0 + progress * 0.09;
        oy = -progress * 0.02;
        break;
      case "eternity_crowd":
        scale = 1.04 + progress * 0.09;
        oy = 0.02 - progress * 0.04;
        break;
      case "earnest_silhouette":
        scale = 1.02 + progress * 0.08;
        break;
      case "earnest_closeup":
        scale = 1.15 + progress * 0.1;
        oy = 0.04;
        break;
      case "storm_stillness":
        scale = 1.02 + progress * 0.015;
        break;
      case "eastern_sky_split":
        scale = 1.13 - progress * 0.09;
        break;
    }

    drawCoverImage(ctx, img, w, h, scale, ox, oy, 1);

    // Subtle atmospheric overlays per beat
    if (activeBeat.visualMode === "vapor_hourglass") {
      drawVaporWisps(ctx, w, h, timeSec);
    } else if (activeBeat.visualMode === "eastern_sky_split") {
      drawCelestialRays(ctx, w, h, progress);
      // Initial celestial flash right when the sky splits
      if (elapsed < 0.6) {
        const flashAlpha = (1 - elapsed / 0.6) * 0.65;
        ctx.fillStyle = `rgba(255, 246, 224, ${flashAlpha})`;
        ctx.fillRect(-20, -20, w + 40, h + 40);
      }
    }
  }

  // Cinematic vignette & top/bottom contrast framing
  const vignetteStrength = activeBeat.visualMode === "earnest_closeup" ? 0.84 : 0.66;
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.22, w / 2, h * 0.48, h * 0.7);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, `rgba(4, 5, 7, ${vignetteStrength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Subtle top & bottom cinema edge darkening
  const edgeGrad = ctx.createLinearGradient(0, 0, 0, h);
  edgeGrad.addColorStop(0, "rgba(4,5,7,0.52)");
  edgeGrad.addColorStop(0.22, "rgba(4,5,7,0)");
  edgeGrad.addColorStop(0.75, "rgba(4,5,7,0)");
  edgeGrad.addColorStop(1, "rgba(4,5,7,0.72)");
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, w, h);

  // Kinetic Typography & Scripture
  drawHighlightedTextLines(ctx, activeBeat, w, h, progress, elapsed);

  // Subtle progress bar at very bottom edge of preview only? No — keep exported frame pure cinema!
  // Safe-zone guides (only rendered in studio preview when toggled on)
  if (showSafeZones) {
    ctx.save();
    ctx.strokeStyle = "rgba(229, 169, 60, 0.35)";
    ctx.lineWidth = Math.max(1.5, w / 540);
    ctx.setLineDash([8 * (w / 1080), 8 * (w / 1080)]);
    const topSafe = h * 0.13;
    const bottomSafe = h * 0.78;
    const sideSafe = w * 0.08;
    ctx.strokeRect(sideSafe, topSafe, w - sideSafe * 2, bottomSafe - topSafe);

    ctx.font = `500 ${Math.round(22 * (w / 1080))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = "rgba(229, 169, 60, 0.75)";
    ctx.fillText("REELS / TIKTOK / SHORTS SAFE FRAME", sideSafe + 12 * (w / 1080), topSafe - 14 * (w / 1080));
    ctx.restore();
  }

  ctx.restore();
}
