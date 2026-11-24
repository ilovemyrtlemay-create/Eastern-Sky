import React, { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Frame } from "lucide-react";
import { ReelBeat, TOTAL_REEL_DURATION } from "../data/reelBlueprint";
import { renderReelFrame } from "../lib/reelRenderer";

interface ReelStageProps {
  beats: ReelBeat[];
  images: Record<string, HTMLImageElement>;
  currentTime: number;
  isPlaying: boolean;
  isExporting: boolean;
  showSafeZones: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (sec: number) => void;
  onToggleSafeZones: () => void;
}

function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_REEL_DURATION, sec));
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped % 1) * 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

export const ReelStage: React.FC<ReelStageProps> = ({
  beats,
  images,
  currentTime,
  isPlaying,
  isExporting,
  showSafeZones,
  onTogglePlay,
  onRestart,
  onSeek,
  onToggleSafeZones,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderReelFrame(ctx, {
      width: canvas.width,
      height: canvas.height,
      timeSec: currentTime,
      beats,
      images,
      showSafeZones,
    });
  }, [beats, images, currentTime, showSafeZones]);

  const activeBeat =
    beats.find((b) => currentTime >= b.startSec && currentTime < b.endSec) ?? beats[beats.length - 1];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Vertical 9:16 Cinema Frame */}
      <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#050608] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          onClick={isExporting ? undefined : onTogglePlay}
          className="w-full h-full block cursor-pointer"
          aria-label="9:16 Vertical Reel Preview Canvas"
        />

        {/* Subtle center play affordance only when paused at 0s or paused */}
        {!isPlaying && !isExporting && (
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label="Play Reel"
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/55 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[#F4F2ED] hover:bg-[#E5A93C] hover:text-[#07080A] hover:border-[#E5A93C] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
          >
            <Play className="w-6 h-6 ml-0.5" />
          </button>
        )}
      </div>

      {/* Transport & Scrubbable Timeline */}
      <div className="w-full max-w-[360px] mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={onTogglePlay}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] text-[#07080A] text-xs font-semibold tracking-wide hover:bg-[#f0b94f] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Reel"}</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={onRestart}
              title="Restart from 0:00"
              aria-label="Restart Reel"
              className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-[#C8C3B8] hover:text-[#F4F2ED] hover:bg-white/[0.09] disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleSafeZones}
              title="Toggle Reels/TikTok/Shorts safe zone guide"
              aria-label="Toggle Safe Zones"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C] ${
                showSafeZones
                  ? "bg-[#E5A93C]/15 border-[#E5A93C]/50 text-[#E5A93C]"
                  : "bg-white/[0.04] border-white/10 text-[#9B978E] hover:text-[#F4F2ED]"
              }`}
            >
              <Frame className="w-3.5 h-3.5" />
              <span>Safe Frame</span>
            </button>
          </div>

          <span className="font-mono-tabular text-xs text-[#A39E93] whitespace-nowrap">
            {formatTimecode(currentTime)} / {formatTimecode(TOTAL_REEL_DURATION)}
          </span>
        </div>

        {/* Scrubber */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={TOTAL_REEL_DURATION}
            step={0.05}
            disabled={isExporting}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Reel timeline scrubber"
            className="w-full studio-range"
          />

          {/* Beat Chapter Strip */}
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Beat markers">
            {beats.map((beat) => {
              const isActive = beat.id === activeBeat.id;
              return (
                <button
                  key={beat.id}
                  type="button"
                  disabled={isExporting}
                  onClick={() => onSeek(beat.startSec)}
                  title={`${beat.index}. ${beat.title} (${beat.startSec}s–${beat.endSec}s)`}
                  className={`h-2 rounded-sm transition-colors ${
                    isActive ? "bg-[#E5A93C]" : "bg-white/12 hover:bg-white/25"
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#9B978E]">
            <span className="truncate">
              Scene {activeBeat.index} · {activeBeat.title}
            </span>
            <span className="font-mono-tabular shrink-0 ml-2">
              {activeBeat.startSec}s–{activeBeat.endSec}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
