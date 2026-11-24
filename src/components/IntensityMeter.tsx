import React from "react";
import { ReelBeat, TOTAL_REEL_DURATION } from "../data/reelBlueprint";

interface IntensityMeterProps {
  beats: ReelBeat[];
  currentTime: number;
  selectedBeatId: string;
  onSelectBeat: (beat: ReelBeat) => void;
}

export const IntensityMeter: React.FC<IntensityMeterProps> = ({
  beats,
  currentTime,
  selectedBeatId,
  onSelectBeat,
}) => {
  const playheadPercent = Math.max(
    0,
    Math.min(100, (currentTime / TOTAL_REEL_DURATION) * 100)
  );

  const focusedBeat =
    beats.find((b) => b.id === selectedBeatId) ??
    beats.find((b) => currentTime >= b.startSec && currentTime < b.endSec) ??
    beats[0];

  const climaxBeat = beats.find((b) => b.isClimax);

  return (
    <section
      aria-label="Audio and visual intensity timeline"
      className="rounded-xl bg-[#07080A] border border-white/[0.08] p-4 space-y-3.5"
    >
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <h3 className="font-semibold text-[#F4F2ED]">Intensity Timeline</h3>
          <span aria-hidden="true" className="text-[#9B978E]">
            ·
          </span>
          <span className="text-[#9B978E]">
            Peak Climax at{" "}
            <span className="font-mono-tabular text-[#E5A93C] font-medium">
              0:{String(climaxBeat?.startSec ?? 35).padStart(2, "0")}–0:
              {String(climaxBeat?.endSec ?? 44).padStart(2, "0")}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[#A39E93]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-[2px] bg-[#E5A93C]"
            />
            <span>Visual Impact</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-[2px] bg-[#C8C3B8]/80"
            />
            <span>Music / SFX Volume</span>
          </span>
        </div>
      </div>

      {/* Proportional 52-Second Beat Intensity Bars */}
      <div className="relative pt-5 pb-1">
        {/* Horizontal reference lines (100% / 50% / 0%) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-5 bottom-7 flex flex-col justify-between"
        >
          <div className="border-t border-dashed border-white/[0.08]" />
          <div className="border-t border-dashed border-white/[0.06]" />
          <div className="border-t border-white/[0.12]" />
        </div>

        {/* Live Playhead */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 bottom-6 w-[2px] bg-[#F4F2ED]/85 z-10 transition-[left] duration-75"
          style={{ left: `calc(${playheadPercent}% - 1px)` }}
        />

        <div className="relative flex items-stretch gap-1 w-full">
          {beats.map((beat) => {
            const duration = Math.max(1, beat.endSec - beat.startSec);
            const widthPercent = (duration / TOTAL_REEL_DURATION) * 100;
            const isSelected = beat.id === selectedBeatId;
            const isPlayingHere =
              currentTime >= beat.startSec && currentTime < beat.endSec;
            const isClimax = Boolean(beat.isClimax);

            return (
              <button
                key={beat.id}
                type="button"
                onClick={() => onSelectBeat(beat)}
                style={{ width: `${widthPercent}%` }}
                title={`Scene 0${beat.index}: ${beat.title} (${beat.intensityLabel}) — Visual ${beat.visualImpact}%, Music ${beat.musicLevel}%`}
                aria-label={`Jump to Scene 0${beat.index} ${beat.title}, ${beat.intensityLabel}, Visual impact ${beat.visualImpact} percent, Music volume ${beat.musicLevel} percent`}
                className={`group relative flex flex-col justify-end rounded-lg px-1 pt-1 pb-1.5 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#E5A93C] ${
                  isClimax
                    ? isSelected || isPlayingHere
                      ? "bg-[#E5A93C]/[0.16] border-[#E5A93C]/70"
                      : "bg-[#E5A93C]/[0.09] border-[#E5A93C]/40 hover:bg-[#E5A93C]/[0.14]"
                    : isSelected || isPlayingHere
                    ? "bg-white/[0.06] border-white/25"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]"
                }`}
              >
                {/* Climax indicator above peak segment */}
                {isClimax && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono-tabular text-[10px] font-semibold tracking-wider text-[#E5A93C] whitespace-nowrap">
                    CLIMAX
                  </span>
                )}

                {/* Dual Intensity Meter Bars */}
                <div className="h-24 w-full flex items-end justify-center gap-1 px-0.5">
                  <div
                    className={`w-full max-w-[14px] rounded-t-[3px] transition-all duration-150 ${
                      isClimax
                        ? "bg-gradient-to-t from-[#E5A93C] to-[#F9DC8A] shadow-[0_0_16px_rgba(229,169,60,0.45)]"
                        : "bg-[#E5A93C]/75 group-hover:bg-[#E5A93C]"
                    }`}
                    style={{ height: `${Math.max(6, beat.visualImpact)}%` }}
                  />
                  <div
                    className={`w-full max-w-[14px] rounded-t-[3px] transition-all duration-150 ${
                      isClimax
                        ? "bg-gradient-to-t from-[#D5D1C8] to-[#FFFFFF]"
                        : "bg-[#C8C3B8]/65 group-hover:bg-[#E6E2DA]"
                    }`}
                    style={{ height: `${Math.max(6, beat.musicLevel)}%` }}
                  />
                </div>

                {/* Scene index + start time axis */}
                <div className="mt-1.5 flex flex-col items-center leading-tight">
                  <span
                    className={`font-mono-tabular text-[11px] font-semibold ${
                      isClimax || isPlayingHere
                        ? "text-[#E5A93C]"
                        : isSelected
                        ? "text-[#F4F2ED]"
                        : "text-[#9B978E]"
                    }`}
                  >
                    0{beat.index}
                  </span>
                  <span className="hidden sm:block font-mono-tabular text-[10px] text-[#7A766E]">
                    0:{String(beat.startSec).padStart(2, "0")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focused Segment Readout */}
      <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-mono-tabular text-[#9B978E]">
            Scene 0{focusedBeat.index}
          </span>
          <span aria-hidden="true" className="text-[#9B978E]">
            ·
          </span>
          <span className="font-medium text-[#F4F2ED]">{focusedBeat.title}</span>
          <span aria-hidden="true" className="text-[#9B978E]">
            ·
          </span>
          <span
            className={
              focusedBeat.isClimax ? "text-[#E5A93C] font-semibold" : "text-[#A39E93]"
            }
          >
            {focusedBeat.intensityLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono-tabular text-[11px] shrink-0">
          <span className="text-[#E5A93C]">Visual {focusedBeat.visualImpact}%</span>
          <span aria-hidden="true" className="text-[#6F6B64]">
            ·
          </span>
          <span className="text-[#D5D1C8]">Music {focusedBeat.musicLevel}%</span>
        </div>
      </div>
    </section>
  );
};
